import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iyslevrqnzlgsfvqcekt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2xldnJxbnpsZ3NmdnFjZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5NjEsImV4cCI6MjA4NzU0Nzk2MX0.WJpAGcB19xvOFnsG0ZD7pckNe7iIma3STtzTs7ZQCFc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getSPviaPgFunctions() {
  console.log('=== TRYING pg_get_functiondef AS RPC ===\n')
  
  // Try calling pg_get_functiondef directly as RPC
  // PostgreSQL automatically exposes some pg_catalog functions
  // Try: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'approve_package_payment'
  
  const oidResp = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_catalog.pg_get_functiondef`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      function_oid: `(SELECT oid FROM pg_proc WHERE proname = 'approve_package_payment' LIMIT 1)`
    })
  })
  
  console.log('pg_get_functiondef RPC status:', oidResp.status, await oidResp.text())
  
  console.log('\n=== TRYING TO READ pg_proc VIA REST DIRECTLY ===\n')
  // Try reading pg_proc via REST (requires exposing pg_catalog, unlikely)
  const pgResp = await fetch(`${supabaseUrl}/rest/v1/pg_catalog_pg_proc?proname=eq.approve_package_payment&select=oid,proname,prosrc`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  })
  console.log('pg_proc REST status:', pgResp.status, await pgResp.text())
  
  console.log('\n=== CHECKING WHETHER ANY exec_sql FUNCTION EXISTS ===\n')
  // List all functions ending with 'sql'
  const listResp = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_catalog.pg_get_functiondef`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      function_oid: `(SELECT oid FROM pg_proc WHERE proname ILIKE '%sql%' LIMIT 5)`
    })
  })
  console.log('pg_get_functiondef for '%sql%' functions:', listResp.status)
  
  console.log('\n=== ALTERNATIVE: CALL STORED PROCEDURE WITH DEBUG OUTPUT ===\n')
  // Create a debug wrapper that outputs what it's doing
  // This would require creating a new RPC, but we can try
  console.log('Attempting to create debug RPC...')
  
  // Try to create a helper function that explains what's happening
  const createResp = await fetch(`${supabaseUrl}/rest/v1/rpc/create_debug_func`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      definition: `
        CREATE OR REPLACE FUNCTION debug_approve(request_id INT)
        RETURNS JSONB AS $$
        DECLARE
          v_req RECORD;
          v_pkg RECORD;
          result JSONB;
        BEGIN
          SELECT * INTO v_req FROM upgrade_requests WHERE id = request_id;
          result := jsonb_build_object('req_id', request_id, 'to_package_id', v_req.to_package_id, 'to_package_tier', v_req.to_package_tier);
          
          IF v_req.to_package_id IS NOT NULL THEN
            SELECT * INTO v_pkg FROM packages WHERE id = v_req.to_package_id AND is_active = true;
            result := result || jsonb_build_object('path','by_id','found', v_pkg IS NOT NULL);
          ELSE
            SELECT * INTO v_pkg FROM packages WHERE tier = v_req.to_package_tier AND is_active = true;
            result := result || jsonb_build_object('path','by_tier','found', v_pkg IS NOT NULL);
          END IF;
          
          IF v_pkg IS NULL THEN
            result := result || jsonb_build_object('error','Package not found','tier_check', (SELECT COUNT(*) FROM packages WHERE tier = v_req.to_package_tier));
          END IF;
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql;
      `
    })
  })
  console.log('Create debug function response:', createResp.status)
  
  if (createResp.ok) {
    console.log('✅ Debug function created! Now calling it...')
    const { data } = await supabase.rpc('debug_approve', { request_id: 32 })
    console.log('Debug result:', JSON.stringify(data, null, 2))
  }
}

getSPviaPgFunctions().catch(console.error)
