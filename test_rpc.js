const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://acucswisytopnfgxonvq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdWNzd2lzeXRvcG5mZ3hvbnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDkzMzYsImV4cCI6MjA4OTgyNTMzNn0.OYHsDhS31krmb3HLB6aULQ29scibyumWGoWPCDhpfvk');

async function test() {
    supabase.rpc('get_email_by_username', { p_username: 'admin' }).then(console.log);
}
test();
