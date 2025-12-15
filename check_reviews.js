
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const listingId = '1764686e-54a7-4873-ae76-8d13868bf68c'

    // Fetch detailed review info
    const { data: listingReviews, error } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
        .eq('listing_id', listingId)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Reviews found:`, listingReviews?.length)
    if (listingReviews?.length > 0) {
        console.log('First Review:', JSON.stringify(listingReviews[0], null, 2))
    }
}

check()
