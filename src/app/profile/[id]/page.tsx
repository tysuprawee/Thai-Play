import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/utils'
import { Star, MapPin, Clock, Calendar } from 'lucide-react'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (!profile) notFound()

    // Fetch Listings
    const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', id)
        .eq('status', 'active')

    // Fetch Reviews
    const { data: reviews } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(display_name, avatar_url)')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })

    return (
        <div className="container py-10 px-4 md:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ตอบกลับใน {profile.response_time_hours || 24} ชม.</span>
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> สมาชิกเมื่อ {new Date(profile.created_at).getFullYear()}</span>
                    </div>
                    <p className="max-w-md text-gray-600">{profile.bio || 'ยินดีต้อนรับสู่ร้านค้าของฉัน'}</p>
                    <div className="pt-2">
                        <Badge variant={profile.seller_level === 'verified' ? 'default' : 'secondary'}>
                            {profile.seller_level === 'verified' ? 'ผู้ขายยืนยันตัวตน' : 'สมาชิกใหม่'}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Listings */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">รายการขาย ({listings?.length || 0})</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {listings?.map((item: any) => (
                                <Link key={item.id} href={`/listing/${item.id}`}>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between">
                                                <Badge variant="outline" className="mb-2">{item.listing_type}</Badge>
                                            </div>
                                            <h3 className="font-bold truncate">{item.title_th}</h3>
                                            <p className="text-indigo-600 font-bold mt-2">{formatPrice(item.price_min)}</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                            {listings?.length === 0 && <p className="text-gray-400">ยังไม่มีรายการขาย</p>}
                        </div>
                    </section>

                    {/* Reviews */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">รีวิวจากลูกค้า ({reviews?.length || 0})</h2>
                        <div className="space-y-4">
                            {reviews?.map((review: any) => (
                                <Card key={review.id}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={review.reviewer?.avatar_url} />
                                                    <AvatarFallback>?</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium text-sm">{review.reviewer?.display_name || 'User'}</span>
                                            </div>
                                            <div className="flex text-yellow-500">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600">{review.comment_th}</p>
                                        <div className="text-xs text-gray-400 mt-2">
                                            {new Date(review.created_at).toLocaleDateString('th-TH')}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {reviews?.length === 0 && <p className="text-gray-400">ยังไม่มีรีวิว</p>}
                        </div>
                    </section>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>สถิติร้านค้า</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">คะแนนเฉลี่ย</span>
                                <span className="font-bold flex items-center gap-1 text-yellow-600">
                                    <Star className="h-4 w-4 fill-current" /> 4.9
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">ขายสำเร็จแล้ว</span>
                                <span className="font-bold">150+ งาน</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">อัตราตอบกลับ</span>
                                <span className="font-bold text-green-600">98%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
