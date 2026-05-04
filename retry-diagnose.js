import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function retryDiagnosis() {
  console.log('=== RETRYING DIAGNOSIS ===\n')
  
  // Simple test query
  const { data, error } = await supabase.from('packages').select('count').limit(1)
  console.log('Simple count query result:', error ? 'Error: '+error.message : JSON.stringify(data))
  
  if (error) {
    console.log('\n⚠️  API key issue or connection problem. Let me test the RPC directly...')
    const { data: rpcData, error: rpcErr } = await supabase.rpc('approve_package_payment', {
      p_request_id: 32,
      p_approved_by: 'admin',
      p_notes: 'Test'
    })
    console.log('RPC result:', JSON.stringify(rpcData, null, 2), rpcErr)
    return
  }
  
  // If count works, continue with full diagnosis
  console.log('\nContinuing with full diagnosis...')
  
  const { data: allPkgs } = await supabase.from('packages').select('*')
  console.log('\nAll packages (count:', allPkgs?.length, '):')
  for (const p of allPkgs || []) {
    console.log(`  id=${p.id}, tier='${p.tier}', active=${p.is_active}`)
  }
  
  const { data: allReqs } = await supabase.from('upgrade_requests').select('*')
  console.log('\nAll upgrade requests (count:', allReqs?.length, '):')
  for (const r of allReqs || []) {
    console.log(`  #${r.id}: user=${r.user_email}, from=${r.from_package_tier}, to_tier=${r.to_package_tier}, to_id=${r.to_package_id}, status=${r.status}`)
    
    // For each request, check if referenced package exists
    let found = false
    for (const p of allPkgs || []) {
      if ((r.to_package_id && p.id === r.to_package_id) || 
          (r.to_package_tier && p.tier === r.to_package_tier)) {
        if (p.is_active) {
          found = true
          console.log(`    → Package FOUND: ${p.name} (id:${p.id}, tier:${p.tier})`)
        } else {
          console.log(`    → Package found but INACTIVE: ${p.name}`)
        }
      }
    }
    if (!found && r.to_package_tier) {
      console.log(`    → ❌ NO ACTIVE PACKAGE MATCH for tier='${r.to_package_tier}'`)
    }
  }
}

retryDiagnosis().catch(e => console.error('Fatal:', e.message, e.stack))
