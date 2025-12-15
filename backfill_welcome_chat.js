
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use service role if possible, but anon works if RLS allows or we use admin client

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const SUPPORT_ID = '00000000-0000-0000-0000-000000000000';

async function backfill() {
    console.log('--- Backfilling Welcome Chats ---')

    // 1. Get all profiles except Support
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .neq('id', SUPPORT_ID)

    if (pError) {
        console.error('Error fetching profiles:', pError)
        return
    }

    console.log(`Found ${profiles.length} users.`)

    for (const user of profiles) {
        // 2. Check if chat exists
        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
            .or(`participant1_id.eq.${SUPPORT_ID},participant2_id.eq.${SUPPORT_ID}`)
        // This OR logic is tricky. Simplest: find convo where p1=user AND p2=support OR p1=support AND p2=user
        // Actually simpler:

        // Better query:
        const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${SUPPORT_ID}),and(participant1_id.eq.${SUPPORT_ID},participant2_id.eq.${user.id})`)

        if (convs && convs.length > 0) {
            console.log(`Chat exists for ${user.display_name}, skipping.`)
            continue
        }

        // 3. Create Chat
        console.log(`Creating chat for ${user.display_name}...`)
        const { data: newConv, error: cError } = await supabase
            .from('conversations')
            .insert({
                participant1_id: user.id,
                participant2_id: SUPPORT_ID,
                type: 'direct' // 'support' might be invalid if not in enum
            })
            .select()
            .single()

        if (cError) {
            console.error(`Failed to create chat for ${user.display_name}:`, cError.message)
            continue
        }

        // 4. Send Message
        const { error: mError } = await supabase
            .from('messages')
            .insert({
                conversation_id: newConv.id,
                sender_id: SUPPORT_ID,
                content: 'ยินดีต้อนรับสู่ ThaiPlay! (Welcome to ThaiPlay!)',
                message_type: 'text'
            })

        if (mError) console.error(`Failed to send message:`, mError)
        else console.log(`✓ Sent welcome message to ${user.display_name}`)
    }
}

backfill()
