import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function lastResort() {
  console.log('=== CHECKING PACKAGE COLUMN NAMES DIRECTLY ===\n')
  
  // Try to access the pg_catalog schema's information directly through REST
  // Each table in pg_catalog might be accessible if not protected
  const catalogTables = ['pg_class', 'pg_attribute', 'pg_namespace']
  
  for (const tbl of catalogTables) {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/${tbl}?limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      })
      console.log(`Access to ${tbl}: ${resp.status} ${resp.statusText}`)
      if (resp.ok) {
        const data = await resp.json()
        console.log('  Sample:', JSON.stringify(data).substring(0, 100))
      } else {
        const err = await resp.text()
        console.log('  Error:', err.substring(0, 100))
      }
    } catch(e) {
      console.log(`${tbl}: exception ${e.message}`)
    }
  }
  
  console.log('\n=== CHECKING packages TABLE THROUGH pg_stats ===\n')
  // Maybe pg_stats is accessible
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/pg_stats?tablename=eq.packages&limit=5`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    console.log('pg_stats response:', resp.status, await resp.text())
  } catch(e) {
    console.log('pg_stats failed:', e.message)
  }
  
  console.log('\n=== LOOKING FOR MIGRATION HISTORY ===\n')
  // There might be a schema_migrations or migrations table that logs what SQL was executed
  const possibly = ['schema_migrations', 'migrations', 'dbml_schema', 'supabase_migrations']
  for (const t of possibly) {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/${t}?limit=3`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      })
      console.log(`Table ${t}: ${resp.status}`)
      if (resp.ok) {
        const data = await resp.json()
        console.log('  Data:', JSON.stringify(data).substring(0, 200))
      }
    } catch(e) {}
  }
  
  console.log('\n=== ATTEMPTING DIRECT CALL WITH DIFFERENT PARAMETERS ===\n')
  // The original call failed. Let's try variations:
  
  // Try calling with request ID that we know exists but is in a different state?
  // There's only one request (#32)
  
  // META: Check if function exists via pg_proc by trying to SELECT from it
  // (Functions aren't directly queryable as tables)
}

lastResort().catch(console.error)
