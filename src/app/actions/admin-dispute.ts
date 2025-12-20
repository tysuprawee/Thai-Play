'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SUPPORT_ID = '00000000-0000-0000-0000-000000000000'

export async function resolveDispute(orderId: string, resolution: 'refund' | 'release', message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Verify Admin Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized - Admin Access Required')

    // 2. Update Order Status & Save Resolution Note
    const newStatus = resolution === 'refund' ? 'cancelled' : 'completed'
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: newStatus,
            resolution_note: message,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
        })
        .eq('id', orderId)

    if (updateError) throw updateError

    // 3. Get Participants
    const { data: order } = await supabase
        .from('orders')
        .select('buyer_id, seller_id')
        .eq('id', orderId)
        .single()

    if (!order) throw new Error('Order not found')

    const participants = [order.buyer_id, order.seller_id]

    const supabaseAdmin = createAdminClient()

    // 4. Send Individual Support Messages via Admin Client (Bypass RLS)
    // 4. Send Individual Support Messages via Admin Client (Bypass RLS)
    for (const userId of participants) {
        // Create/Get Support Conversation for this user MANUALLY to avoid RPC unique constraint errors
        let convId = null

        // A. Try to find existing chat (Order ID is NULL for support chats)
        // Checks both directions because p1/p2 order isn't guaranteed in old data
        const { data: existingConvs } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${userId},participant2_id.eq.${SUPPORT_ID}),and(participant1_id.eq.${SUPPORT_ID},participant2_id.eq.${userId})`)
            .is('order_id', null)
            .limit(1)
            .single()

        if (existingConvs) {
            convId = existingConvs.id
        } else {
            // B. Create new if missing
            // Deterministic ordering to match constraint
            const p1 = userId < SUPPORT_ID ? userId : SUPPORT_ID
            const p2 = userId < SUPPORT_ID ? SUPPORT_ID : userId

            const { data: newConv, error: createError } = await supabaseAdmin
                .from('conversations')
                .insert({
                    participant1_id: p1,
                    participant2_id: p2,
                    order_id: null,
                    updated_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (createError) {
                // Handle race condition if created concurrently
                if (createError.code === '23505') { // Unique violation
                    const { data: retryConv } = await supabaseAdmin
                        .from('conversations')
                        .select('id')
                        .or(`and(participant1_id.eq.${userId},participant2_id.eq.${SUPPORT_ID}),and(participant1_id.eq.${SUPPORT_ID},participant2_id.eq.${userId})`)
                        .is('order_id', null)
                        .single()
                    if (retryConv) convId = retryConv.id
                } else {
                    console.error('Failed to create support conversation:', createError)
                }
            } else if (newConv) {
                convId = newConv.id
            }
        }

        if (convId) {
            const formattedMessage = `[System Message] Dispute Update for Order #${orderId.slice(0, 8)}.\n\nResolution: ${resolution === 'refund' ? 'Refunded to Buyer' : 'Released to Seller'}.\n\nReason: ${message}`

            // Insert Message AS SYSTEM
            const { error: msgError } = await supabaseAdmin.from('messages').insert({
                conversation_id: convId,
                sender_id: SUPPORT_ID,
                receiver_id: userId,
                content: formattedMessage,
                is_read: false
            })

            if (msgError) {
                console.error('Failed to insert support message:', msgError)
            } else {
                // Update Conversation
                await supabaseAdmin.from('conversations').update({
                    last_message_preview: `[System] Dispute Resolved`,
                    updated_at: new Date().toISOString(),
                    hidden_for: []
                }).eq('id', convId)
            }
        }
    }

    return { success: true }
}

export async function testSupportConnection() {
    const supabaseAdmin = createAdminClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'No user' }

    // 1. Check Profile
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', SUPPORT_ID).single()

    // 2. Check Conversation (Manual check to match resolveDispute logic)
    let convId = null
    const { data: existingConvs } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${SUPPORT_ID}),and(participant1_id.eq.${SUPPORT_ID},participant2_id.eq.${user.id})`)
        .is('order_id', null)
        .limit(1)
        .single()

    if (existingConvs) convId = existingConvs.id
    else {
        // Try creating
        const p1 = user.id < SUPPORT_ID ? user.id : SUPPORT_ID
        const p2 = user.id < SUPPORT_ID ? SUPPORT_ID : user.id

        const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({
                participant1_id: p1,
                participant2_id: p2,
                order_id: null,
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single()
        if (newConv) convId = newConv.id
    }

    // 3. Check Last Message
    let lastMsg = null
    if (convId) {
        const { data: msgs } = await supabaseAdmin.from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        lastMsg = msgs
    }

    return {
        success: true,
        profileExists: !!profile,
        conversationId: convId,
        lastMessage: lastMsg,
        myId: user.id,
        supportId: SUPPORT_ID
    }
}
