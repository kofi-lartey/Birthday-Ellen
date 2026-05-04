import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigate() {
  console.log('=== 1. CHECK packages TABLE RLS POLICY ===\n')
  
  // RLS policies not directly accessible without admin function
  console.log('(Skipping RLS check - requires admin access)')
  
  console.log('\n=== 2. VERIFY packages TABLE STRUCTURE ===\n')
  // Check column names
  const { data: colSample } = await supabase.from('packages').select('*').limit(1)
  if (colSample && colSample.length > 0) {
    console.log('Packages columns:', Object.keys(colSample[0]))
    console.log('Sample row:', JSON.stringify(colSample[0], null, 2))
  }
  
  console.log('\n=== 3. CHECK ALL TIER VALUES IN packages ===\n')
  const { data: tierRows } = await supabase.from('packages').select('id, tier, is_active')
  for (const row of tierRows || []) {
    console.log(`  id=${row.id}, tier='${row.tier}', is_active=${row.is_active}`)
  }
  
  console.log('\n=== 4. CHECK upgrade_requests to_package_tier EXACT VALUE ===\n')
  const { data: reqRows } = await supabase.from('upgrade_requests').select('id, to_package_tier, to_package_id')
  for (const row of reqRows || []) {
    console.log(`  Request #${row.id}: to_package_tier='${row.to_package_tier}', to_package_id=${row.to_package_id}`)
  }
  
  console.log('\n=== 5. TEST: What does packages query return for tier=basic? ===\n')
  const { data: byTier } = await supabase
    .from('packages')
    .select('id, name, tier, is_active')
    .eq('tier', 'basic')
    .eq('is_active', true)
  console.log('Query result:', JSON.stringify(byTier, null, 2))
  
  console.log('\n=== 6. TEST: What if we use ILIKE (case-insensitive)? ===\n')
  const { data: byIlike } = await supabase
    .from('packages')
    .select('id, name, tier')
    .ilike('tier', 'basic')
    .limit(1)
  console.log('ILIKE result:', JSON.stringify(byIlike, null, 2))
  
  console.log('\n=== 7. TEST: What does packages query return for tier=NULL? ===\n')
  // E.g., if the value was actually empty or NULL
  const { data: ifNullTier } = await supabase
    .from('packages')
    .select('id, name, tier')
    .is('tier', null)
    .limit(1)
  console.log('WHERE tier IS NULL:', JSON.stringify(ifNullTier, null, 2))
  
  console.log('\n=== 8. CHECK INDEXES ON packages TABLE ===\n')
  console.log('(No direct access - but packages table is small)')
  
  console.log('\n=== 9. THE CRITICAL QUESTION: Is the column named "tier"? ===\n')
  // What if the SQL file uses "tier" but the actual DB uses "package_tier"?
  // Check by trying to query both column names
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'packages' AND column_name IN ('tier', 'package_tier', 'tier_name');`
      })
    })
    const result = await resp.json()
    console.log('Possible tier column names:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Column check failed:', e.message)
  }
  
  console.log('\n=== 10. DIRECT TEST: Does SELECT * FROM packages WHERE tier = \'basic\' return rows via raw SQL? ===\n')
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `SELECT id, name, tier, is_active FROM packages WHERE tier = 'basic';`
      })
    })
    const result = await resp.json()
    console.log('Raw SQL result:', JSON.stringify(result, null, 2))
    if (Array.isArray(result) && result.length === 0) {
      console.log('⚠️  EMPTY RESULT: This explains why the stored procedure fails!')
    }
  } catch (e) {
    console.log('Raw SQL test failed:', e.message)
  }
}

investigate().catch(console.error)
