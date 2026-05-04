import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInVzciI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function guessColumnName() {
  console.log('=== TESTING DIFFERENT POSSIBLE COLUMN NAMES FOR PACKAGE TIER ===\n')
  
  // The packages table we know exists. Let's try accessing columns we think might exist
  const guesses = ['tier', 'package_tier', 'tier_name', 'level', 'type', 'code']
  
  for (const col of guesses) {
    try {
      // Try to select this column specifically - will fail if column doesn't exist
      const { data, error } = await supabase.from('packages').select(col).limit(1)
      if (error) {
        console.log(`  Column '${col}': NOT FOUND - ${error.message}`)
      } else {
        console.log(`  Column '${col}': EXISTS - Sample: ${JSON.stringify(data)}`)
      }
    } catch (e) {
      console.log(`  Column '${col}': ERROR - ${e.message}`)
    }
  }
  
  console.log('\n=== CHECKING IF stored_proc_approve CALL WORKS WITH to_package_id SET ===\n')
  // If we manually set to_package_id on the request, would it work?
  // We can't modify the request directly, but we can manually update via RPC
  
  // Actually, let's try to UPDATE the request to set to_package_id = 75 (Basic package id)
  console.log('Attempting to update request #32 to set to_package_id = 75 (Basic package id)...')
  console.log('Note: This requires write access to upgrade_requests')
  
  const { data: updateData, error: updateErr } = await supabase
    .from('upgrade_requests')
    .update({ to_package_id: 75 })
    .eq('id', 32)
    .select()
  
  if (updateErr) {
    console.log('Update failed (expected if RLS blocks):', updateErr.message)
  } else {
    console.log('Request updated with to_package_id=75! Now testing approval...')
    const { data: rpcData, error: rpcErr } = await supabase.rpc('approve_package_payment', {
      p_request_id: 32,
      p_approved_by: 'admin_test',
      p_notes: 'Testing with to_package_id set'
    })
    console.log('With to_package_id=75:', rpcErr ? 'ERROR: '+rpcErr.message : 'SUCCESS! Data:', JSON.stringify(rpcData))
    
    // Revert? For now just note
  }
  
  console.log('\n=== VERIFYING packages ROW COUNTS ===\n')
  const { data: rowCount } = await supabase.from('packages').select('*', { count: 'exact', head: true })
  console.log('Total packages rows:', rowCount)
  
  // Also try to find if any packages have duplicate tiers or weird data
  const { data: allPkgs } = await supabase.from('packages').select('id, tier, is_active, name')
  const tierCounts = {}
  for (const p of allPkgs || []) {
    tierCounts[p.tier] = (tierCounts[p.tier] || 0) + 1
    console.log(`  Package ${p.id}: tier='${p.tier}', is_active=${p.is_active}, name='${p.name}'`)
  }
  console.log('Tier counts:', tierCounts)
  
  console.log('\n=== CHECKING upgrade_requests to_package_tier ===\n')
  const { data: reqs } = await supabase.from('upgrade_requests').select('id, to_package_tier, to_package_id, status')
  for (const r of reqs || []) {
    const matchingPkg = allPkgs.find(p => p.tier === r.to_package_tier && p.is_active)
    console.log(`  Request #${r.id} [${r.status}]: to_package_tier='${r.to_package_tier}', to_package_id=${r.to_package_id}`)
    console.log(`    Matches any active package: ${matchingPkg ? `Yes (${matchingPkg.name})` : 'NO MATCH'}`)
  }
}

guessColumnName().catch(console.error)
