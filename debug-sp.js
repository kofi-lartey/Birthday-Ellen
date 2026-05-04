import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('=== FETCHING STORED PROCEDURE DEFINITION VIA DIRECT POSTGRES QUERY ===\n')
  
  // Use Supabase's native Postgres query functionality
  try {
    const { data, error } = await supabase.from('_rpc').rpc('pg_catalog.pg_get_functiondef', {
      function_oid: `(SELECT oid FROM pg_proc WHERE proname = 'approve_package_payment')`
    })
    console.log('Result:', JSON.stringify(data, null, 2), error)
  } catch (e) {
    console.log('RPC approach failed:', e.message)
  }

  // Alternative: Try to get source directly from pg_proc
  try {
    const { data, error } = await supabase.rpc('exec_sql_query', {
      query: `SELECT prosrc FROM pg_proc WHERE proname = 'approve_package_payment';`
    })
    console.log('\nProsResult:', JSON.stringify(data, null, 2), error)
  } catch (e) {
    console.log('Alternative failed:', e.message)
  }
}

diagnose()
