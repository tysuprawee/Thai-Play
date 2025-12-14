'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(orderId: string, rating: number, comment: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Find order to verify ownership
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

    if (!order) throw new Error('Order not found')
    if (order.buyer_id !== user.id) throw new Error('Only buyer can review')

    // Insert Review
    const { error } = await supabase
        .from('reviews')
        .insert({
            order_id: orderId,
            reviewer_id: user.id,
            seller_id: order.seller_id,
            rating,
            comment_th: comment
        })

    if (error) {
        console.error('Review submission error:', error)
        throw new Error('Failed to submit review')
    }

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/orders') // Update lists
}
