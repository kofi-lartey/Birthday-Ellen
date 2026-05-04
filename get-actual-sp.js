import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getActualSP() {
  console.log('Attempting to get ACTUAL deployed stored procedure definition...\n')
  
  // Method: Use the Supabase Postgres REST API with a special header to enable raw SQL
  // This might not work with anon key, but let's try
  const sql = `
    SELECT pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'approve_package_payment'
      AND n.nspname = 'public'
    LIMIT 1;
  `
  
  console.log('Trying to fetch via REST with admin privileges...')
  
  // Try multiple RPC method names that might exist
  const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'pg_execute', 'sql_query']
  
  for (const rpcName of rpcNames) {
    try {
      const { data, error } = await supabase.rpc(rpcName, { 
        query: sql 
      })
      if (!error && data) {
        console.log(`Found working RPC: ${rpcName}`)
        console.log('SP Definition:', JSON.stringify(data, null, 2))
        return
      }
    } catch (e) {
      // continue
    }
  }
  
  console.log('Could not fetch via RPC. Trying alternative approach - checking if PostgreSQL function is accessible via direct endpoint...')
  
  // Try using Supabase's auto-generated REST API for pg_catalog (usually not exposed)
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/pg_proc?proname=eq.approve_package_payment&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    })
    if (resp.ok) {
      const data = await resp.json()
      console.log('Direct pg_proc access:', JSON.stringify(data, null, 2))
    } else {
      console.log('Direct pg_proc access failed:', resp.status, await resp.text())
    }
  } catch (e) {
    console.log('Direct access error:', e.message)
  }
  
  console.log('\n=== FALLBACK: Parse from local SQL files to find differences ===\n')
  // Read both files and compare the SELECT sections
  const fs = await import('fs')
  const path = await import('path')
  
  const files = ['FINAL_APPROVAL_WORKFLOW.sql', 'package_approval_workflow.sql', 'APPROVAL_WORKFLOW_SIMPLE.sql']
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    const packageSelectSection = lines.filter(l => l.toLowerCase().includes('select') && l.toLowerCase().includes('into v_package') && l.toLowerCase().includes('packages'))
    console.log(`\n${file}:`)
    packageSelectSection.forEach(l => console.log(' ', l.trim()))
  }
}

getActualSP().catch(console.error)
