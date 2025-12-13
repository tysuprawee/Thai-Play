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
        .select('*, profiles(*), listing_media(*)')
        .eq('id', id)
        .single()

    if (!listing) {
        notFound()
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Images & Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Image Gallery */}
                    <ListingGallery
                        images={listing.listing_media || []}
                        title={listing.title_th}
                    />

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{listing.listing_type}</Badge>
                            <span className="text-sm text-gray-500">เผยแพร่เมื่อ: {new Date(listing.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-4">{listing.title_th}</h1>

                        <div className="prose max-w-none">
                            <h3 className="text-lg font-semibold mb-2">รายละเอียด</h3>
                            <p className="whitespace-pre-wrap text-gray-700">{listing.description_th}</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Action & Seller */}
                <div className="space-y-6">
                    <Card className="border-2 border-indigo-50">
                        <CardContent className="p-6">
                            <div className="text-3xl font-bold text-indigo-600 mb-2">
                                {formatPrice(listing.price_min)}
                            </div>
                            {listing.price_max && (
                                <div className="text-sm text-gray-500 mb-4">
                                    ถึง {formatPrice(listing.price_max)}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button className="w-full text-lg h-12" size="lg">
                                    <ShoppingCart className="mr-2 h-5 w-5" /> สั่งซื้อเลย
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <MessageSquare className="mr-2 h-4 w-4" /> ทักแชทผู้ขาย
                                </Button>
                            </div>

                            <div className="mt-4 flex items-center justify-center text-xs text-green-600 bg-green-50 p-2 rounded">
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                คุ้มครองโดย ThaiPlay Escrow
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">ข้อมูลผู้ขาย</h3>
                            <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={listing.profiles?.avatar_url} />
                                    <AvatarFallback>{listing.profiles?.display_name?.[0] || 'S'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-lg">{listing.profiles?.display_name || 'Seller'}</div>
                                    <div className="text-sm text-gray-500 mb-1">สมาชิกเมื่อ 2024</div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold">4.9</span>
                                        <span className="text-gray-400">(120 รีวิว)</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="font-bold text-indigo-600">500+</div>
                                    <div className="text-gray-500 text-xs">ขายสำเร็จ</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-green-600">98%</div>
                                    <div className="text-gray-500 text-xs">ตอบกลับไว</div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-4 w-4" /> ตอบกลับภายใน 1 ชั่วโมง
                            </div>

                            <Button variant="link" className="w-full mt-2" asChild>
                                <Link href={`/profile/${listing.seller_id}`}>ดูโปรไฟล์ร้านค้า</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
