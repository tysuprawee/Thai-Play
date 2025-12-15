
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('--- Checking Game Requests ---')
    const { data: requests, error: reqError } = await supabase
        .from('game_requests')
        .select('*')

    if (reqError) console.error('Error fetching requests:', reqError)
    else console.log('Total Requests:', requests?.length)

    console.log('\n--- Checking System User ---')
    const { data: sysUser, error: sysError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()

    if (sysError) console.error('Error fetching system user:', sysError)
    else console.log('System User:', sysUser ? 'Found' : 'Not Found')

    console.log('\n--- Checking Trigger (Test) ---')
    // We can't easily test trigger from here without creating a user, 
    // but we can check if the function exists? 
    // No, client can't check functions directly usually.
}

check()
