import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigate() {
  console.log('=== 1. CHECK packages TABLE RLS POLICY ===\n')
  
  // Query to get RLS policies on packages table
  const { data: policies, error: polErr } = await supabase.rpc('_get_rls_policies', {
    table_name: 'packages'
  }).catch(() => ({ error: 'RPC not available' }))
  console.log('Policies via _get_rls_policies:', JSON.stringify(policies, null, 2), polErr)
  
  // Try direct query for pg_policies
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check FROM pg_policies WHERE tablename = 'packages';`
      })
    })
    const result = await resp.json()
    console.log('\nRLS policies via pg_policies:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('\nDirect pg_policies query failed:', e.message)
  }
  
  console.log('\n=== 2. CHECK STORED PROCEDURE OWNER AND SECURITY DEFINER ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT proname, nspname, proowner::regrole, prosecdef, proacl FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'approve_package_payment';`
      })
    })
    const result = await resp.json()
    console.log('Function security info:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Function info query failed:', e.message)
  }
  
  console.log('\n=== 3. CHECK SEARCH PATH FOR FUNCTION ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT nspname FROM pg_namespace WHERE oid = (SELECT pronamespace FROM pg_proc WHERE proname = 'approve_package_payment');`
      })
    })
    const result = await resp.json()
    console.log('Function namespace:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Namespace query failed:', e.message)
  }
  
  console.log('\n=== 4. CHECK IF packages TABLE IS IN SAME SCHEMA AS FUNCTION EXPECTS ===\n')
  const { data: schemaPkgs, error } = await supabase.from('packages').select('count').limit(1)
  console.log('Can access packages table?', error ? 'NO: '+error.message : 'YES')
  
  console.log('\n=== 5. TEST DIRECT SQL QUERY EXACTLY LIKE STORED PROCEDURE ===\n')
  console.log('Simulating: SELECT * INTO v_package FROM packages WHERE tier = $1 AND is_active = true')
  const { data: tiers, error: tiersErr } = await supabase
    .from('packages')
    .select('tier')
  console.log('All distinct tiers in packages:')
  for (const row of tiers) {
    console.log(`  tier='${row.tier}'`)
  }
  
  console.log('\n=== 6. CHECK FOR CHARACTER ENCODING ISSUES ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT to_package_tier, octet_length(to_package_tier) as bytes FROM upgrade_requests WHERE id = 32;`
      })
    })
    const result = await resp.json()
    console.log('Request tier byte length:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Byte length query failed:', e.message)
  }
}

investigate().catch(console.error)
