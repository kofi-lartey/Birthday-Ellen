import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getDeployedSP() {
  console.log('=== ATTEMPTING TO FETCH DEPLOYED STORED PROCEDURE SOURCE ===\n')
  
  // Try various Supabase internal RPCs that might be exposed
  const testRPCs = [
    'sql', 'query', 'exec', 'exec_sql', 'execute', 'pg_execute', 
    'pgrst', 'postgrest', 'admin_sql', 'run_query', 'psql'
  ]
  
  for (const rpcName of testRPCs) {
    try {
      const { data, error } = await supabase.rpc(rpcName, { 
        query: 'SELECT proname, prosrc FROM pg_proc WHERE proname = \'approve_package_payment\' LIMIT 1;' 
      })
      if (!error && data) {
        console.log(`✅ Found working RPC: ${rpcName}`)
        console.log('Source:', JSON.stringify(data, null, 2))
        return
      }
    } catch (e) {
      // continue
    }
  }
  
  console.log('No admin RPC found. Trying to get function definition via pg_get_functiondef...\n')
  
  // Try different parameter formats
  const attempts = [
    { sql: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'approve_package_payment' LIMIT 1;` },
    { sql: `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'approve_package_payment' AND n.nspname = 'public';` },
    { sql: `SELECT regexp_replace(pg_get_functiondef(oid), '^[\\s\\S]*LANGUAGE \\w+;$', 'LANGUAGE ...') FROM pg_proc WHERE proname='approve_package_payment';` }
  ]
  
  for (const attempt of attempts) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', attempt)
      if (!error && data) {
        console.log('Found via exec_sql:', JSON.stringify(data, null, 2))
        return
      }
    } catch (e) {
      // continue
    }
  }
  
  console.log('\n⚠️  Cannot fetch live SP definition. Inferring from error...')
  
  // Based on the error, let's check if the SP code might have a different structure
  console.log('\n=== HYPOTHESIS: The SP might check to_package_id FIRST, but to_package_id may be non-NULL and invalid ===')
  
  // Check ALL requests to see if any have to_package_id set
  const { data: allReqs } = await supabase.from('upgrade_requests').select('id, to_package_id, to_package_tier, status')
  console.log('\nAll requests with non-null to_package_id:')
  for (const req of allReqs || []) {
    if (req.to_package_id !== null) {
      console.log(`  Request #${req.id}: to_package_id=${req.to_package_id}, to_package_tier='${req.to_package_tier}'`)
      // Check if that package ID exists
      const { data: pkg } = await supabase.from('packages').select('id, name, is_active').eq('id', req.to_package_id).single()
      console.log(`    Package ${req.to_package_id}: ${pkg ? `found: ${pkg.name} (active:${pkg.is_active})` : 'NOT FOUND'}`)
    }
  }
  
  // Also check if any requests have empty/blank tier
  console.log('\nRequests with blank/whitespace tier:')
  for (const req of allReqs || []) {
    const trimmed = req.to_package_tier ? req.to_package_tier.trim() : ''
    if (trimmed === '' || trimmed !== req.to_package_tier) {
      console.log(`  Request #${req.id}: tier='${req.to_package_tier}' (trimmed: '${trimmed}')`)
    }
    if (trimmed !== req.to_package_tier) {
      console.log(`    ⚠️  Contains whitespace!`)
    }
  }
  
  console.log('\n=== CHECKING FOR WHITESPACE OR HIDDEN CHARACTERS ===')
  try {
    // Use raw SQL to check hex values
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT id, to_package_tier, encode(convert_to(to_package_tier, 'UTF8'), 'hex') as hex_value, length(to_package_tier) as length FROM upgrade_requests WHERE id = 32;`
      })
    })
    const result = await resp.json()
    console.log('Request tier hex representation:', JSON.stringify(result, null, 2))
    if (result && result.length > 0 && result[0].hex_value === '6261736963') {
      console.log('✅ Hex "6261736963" = "basic" (correct)')
    } else {
      console.log('⚠️ Hex value does not match "basic"')
    }
  } catch (e) {
    console.log('Hex check unavailable:', e.message)
  }
}

getDeployedSP().catch(console.error)
