import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingDetails } from '@/components/listing/ListingDetails'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: listing } = await supabase
        .from('listings')
        .select('*, profiles(display_name, avatar_url, created_at), listing_media(*), categories(name_th)')
        .eq('id', id)
        .single()

    if (!listing) {
        notFound()
    }

    // Fetch Reviews
    const { data: relevantOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('listing_id', id)
        .eq('status', 'completed')

    let reviews: any[] = []
    if (relevantOrders && relevantOrders.length > 0) {
        const orderIds = relevantOrders.map(o => o.id)
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, profiles(display_name, avatar_url), orders(created_at)')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })

        if (reviewsData) reviews = reviewsData
    }

    const specifications = listing.specifications as Record<string, string> || {}
    const tags = listing.tags as string[] || []

    // Stats Logic
    const { count: salesCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', listing.seller_id)
        .eq('status', 'completed')

    const isOfficialStore = listing.profiles?.display_name === 'Exeria2142'
    const displaySales = isOfficialStore ? '500+' : (salesCount || 0)
    const displayRating = isOfficialStore ? '4.9' : '5.0'
    const displayReviewCount = isOfficialStore ? '(120 รีวิว)' : '(ใหม่)'
    const displayResponse = isOfficialStore ? '98%' : '100%'

    return (
        <ListingDetails
            listing={listing}
            specifications={specifications}
            tags={tags}
            reviews={reviews}
            stats={{
                salesCount: salesCount || 0,
                isOfficialStore,
                displaySales,
                displayRating,
                displayReviewCount,
                displayResponse
            }}
        />
    )
}
