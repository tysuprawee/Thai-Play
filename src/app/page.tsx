import { createClient } from '@/lib/supabase/server'
import { HomePage } from '@/components/home/HomePage'

export default async function Page() {
  const supabase = await createClient()

  // Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')

  // Fetch Latest Listings
  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(display_name, seller_level), listing_media(media_url)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  return <HomePage categories={categories || []} listings={listings || []} />
}
