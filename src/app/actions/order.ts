'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrder(listingId: string, paymentMethod: string) {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 2. Get Listing & Verify Stock
    const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

    if (listingError || !listing) throw new Error('Listing not found')
    if (listing.stock <= 0) throw new Error('Out of stock')
    if (listing.seller_id === user.id) throw new Error('Cannot buy your own listing')

    // 3. Create Order
    // Status starts as 'pending_payment' or 'paid' depending on mock
    // Since payment is mock, we go straight to 'paid' -> 'processing' (waiting for seller to deliver)
    // Actually, in Escrow:
    // 1. Buyer Pays -> status: 'paid' (Money held)
    // 2. Seller Delivers -> status: 'delivered'
    // 3. Buyer Confirms -> status: 'completed' (Money released)

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            buyer_id: user.id,
            seller_id: listing.seller_id,
            listing_id: listing.id,
            amount: listing.price_min,
            net_amount: listing.price_min, // Fee logic to be added later
            status: 'pending_payment', // Start as pending payment
            // payment_method: paymentMethod // Column missing in schema, ignoring for now
        })
        .select()
        .single()

    if (orderError) {
        console.error('Order creation failed:', orderError)
        throw new Error('Failed to create order')
    }

    // 4. Decrement Stock
    const { error: updateError } = await supabase
        .from('listings')
        .update({ stock: listing.stock - 1 })
        .eq('id', listingId)

    if (updateError) {
        // Rollback would be ideal here in a real transaction, but for now log error
        console.error('Stock update failed:', updateError)
    }

    // 5. Create Notification for Seller (Optional/Future)

    revalidatePath(`/listing/${listingId}`)
    revalidatePath('/orders')

    return order.id
}
