import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testApproval() {
  console.log('=== TESTING approve_package_payment WITH REQUEST #32 ===\n')
  
  // First, let's verify the request state before calling
  const { data: request, error: reqErr } = await supabase
    .from('upgrade_requests')
    .select('*')
    .eq('id', 32)
    .single()
  
  console.log('Request #32 state:', JSON.stringify(request, null, 2))
  
  console.log('\nCalling RPC...')
  const { data, error } = await supabase.rpc('approve_package_payment', {
    p_request_id: 32,
    p_approved_by: 'admin_test',
    p_notes: 'Testing approval'
  })
  
  console.log('\nResult:')
  console.log('  data:', JSON.stringify(data, null, 2))
  console.log('  error:', JSON.stringify(error, null, 2))
  
  // Check user state after
  if (data?.success) {
    const { data: user } = await supabase
      .from('users')
      .select('package_tier, package_name, package_id')
      .eq('id', request.user_id)
      .single()
    console.log('\nUser after approval:', JSON.stringify(user, null, 2))
  }
}

testApproval().catch(console.error)
