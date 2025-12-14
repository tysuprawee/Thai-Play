'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/utils'
import { ShieldCheck, MessageSquare, ShoppingCart, Star, Clock } from 'lucide-react'
import { ListingGallery } from '@/components/listing/ListingGallery'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface ListingDetailsProps {
    listing: any
    specifications: Record<string, string>
    tags: string[]
    reviews: any[]
    stats: {
        salesCount: number
        isOfficialStore: boolean
        displaySales: string | number
        displayRating: string
        displayReviewCount: string
        displayResponse: string
    }
}

export function ListingDetails({ listing, specifications, tags, reviews, stats }: ListingDetailsProps) {
    const { t } = useLanguage()

    // Helper to translate spec keys if needed (or just use English keys)
    // For now we use the keys as is or map specific fixed ones if intended.
    // Ideally, "Delivery Method" and "Estimated Time" should come from keys that are translation-friendly, 
    // but here we just match the hardcoded English keys if they exist in specifications.

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
                            <span className="text-sm text-gray-500">{t.listing.published}: {new Date(listing.created_at).toLocaleDateString('th-TH')}</span>
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
                                <h3 className="text-lg font-bold text-white">{t.listing.specifications}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                {/* Fixed Specs */}
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">{t.listing.item_type}</div>
                                    <div className="text-base font-semibold text-white capitalize">{listing.listing_type}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">{t.listing.game}</div>
                                    <div className="text-base font-semibold text-white">{listing.categories?.name_th || 'Unknown'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">{t.listing.stock}</div>
                                    <div className="text-base font-semibold text-white">{listing.stock} {t.listing.unit_piece}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">{t.listing.delivery_method}</div>
                                    <div className="text-base font-semibold text-white">{specifications['Delivery Method'] || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">{t.listing.estimated_time}</div>
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
                            <h3 className="text-lg font-semibold mb-4 text-white">{t.listing.details}</h3>
                            <p className="whitespace-pre-wrap leading-relaxed">{listing.description_th}</p>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="pt-8 border-t border-white/5">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            {t.listing.reviews}
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
                                {t.listing.no_reviews}
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
                                    {t.listing.stock} {listing.stock} {t.listing.unit_piece}
                                </div>
                            ) : (
                                <div className="text-xs font-medium text-red-400 mb-6 bg-red-500/10 inline-block px-2 py-1 rounded">
                                    {t.listing.out_of_stock}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-500 text-white" size="lg" disabled={listing.stock <= 0} asChild>
                                    {listing.stock > 0 ? (
                                        <Link href={`/checkout/${listing.id}`}>
                                            <ShoppingCart className="mr-2 h-5 w-5" /> {t.listing.buy_now}
                                        </Link>
                                    ) : (
                                        <button disabled>
                                            <ShoppingCart className="mr-2 h-5 w-5" /> {t.listing.out_of_stock}
                                        </button>
                                    )}
                                </Button>
                                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 hover:text-white" asChild>
                                    <Link href={`/chat?seller_id=${listing.seller_id}`}>
                                        <MessageSquare className="mr-2 h-4 w-4" /> {t.listing.chat_seller}
                                    </Link>
                                </Button>
                            </div>

                            <div className="mt-4 flex items-center justify-center text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                {t.listing.protection}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-[#1e202e] text-white shadow-xl">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white">{t.listing.seller_info}</h3>
                            <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12 border border-white/10">
                                    <AvatarImage src={listing.profiles?.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-[#2a2d3e] text-gray-300">{listing.profiles?.display_name?.[0]?.toUpperCase() || 'S'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-lg text-white">{listing.profiles?.display_name || 'ผู้ขาย'}</div>
                                    <div className="text-sm text-gray-500 mb-1">
                                        {t.listing.member_since} {listing.profiles?.created_at ? new Date(listing.profiles.created_at).getFullYear() : '2024'}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold text-white">{stats.displayRating}</span>
                                        <span className="text-gray-400">{stats.displayReviewCount}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4 bg-white/5" />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="font-bold text-indigo-400">{stats.displaySales}</div>
                                    <div className="text-gray-500 text-xs">{t.listing.sold_success}</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-green-400">{stats.displayResponse}</div>
                                    <div className="text-gray-500 text-xs">{t.listing.response_rate}</div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-4 w-4" /> {t.listing.reply_within} 1 ชั่วโมง
                            </div>

                            <Button variant="link" className="w-full mt-2 text-indigo-400 hover:text-indigo-300" asChild>
                                <Link href={`/profile/${listing.seller_id}`}>{t.listing.view_store}</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
