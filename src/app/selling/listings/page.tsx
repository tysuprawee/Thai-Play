'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExternalLink, Pencil, Trash2, Plus, Package } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function MyListingsPage() {
    const [listings, setListings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchListings = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('listings')
            .select('*, listing_media(media_url)')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setListings(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchListings()
    }, [])

    const handleDeleteListing = async (listingId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบประกาศนี้?')) return

        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', listingId)

        if (error) {
            alert('ลบไม่สำเร็จ: ' + error.message)
        } else {
            setListings(listings.filter(l => l.id !== listingId))
        }
    }

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">จัดการประกาศขาย</h1>
                    <p className="text-gray-400 text-sm">รายการสินค้าทั้งหมดที่คุณลงประกาศไว้</p>
                </div>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
                    <Link href="/sell">
                        <Plus className="w-4 h-4 mr-2" />
                        ลงประกาศใหม่
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {listings.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl bg-[#1e202e]/50">
                        <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">คุณยังไม่มีประกาศขาย</h3>
                        <p className="text-gray-400 mb-6 max-w-sm mx-auto">ลงประกาศขายสินค้าของคุณได้ฟรี เริ่มต้นสร้างรายได้เลย</p>
                        <Button asChild>
                            <Link href="/sell">เริ่มลงประกาศ</Link>
                        </Button>
                    </div>
                ) : listings.map((item) => (
                    <Card key={item.id} className="bg-[#1e202e] border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-4 p-4 text-white">
                            <div className="w-full sm:w-32 h-32 bg-[#13151f] rounded-lg flex-shrink-0 relative overflow-hidden text-gray-400">
                                {item.listing_media && item.listing_media.length > 0 ? (
                                    <img src={item.listing_media[0].media_url} alt={item.title_th} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-xs">No Image</div>
                                )}
                                {/* Instant Badge Overlay */}
                                {item.specifications?.['Delivery Method'] === 'Instant' && (
                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        INSTANT
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg truncate pr-4 text-white group-hover:text-indigo-400 transition-colors">
                                            {item.title_th}
                                        </h3>
                                        <div className={`px-2 py-0.5 rounded text-xs font-medium capitalize border ${item.status === 'active'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                            {item.status}
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-indigo-400 mt-1">{formatPrice(item.price_min)}</div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 sm:mt-0">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                        Active
                                    </div>
                                    <div>•</div>
                                    <div>ลงเมื่อ: {new Date(item.created_at).toLocaleDateString('th-TH')}</div>
                                    <div>•</div>
                                    <div>ยอดเข้าชม: {item.views || 0}</div>
                                </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 justify-center border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4 pl-0">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white" asChild>
                                    <Link href={`/listing/${item.id}`} target="_blank">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        ดู
                                    </Link>
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto bg-[#2a2d3e] hover:bg-[#353849] text-white" asChild>
                                    <Link href={`/listing/${item.id}/edit`}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        แก้ไข
                                    </Link>
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full sm:w-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                    onClick={() => handleDeleteListing(item.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    ลบ
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
