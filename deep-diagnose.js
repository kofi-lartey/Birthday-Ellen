import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deepDiagnose() {
  console.log('=== 1. PACKAGES FULL DATA ===\n')
  const { data: pkgs, error: pkgErr } = await supabase.from('packages').select('*')
  console.log('All packages:', JSON.stringify(pkgs, null, 2))
  console.log('Error:', pkgErr)
  
  console.log('\n=== 2. DIRECT BY TIER LOOKUP ===\n')
  // What SP does: SELECT * FROM packages WHERE tier = v_request.to_package_tier AND is_active = true
  const { data: byTier, error: tierErr } = await supabase
    .from('packages')
    .select('*')
    .eq('tier', 'basic')
    .eq('is_active', true)
  console.log('Result of WHERE tier = basic AND is_active = true:', JSON.stringify(byTier, null, 2))
  console.log('Error:', tierErr)
  
  console.log('\n=== 3. CHECKING IF ISSUE IS COLUMN NAME ===\n')
  // Check what columns packages table actually has
  const { data: colData, error: colErr } = await supabase.rpc('pg_catalog.pg_get_functiondef', {
    function_oid: `(SELECT oid FROM pg_proc WHERE proname = 'approve_package_payment')`
  })
  console.log('Attempt 1 - pg_get_functiondef:', JSON.stringify(colData, null, 2), colErr)
  
  console.log('\n=== 4. SIMULATE STORED PROCEDURE QUERY LOGIC ===\n')
  // Simulate exactly what the stored procedure does step by step
  // Request: to_package_id = null, to_package_tier = 'basic'
  
  // Step 1: Check if to_package_id IS NOT NULL - it is NULL, so go to ELSE
  console.log('Condition: to_package_id IS NOT NULL? -> false')
  console.log('Taking ELSE branch: WHERE tier = to_package_tier AND is_active = true')
  console.log("Query: SELECT * FROM packages WHERE tier = 'basic' AND is_active = true")
  
  // Get all packages with their tier column specifically
  const { data: allPkgs } = await supabase.from('packages').select('id, tier, is_active')
  console.log('\nAll packages:')
  for (const p of allPkgs) {
    console.log(`  id=${p.id}, tier='${p.tier}', active=${p.is_active}`)
  }
  
  const match = allPkgs.find(p => p.tier === 'basic' && p.is_active === true)
  console.log('\nPackage matching tier=basic && active=true:', match ? `Found: id=${match.id}, name from packages table` : 'NOT FOUND')
  
  console.log('\n=== 5. CHECKING STRING COMPARISON ===\n')
  // Check if tier comparison is case-sensitive
  for (const p of allPkgs) {
    console.log(`  tier='${p.tier}' === 'basic'? ${p.tier === 'basic'}`)
    console.log(`  tier lowercase: '${p.tier.toLowerCase()}' === 'basic'? ${p.tier.toLowerCase() === 'basic'}`)
  }
  
  console.log('\n=== 6. TESTING WITH ILIKE (case-insensitive) ===\n')
  const { data: ilikeResult } = await supabase.from('packages').select('*').ilike('tier', 'basic').limit(1)
  console.log('IL IKE result:', JSON.stringify(ilikeResult, null, 2))
}

deepDiagnose().catch(console.error)
