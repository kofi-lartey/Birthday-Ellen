import fetch from 'node-fetch'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

async function getFunctionDefinition() {
  // Use Supabase's Postgres REST API to run arbitrary query
  // The /rest/v1/rpc endpoint requires pre-existing RPC. 
  // Instead, use the Postgres API directly via the anon key with select on a helper view
  
  // Try using the pg_rest raw SQL API (if enabled)
  console.log('Attempting to fetch stored procedure via different methods...\n')
  
  // Method 1: Try to query pg_proc via REST (this usually requires admin privileges, but let's try)
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/pg_catalog.pg_proc?proname=eq.approve_package_payment&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    const result = await response.json()
    console.log('Method 1 result:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('Method 1 failed:', e.message)
  }
  
  // Method 2: Try to get function source via information_schema
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        sql_query: `SELECT prosrc FROM pg_proc WHERE proname = 'approve_package_payment' LIMIT 1;`
      })
    })
    const result = await response.json()
    console.log('\nMethod 2 result:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('\nMethod 2 failed:', e.message)
  }

  // Method 3: Direct RPC call to pg_get_functiondef via service role key (if we had it)
  // We'll try calling pg_get_functiondef as a regular RPC (unlikely to work)
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_get_functiondef`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        function_oid: `(SELECT oid FROM pg_proc WHERE proname = 'approve_package_payment')`
      })
    })
    const result = await response.json()
    console.log('\nMethod 3 result:', JSON.stringify(result, null, 2))
  } catch (e) {
    console.log('\nMethod 3 failed:', e.message)
  }
}

getFunctionDefinition()
