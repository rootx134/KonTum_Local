const SUPABASE_URL = 'https://acucswisytopnfgxonvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdWNzd2lzeXRvcG5mZ3hvbnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDkzMzYsImV4cCI6MjA4OTgyNTMzNn0.OYHsDhS31krmb3HLB6aULQ29scibyumWGoWPCDhpfvk';

async function req(query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    return res.text();
}

req("SELECT * FROM auth.identities LIMIT 1;").then(console.log);
