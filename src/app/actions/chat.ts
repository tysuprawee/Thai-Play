'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getOrCreateConversation(otherUserId: string, orderId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Call the database function we created
    // Updated to support order_id context
    const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: user.id,
        user2_id: otherUserId,
        order_id_param: orderId || null
    })

    if (error) {
        console.error('Error creating conversation:', error)
        throw new Error('Failed to create conversation')
    }

    return conversationId
}

export async function deleteConversation(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // "Soft delete" by appending user ID to hidden_for array
    // We use a raw SQL update via rpc or just array update if policies allow
    // Since we didn't make a specific function, we can try direct update if RLS permits
    // However, updating array in Supabase JS is tricky for "append".
    // Let's read first then update, or use a custom RPC if specific logic needed.
    // For now, let's fetch, append, and update.

    // Actually, safest is to use the `array_append` standard postgres function but Supabase-js support is specific.
    // simpler: fetch, push, update.

    const { data: conversation } = await supabase
        .from('conversations')
        .select('hidden_for')
        .eq('id', conversationId)
        .single()

    if (!conversation) return

    const currentHidden = conversation.hidden_for || []
    if (!currentHidden.includes(user.id)) {
        await supabase
            .from('conversations')
            .update({ hidden_for: [...currentHidden, user.id] })
            .eq('id', conversationId)
    }

    return true
}

export async function sendMessage(conversationId: string, content: string, type: 'text' | 'image' = 'text', mediaUrl?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Check if user is participant
    const { data: conversation } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

    if (!conversation) throw new Error('Conversation not found')

    const isParticipant = conversation.participant1_id === user.id || conversation.participant2_id === user.id
    if (!isParticipant) throw new Error('Unauthorized')

    const receiverId = conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id

    // 2. Insert Message
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            receiver_id: receiverId, // Crucial for notifications
            content,
            message_type: type,
            media_url: mediaUrl,
            is_read: false
        })
        .select()
        .single()

    if (error) throw error

    // 3. Update Conversation (last_message, updated_at, unhide if needed)
    // If the other user hid the chat, sending a message should probably unhide it for them?
    // Usually yes, new message brings it back.

    // We can reset hidden_for to empty or just remove receiver_id.
    // Let's reset it to ensure visibility for both.

    let preview = type === 'image' ? 'ส่งรูปภาพ' : content
    if (preview.length > 50) preview = preview.substring(0, 50) + '...'

    await supabase.from('conversations').update({
        last_message_preview: preview,
        updated_at: new Date().toISOString(),
        hidden_for: [] // Unhide for everyone on new message
    }).eq('id', conversationId)

    return true
}

export async function sendSupportReply(conversationId: string, content: string, type: 'text' | 'image' = 'text', mediaUrl?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Verify Admin Role (DB Check)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    // 2. Verify Conversation Existence & Participants
    const { data: conversation } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

    if (!conversation) throw new Error('Chat not found')

    const SUPPORT_ID = '00000000-0000-0000-0000-000000000000'

    // Check if Support is part of this chat
    if (conversation.participant1_id !== SUPPORT_ID && conversation.participant2_id !== SUPPORT_ID) {
        throw new Error('Not a support chat')
    }

    // Determine Receiver (The User)
    const receiverId = conversation.participant1_id === SUPPORT_ID ? conversation.participant2_id : conversation.participant1_id

    // 3. Send Message AS SUPPORT
    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: SUPPORT_ID, // Sending as Bot!
            receiver_id: receiverId,
            content,
            message_type: type,
            media_url: mediaUrl,
            is_read: false
        })

    if (error) throw error

    // 4. Update Conversation
    let preview = type === 'image' ? 'ส่งรูปภาพ' : content
    if (preview.length > 50) preview = preview.substring(0, 50) + '...'

    await supabase.from('conversations').update({
        last_message_preview: preview,
        updated_at: new Date().toISOString(),
        hidden_for: []
    }).eq('id', conversationId)

    return true
}
