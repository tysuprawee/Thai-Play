import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingDetails } from '@/components/listing/ListingDetails'
import { ViewIncrementer } from '@/components/listing/ViewIncrementer'

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

    // Fetch Reviews (Directly via listing_id)
    const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
        .eq('listing_id', id)
        .order('created_at', { ascending: false })

    const reviews = reviewsData || []

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
        <>
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
            <ViewIncrementer id={listing.id} />
        </>
    )
}
