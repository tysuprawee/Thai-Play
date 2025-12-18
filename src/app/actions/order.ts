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
        .select('*, profiles!seller_id(id)') // Using !seller_id to be explicit if needed, or just relying on existing select *
        .eq('id', listingId)
        .single()

    if (listingError || !listing) throw new Error('Listing not found')
    if (listing.stock <= 0) throw new Error('Out of stock')
    if (listing.seller_id === user.id) throw new Error('Cannot buy your own listing')

    // 2.1 Fetch Category Fee
    const { data: category } = await supabase
        .from('categories')
        .select('fee_percent')
        .eq('id', listing.category_id)
        .single()

    const feePercent = category?.fee_percent || 0
    const price = Number(listing.price_min)
    const feeAmount = price * (feePercent / 100)
    const netAmount = price - feeAmount

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
            amount: price,
            fee_amount: feeAmount,
            net_amount: netAmount,
            status: 'pending_payment',
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

// Legacy/Real Payment Confirmation (Now behaves like mock/auto-approve as per request)
export async function confirmPayment(orderId: string) {
    const supabase = await createClient()

    // Fetch order with listing details to check delivery method
    const { data: order } = await supabase
        .from('orders')
        .select('*, listings(specifications)')
        .eq('id', orderId)
        .single()

    if (!order) throw new Error('Order not found')

    const isInstant = order.listings?.specifications?.['Delivery Method'] === 'Instant'

    if (isInstant) {
        // Auto-complete for Instant Delivery
        // Funds released 24h after purchase (since it's instant)
        const fundsReleaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'completed',
                funds_release_at: fundsReleaseAt,
                payout_status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (error) throw new Error('Failed to update status')

        revalidatePath(`/orders/${orderId}`)
        revalidatePath('/orders')
    } else {
        // Manual delivery for Standard orders
        await updateOrderStatus(orderId, 'escrowed')
    }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Simple validation (can be expanded)
    // In real app, check state machine transitions here.

    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

    if (error) throw new Error('Failed to update status')

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/orders')
}

// 1. Mock Payment (For Demo/PromptPay Manual Confirm)
export async function mockPaymentSuccess(orderId: string) {
    // Reuse the main confirmation logic which handles Instant Delivery checks
    await confirmPayment(orderId)
}

// 2. Seller Delivers
export async function confirmDelivery(orderId: string) {
    const supabase = await createClient()

    // Set auto_confirm_at to 24 hours from now
    // In a real app, this might be configurable per category
    const autoConfirmAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'delivered',
            auto_confirm_at: autoConfirmAt,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) throw new Error('Failed to update status')

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/orders')
}

// 3. Buyer Confirms Receipt (Auto-Complete)
export async function confirmReceipt(orderId: string) {
    const supabase = await createClient()

    // Safety Hold: Funds released after 24 hours
    const fundsReleaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'completed',
            funds_release_at: fundsReleaseAt,
            payout_status: 'pending',
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) throw new Error('Failed to update status')

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/orders')
}

// 4. Dispute (Post-Completion)
export async function disputeOrder(orderId: string, reason?: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'disputed',
            dispute_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) throw new Error('Failed to update status')

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/orders')
}
