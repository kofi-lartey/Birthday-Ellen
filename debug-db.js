import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('=== FETCHING STORED PROCEDURE VIA SQL ===\n')
  
  // Use direct query to get the stored procedure definition
  const { data: spData, error: spError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'approve_package_payment';`
  })

  if (spError) {
    console.log('Direct RPC not available, trying another approach...')
    
    // Try querying via REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT proname, prosrc FROM pg_proc WHERE proname = 'approve_package_payment';`
      })
    })
    const result = await response.json()
    console.log('Function info:', JSON.stringify(result, null, 2))
  } else {
    console.log('Stored procedure definition:', JSON.stringify(spData, null, 2))
  }

  console.log('\n=== CHECKING ALL REQUESTS WITH DETAILED PACKAGE VALIDATION ===\n')
  const { data: allRequests, error: allReqError } = await supabase
    .from('upgrade_requests')
    .select('*')

  const { data: packages, error: pkgError } = await supabase
    .from('packages')
    .select('*')

  if (allReqError || pkgError) {
    console.error('Errors:', allReqError, pkgError)
    return
  }

  console.table(packages)
  console.log('')
  console.table(allRequests)

  console.log('\n=== VALIDATION PER REQUEST ===\n')
  for (const req of allRequests) {
    console.log(`Request #${req.id} - ${req.user_email} - [${req.status}]`)
    console.log(`  to_package_id: ${req.to_package_id}`)
    console.log(`  to_package_tier: ${req.to_package_tier}`)
    
    const byId = req.to_package_id ? packages.find(p => p.id === req.to_package_id) : null
    const byTier = req.to_package_tier ? packages.find(p => p.tier === req.to_package_tier) : null
    
    console.log(`  Match by id:`, byId ? `✓ ${byId.name} (active:${byId.is_active})` : '✗ NOT FOUND')
    console.log(`  Match by tier:`, byTier ? `✓ ${byTier.name} (active:${byTier.is_active})` : '✗ NOT FOUND')
    
    let canSucceed = true
    let reasons = []
    if (req.to_package_id && !byId) { canSucceed = false; reasons.push('id not found') }
    if (req.to_package_tier && !byTier) { canSucceed = false; reasons.push('tier not found') }
    if (byId && !byId.is_active) { canSucceed = false; reasons.push('id package inactive') }
    if (byTier && !byTier.is_active) { canSucceed = false; reasons.push('tier package inactive') }
    
    console.log(`  → ${canSucceed ? '✅ WOULD SUCCEED' : '❌ WOULD FAIL: ' + reasons.join(', ')}`)
    console.log('')
  }
}

diagnose()
