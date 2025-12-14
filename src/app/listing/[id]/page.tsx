import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

import { ShieldCheck, MessageSquare, ShoppingCart, Star, Clock } from 'lucide-react'
import { ListingGallery } from '@/components/listing/ListingGallery'

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

    // Fetch Reviews for this listing
    // 1. Get completed orders for this listing
    const { data: relevantOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('listing_id', id)
        .eq('status', 'completed')

    // 2. Get reviews for these orders
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
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Images & Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Image Gallery */}
                    <ListingGallery
                        images={listing.listing_media || []}
                        title={listing.title_th}
                    />

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20">{listing.listing_type}</Badge>
                            <span className="text-sm text-gray-500">เผยแพร่เมื่อ: {new Date(listing.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-4 text-white">{listing.title_th}</h1>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {tags.map((tag, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Specifications Grid */}
                        <div className="bg-[#1e202e] rounded-xl p-6 border border-white/5 mb-8 shadow-lg">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Specification</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                {/* Fixed Specs */}
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Item Type</div>
                                    <div className="text-base font-semibold text-white capitalize">{listing.listing_type}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Game</div>
                                    <div className="text-base font-semibold text-white">{listing.categories?.name_th || 'Unknown'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">In Stock</div>
                                    <div className="text-base font-semibold text-white">{listing.stock}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Delivery Method</div>
                                    <div className="text-base font-semibold text-white">{specifications['Delivery Method'] || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Estimated delivery time</div>
                                    <div className="text-base font-semibold text-white">{specifications['Estimated Time'] || '-'}</div>
                                </div>

                                {/* Dynamic Specs */}
                                {Object.entries(specifications)
                                    .filter(([key]) => key !== 'Delivery Method' && key !== 'Estimated Time')
                                    .map(([key, value]) => (
                                        <div key={key}>
                                            <div className="text-sm text-gray-500 mb-1">{key}</div>
                                            <div className="text-base font-semibold text-white">{value}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="prose max-w-none text-gray-300">
                            <h3 className="text-lg font-semibold mb-4 text-white">รายละเอียด</h3>
                            <p className="whitespace-pre-wrap leading-relaxed">{listing.description_th}</p>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="pt-8 border-t border-white/5">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            รีวิวจากผู้ซื้อ
                            <span className="text-sm font-normal text-gray-500">({reviews.length})</span>
                        </h3>

                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="bg-[#13151f] p-4 rounded-lg border border-white/5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white/10">
                                                    <AvatarImage src={review.profiles?.avatar_url} />
                                                    <AvatarFallback>{review.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-white">{review.profiles?.display_name}</div>
                                                    <div className="flex items-center text-xs text-yellow-500">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-500' : 'text-gray-700'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(review.created_at).toLocaleDateString('th-TH')}
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-sm pl-[52px]">{review.comment_th}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-[#1e202e] rounded-lg border border-dashed border-white/10 text-gray-500">
                                ยังไม่มีรีวิวสำหรับสินค้านี้
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Action & Seller */}
                <div className="space-y-6">
                    <Card className="border-0 bg-[#1e202e] text-white shadow-xl">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold text-indigo-400 mb-2">
                                {formatPrice(listing.price_min)}
                            </div>

                            {listing.stock > 0 ? (
                                <div className="text-xs font-medium text-green-400 mb-6 bg-green-500/10 inline-block px-2 py-1 rounded">
                                    มีสินค้า {listing.stock} ชิ้น
                                </div>
                            ) : (
                                <div className="text-xs font-medium text-red-400 mb-6 bg-red-500/10 inline-block px-2 py-1 rounded">
                                    สินค้าหมด
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-500 text-white" size="lg" disabled={listing.stock <= 0} asChild>
                                    {listing.stock > 0 ? (
                                        <Link href={`/checkout/${listing.id}`}>
                                            <ShoppingCart className="mr-2 h-5 w-5" /> สั่งซื้อเลย
                                        </Link>
                                    ) : (
                                        <button disabled>
                                            <ShoppingCart className="mr-2 h-5 w-5" /> สินค้าหมด
                                        </button>
                                    )}
                                </Button>
                                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 hover:text-white" asChild>
                                    <Link href={`/chat?seller_id=${listing.seller_id}`}>
                                        <MessageSquare className="mr-2 h-4 w-4" /> ทักแชทผู้ขาย
                                    </Link>
                                </Button>
                            </div>

                            <div className="mt-4 flex items-center justify-center text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                คุ้มครองโดย ThaiPlay Escrow
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-[#1e202e] text-white shadow-xl">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white">ข้อมูลผู้ขาย</h3>
                            <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12 border border-white/10">
                                    <AvatarImage src={listing.profiles?.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-[#2a2d3e] text-gray-300">{listing.profiles?.display_name?.[0]?.toUpperCase() || 'S'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-lg text-white">{listing.profiles?.display_name || 'ผู้ขาย'}</div>
                                    <div className="text-sm text-gray-500 mb-1">
                                        สมาชิกเมื่อ {listing.profiles?.created_at ? new Date(listing.profiles.created_at).getFullYear() : '2024'}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold text-white">{displayRating}</span>
                                        <span className="text-gray-400">{displayReviewCount}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4 bg-white/5" />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="font-bold text-indigo-400">{displaySales}</div>
                                    <div className="text-gray-500 text-xs">ขายสำเร็จ</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-green-400">{displayResponse}</div>
                                    <div className="text-gray-500 text-xs">ตอบกลับไว</div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-4 w-4" /> ตอบกลับภายใน 1 ชั่วโมง
                            </div>

                            <Button variant="link" className="w-full mt-2 text-indigo-400 hover:text-indigo-300" asChild>
                                <Link href={`/profile/${listing.seller_id}`}>ดูโปรไฟล์ร้านค้า</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
