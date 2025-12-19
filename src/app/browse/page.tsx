import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { Search } from 'lucide-react'
import { PriceRangeFilter } from '@/app/browse/components/PriceRangeFilter'
import { ListingSorter } from '@/app/browse/components/ListingSorter'

// Helper to construct query
async function getListings(searchParams: { [key: string]: string | string[] | undefined }) {
    const supabase = await createClient()
    // Fetch listings with profiles and media (limit 1 for thumbnail)
    let query = supabase.from('listings')
        .select(`
            *, 
            profiles(display_name, seller_level),
            listing_media(media_url)
        `)
        .eq('status', 'active')

    if (searchParams.q) {
        query = query.ilike('title_th', `%${searchParams.q}%`)
    }
    if (searchParams.category) {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', searchParams.category).single()
        if (cat) {
            query = query.eq('category_id', cat.id)
        }
    }
    if (searchParams.type) {
        query = query.eq('listing_type', searchParams.type)
    }

    // Instant Delivery Filter
    if (searchParams.instant === 'true') {
        query = query.eq('specifications->>Delivery Method', 'Instant')
    }

    // Price Range Filter
    if (searchParams.min) {
        query = query.gte('price_min', searchParams.min)
    }
    if (searchParams.max) {
        query = query.lte('price_min', searchParams.max)
    }

    // Sorting
    const sort = searchParams.sort as string
    switch (sort) {
        case 'price_asc':
            query = query.order('price_min', { ascending: true })
            break
        case 'price_desc':
            query = query.order('price_min', { ascending: false })
            break
        case 'popular':
            query = query.order('views', { ascending: false })
            break
        case 'relevance':
        default:
            query = query.order('created_at', { ascending: false })
            break
    }

    const { data, error } = await query
    return data
}

export default async function BrowsePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const listings = await getListings(params)
    const supabase = await createClient()
    const { data: categories } = await supabase.from('categories').select('*')

    // Construct URLs helper
    const getFilterUrl = (key: string, value: string | null) => {
        const newParams = new URLSearchParams()
        if (params.q) newParams.set('q', params.q as string)
        if (params.category) newParams.set('category', params.category as string)
        if (params.type) newParams.set('type', params.type as string)
        if (params.instant) newParams.set('instant', params.instant as string)
        if (params.sort) newParams.set('sort', params.sort as string)
        // Keep price range too? Yes usually
        if (params.min) newParams.set('min', params.min as string)
        if (params.max) newParams.set('max', params.max as string)

        if (value === null) {
            newParams.delete(key)
        } else {
            newParams.set(key, value)
        }
        return `/browse?${newParams.toString()}`
    }

    const isInstant = params.instant === 'true'

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row gap-8">

                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3">ค้นหา</h3>
                        <form className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                name="q"
                                defaultValue={params.q as string}
                                placeholder="ค้นหา..."
                                className="pl-9"
                            />
                            {/* Preserve other params */}
                            {params.category && <input type="hidden" name="category" value={params.category as string} />}
                            {params.type && <input type="hidden" name="type" value={params.type as string} />}
                            {params.instant && <input type="hidden" name="instant" value={params.instant as string} />}
                            {params.sort && <input type="hidden" name="sort" value={params.sort as string} />}
                        </form>
                    </div>

                    <Separator />

                    {/* Price Range */}
                    <PriceRangeFilter />

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-3">การจัดส่ง (Delivery)</h3>
                        <Link
                            href={getFilterUrl('instant', isInstant ? null : 'true')}
                            className="flex items-center space-x-2 cursor-pointer group"
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isInstant ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400 group-hover:border-green-500'}`}>
                                {isInstant && <Search className="w-3 h-3" />}
                                {isInstant && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className={`${isInstant ? 'text-green-600 font-bold' : 'text-gray-600 group-hover:text-green-600'}`}>Instant Delivery (ส่งทันที)</span>
                        </Link>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-3">หมวดหมู่</h3>
                        <div className="space-y-2">
                            <Link href={getFilterUrl('category', null)} className={`block text-sm ${!params.category ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ทั้งหมด
                            </Link>
                            {categories?.map((cat: any) => (
                                <Link
                                    key={cat.id}
                                    href={getFilterUrl('category', cat.slug)}
                                    className={`block text-sm ${params.category === cat.slug ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {cat.name_th}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-3">ประเภท</h3>
                        <div className="space-y-2">
                            <Link href={getFilterUrl('type', null)} className={`block text-sm ${!params.type ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ทั้งหมด
                            </Link>
                            <Link href={getFilterUrl('type', 'game')} className={`block text-sm ${params.type === 'game' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                เกม (Game)
                            </Link>
                            <Link href={getFilterUrl('type', 'service')} className={`block text-sm ${params.type === 'service' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                บริการ (Service)
                            </Link>
                            <Link href={getFilterUrl('type', 'item')} className={`block text-sm ${params.type === 'item' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ไอเท็ม (Item)
                            </Link>
                            <Link href={getFilterUrl('type', 'account')} className={`block text-sm ${params.type === 'account' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ไอดี (Account)
                            </Link>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/browse">ล้างตัวกรอง</Link>
                    </Button>
                </aside>

                {/* Listings Grid */}
                <div className="flex-1">
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {params.category ?
                                    categories?.find((c: any) => c.slug === params.category)?.name_th || params.category
                                    : 'รายการทั้งหมด'}
                            </h1>
                            <span className="text-muted-foreground text-sm">พบ {listings?.length || 0} รายการ</span>
                        </div>

                        {/* Sorting Dropdown */}
                        <ListingSorter />
                    </div>

                    {/* Active Filters Tags could go here */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings && listings.length > 0 ? listings.map((item: any) => {
                            // Use first image if available
                            const thumbnail = item.listing_media && item.listing_media.length > 0
                                ? item.listing_media[0].media_url
                                : null;

                            const isItemInstant = item.specifications?.['Delivery Method'] === 'Instant'

                            return (
                                <Link key={item.id} href={`/listing/${item.id}`}>
                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col group">
                                        <div className="aspect-video bg-gray-200 relative">
                                            {thumbnail ? (
                                                <img src={thumbnail} alt={item.title_th} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                            {isItemInstant && (
                                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                                    INSTANT
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="secondary">
                                                    {item.listing_type}
                                                </Badge>
                                            </div>
                                            <h3 className="font-bold line-clamp-1 mb-1">{item.title_th}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{item.description_th}</p>
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                                <span className="text-lg font-bold text-indigo-600">{formatPrice(item.price_min)}</span>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <div className="w-5 h-5 rounded-full bg-gray-200 mr-2" />
                                                    {item.profiles?.display_name || 'Seller'}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        }) : ( // End of map
                            <div className="col-span-full py-10 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                                <Search className="h-10 w-10 mb-4 opacity-50" />
                                <p>ไม่พบรายการที่ค้นหา</p>
                                <Button variant="link" asChild>
                                    <Link href="/browse">ดูรายการทั้งหมด</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
