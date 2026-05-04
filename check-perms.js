import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPermissions() {
  console.log('=== CHECKING GRANTS ON packages TABLE ===\n')
  
  try {
    // Try to get table ACLs
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT relname, nspname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'packages' AND c.relkind = 'r';`
      })
    })
    const result = await resp.json()
    console.log('packages table info:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Could not get table ACLs:', e.message)
  }
  
  console.log('\n=== WHO IS THE OWNER OF packages TABLE? ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT relname, relowner::regrole as owner FROM pg_class WHERE relname = 'packages';`
      })
    })
    const result = await resp.json()
    console.log('packages owner:', JSON.stringify(result, null, 2))
    
    if (result && result.length > 0 && result[0].owner === 'supabase_admin') {
      console.log('⚠️  Owner is supabase_admin - stored procedure may need proper rights')
    }
  } catch (e) {
    console.log('Owner check failed:', e.message)
  }
  
  console.log('\n=== WHO IS THE OWNER OF approve_package_payment FUNCTION? ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT proname, proowner::regrole as owner, prosecdef FROM pg_proc WHERE proname = 'approve_package_payment';`
      })
    })
    const result = await resp.json()
    console.log('Function owner/definer info:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Function owner check failed:', e.message)
  }
  
  console.log('\n=== CHECK IF RLS IS ENABLED ON packages ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT relname, relrowsecurity as rls_enabled FROM pg_class WHERE relname IN ('packages', 'upgrade_requests', 'users');`
      })
    })
    const result = await resp.json()
    console.log('RLS enabled status:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('RLS check failed:', e.message)
  }
  
  console.log('\n=== CHECK RLS POLICIES ON packages ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT tablename, policyname, permissive, cmd, qual, with_check FROM pg_policies WHERE tablename = 'packages';`
      })
    })
    const result = await resp.json()
    console.log('policies on packages:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('policies query failed:', e.message)
  }
  
  console.log('\n=== CHECK RLS POLICIES ON upgrade_requests ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT tablename, policyname, permissive, cmd, qual, with_check FROM pg_policies WHERE tablename = 'upgrade_requests';`
      })
    })
    const result = await resp.json()
    console.log('policies on upgrade_requests:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('upgrade_requests policies query failed:', e.message)
  }
}

checkPermissions().catch(console.error)
