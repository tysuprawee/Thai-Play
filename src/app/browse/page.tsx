import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { Search } from 'lucide-react'

// Helper to construct query
async function getListings(searchParams: { [key: string]: string | string[] | undefined }) {
    const supabase = await createClient()
    let query = supabase.from('listings').select('*, profiles(display_name, seller_level)').eq('status', 'active')

    if (searchParams.q) {
        query = query.ilike('title_th', `%${searchParams.q}%`)
    }
    if (searchParams.category) {
        // Join with categories table to filter by slug
        // Supabase join syntax via foreign key?
        // Simpler: Fetch category ID first
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', searchParams.category).single()
        if (cat) {
            query = query.eq('category_id', cat.id)
        }
    }
    if (searchParams.type) {
        query = query.eq('listing_type', searchParams.type)
    }

    query = query.order('created_at', { ascending: false })

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

    return (
        <div className="container py-8 px-4 md:px-6">
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
                        </form>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-3">หมวดหมู่</h3>
                        <div className="space-y-2">
                            <Link href="/browse" className={`block text-sm ${!params.category ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ทั้งหมด
                            </Link>
                            {categories?.map((cat: any) => (
                                <Link
                                    key={cat.id}
                                    href={`/browse?category=${cat.slug}&type=${params.type || ''}`}
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
                            <Link href={`/browse?category=${params.category || ''}`} className={`block text-sm ${!params.type ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ทั้งหมด
                            </Link>
                            <Link href={`/browse?category=${params.category || ''}&type=game`} className={`block text-sm ${params.type === 'game' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                เกม (Game)
                            </Link>
                            <Link href={`/browse?category=${params.category || ''}&type=service`} className={`block text-sm ${params.type === 'service' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                บริการ (Service)
                            </Link>
                            <Link href={`/browse?category=${params.category || ''}&type=item`} className={`block text-sm ${params.type === 'item' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                ไอเท็ม (Item)
                            </Link>
                            <Link href={`/browse?category=${params.category || ''}&type=account`} className={`block text-sm ${params.type === 'account' ? 'font-bold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
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
                    <div className="mb-6 flex justify-between items-center">
                        <h1 className="text-2xl font-bold">
                            {params.category ?
                                categories?.find((c: any) => c.slug === params.category)?.name_th || params.category
                                : 'รายการทั้งหมด'}
                        </h1>
                        <span className="text-muted-foreground text-sm">พบ {listings?.length || 0} รายการ</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings && listings.length > 0 ? listings.map((item: any) => (
                            <Link key={item.id} href={`/listing/${item.id}`}>
                                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                                    <div className="aspect-video bg-gray-200 relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            No Image
                                        </div>
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
                        )) : (
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
