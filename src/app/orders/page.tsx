'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star, Loader2, Package, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

export default function OrdersPage() {
    const [buyingOrders, setBuyingOrders] = useState<any[]>([])
    const [sellingOrders, setSellingOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Review State
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Orders (Buying & Selling) - Parallelize for speed
        const [buyingRes, sellingRes] = await Promise.all([
            supabase
                .from('orders')
                .select('*, listings(title_th, listing_type), profiles!seller_id(display_name), reviews(id)')
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('orders')
                .select('*, listings(title_th, listing_type), profiles!buyer_id(display_name)')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false })
        ])

        setBuyingOrders(buyingRes.data || [])
        setSellingOrders(sellingRes.data || [])

        // 2. Fetch Unread Message Counts for Orders
        // We look for unread messages sent TO current user, joined to conversations with order_id
        const { data: unreadMsgs } = await supabase
            .from('messages')
            .select(`
                id, 
                conversations!inner (
                    order_id
                )
            `)
            .eq('receiver_id', user.id)
            .eq('is_read', false)
            .limit(500) // Reasonable limit

        // Aggregate counts by order_id
        const counts: Record<string, number> = {}
        if (unreadMsgs) {
            unreadMsgs.forEach((msg: any) => {
                const orderId = Array.isArray(msg.conversations)
                    ? msg.conversations[0]?.order_id
                    : msg.conversations?.order_id

                if (orderId) {
                    counts[orderId] = (counts[orderId] || 0) + 1
                }
            })
        }
        setUnreadCounts(counts)

        setLoading(false)
    }

    useEffect(() => {
        fetchData()

        // Subscribe to real-time message updates to keep badge fresh
        const channel = supabase.channel('order-badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                fetchData() // Simple refetch on any message change
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const handleReviewSubmit = async () => {
        if (!selectedOrder) return
        setSubmittingReview(true)

        try {
            const { error } = await supabase.from('reviews').insert({
                order_id: selectedOrder.id,
                reviewer_id: selectedOrder.buyer_id, // Should be current user
                seller_id: selectedOrder.seller_id,
                rating: rating,
                comment_th: comment
            })

            if (error) throw error

            toast.success('ส่งรีวิวเรียบร้อยแล้ว')
            setReviewDialogOpen(false)
            setRating(5)
            setComment('')
            fetchOrders() // Refresh to show "Reviewed" status
        } catch (error: any) {
            console.error('Review Error:', error)
            toast.error('ไม่สามารถส่งรีวิวได้: ' + error.message)
        } finally {
            setSubmittingReview(false)
        }
    }

    const openReviewDialog = (order: any) => {
        setSelectedOrder(order)
        setRating(5)
        setComment('')
        setReviewDialogOpen(true)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_payment': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">รอชำระเงิน</Badge>
            case 'escrowed': return <Badge className="bg-blue-600">เงินเข้าระบบแล้ว</Badge>
            case 'delivered': return <Badge className="bg-purple-600">รอตรวจสอบ</Badge>
            case 'pending_release': return <Badge className="bg-orange-500 animate-pulse">ตรวจสอบความปลอดภัย</Badge>
            case 'completed': return <Badge className="bg-green-600">สำเร็จ</Badge>
            case 'cancelled': return <Badge variant="destructive">ยกเลิก</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>

    return (
        <div className="container py-8 px-4 md:px-6">
            <h1 className="text-2xl font-bold mb-6 text-white">รายการคำสั่งซื้อของฉัน</h1>

            <Tabs defaultValue="buying" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#1e202e]">
                    <TabsTrigger value="buying">ฉันซื้อสินค้า ({buyingOrders.length})</TabsTrigger>
                    <TabsTrigger value="selling">ฉันขายสินค้า ({sellingOrders.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="buying">
                    <div className="space-y-4">
                        {buyingOrders.length === 0 && <div className="text-center py-10 text-gray-400">ยังไม่มีรายการสั่งซื้อ</div>}
                        {buyingOrders.map((order) => (
                            <div key={order.id} className="relative group">
                                <Link href={`/orders/${order.id}`}>
                                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-indigo-100 rounded-full">
                                                    <ShoppingBag className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">{order.listings?.title_th}</div>
                                                    <div className="text-sm text-gray-500">ผู้ขาย: {order.profiles?.display_name}</div>
                                                    <div className="text-xs text-gray-400">Order ID: {order.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="mb-1">{getStatusBadge(order.status)}</div>
                                                <div className="font-bold">{formatPrice(order.net_amount)}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>

                                {/* Review Button Overlay (Only for completed orders without review) */}
                                {order.status === 'completed' && (!order.reviews || order.reviews.length === 0) && (
                                    <div className="absolute top-4 right-32 z-10">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                openReviewDialog(order)
                                            }}
                                        >
                                            <Star className="w-3 h-3 mr-1" /> ให้คะแนน
                                        </Button>
                                    </div>
                                )}
                                {order.status === 'completed' && order.reviews && order.reviews.length > 0 && (
                                    <div className="absolute top-4 right-32 z-10 pointer-events-none">
                                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
                                            <Star className="w-3 h-3 mr-1 fill-gray-400 text-gray-400" /> ให้คะแนนแล้ว
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="selling">
                    <div className="space-y-4">
                        {sellingOrders.length === 0 && <div className="text-center py-10 text-gray-400">ยังไม่มีรายการขาย</div>}

                        {/* Action Needed Section */}
                        {sellingOrders.some(o => o.status === 'escrowed') && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    รอการจัดส่ง (ต้องดำเนินการ)
                                </h3>
                                <div className="space-y-3">
                                    {sellingOrders.filter(o => o.status === 'escrowed').map(order => (
                                        <Link key={order.id} href={`/orders/${order.id}`}>
                                            <Card className="hover:bg-slate-50 transition-colors border-l-4 border-l-indigo-500 shadow-md relative overflow-visible">
                                                {/* Unread Badge */}
                                                {unreadCounts[order.id] > 0 && (
                                                    <div className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 border-2 border-[#0f1016] text-[10px] font-bold text-white shadow-md animate-in zoom-in">
                                                        {unreadCounts[order.id] > 9 ? '9+' : unreadCounts[order.id]}
                                                    </div>
                                                )}
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-indigo-100 rounded-full">
                                                            <Package className="h-6 w-6 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold flex items-center gap-2">
                                                                {order.listings?.title_th}
                                                                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">รอส่งของ</Badge>
                                                            </div>
                                                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                                                <span>ผู้ซื้อ: {order.profiles?.display_name}</span>
                                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full border">แชทเลย</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">Order ID: {order.id.slice(0, 8)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-600 text-lg">+{formatPrice(order.net_amount)}</div>
                                                        <Button size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700">จัดการออเดอร์</Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <h3 className="text-sm font-medium text-gray-500 mb-3">ประวัติการขายทั้งหมด</h3>
                        {sellingOrders.filter(o => o.status !== 'escrowed').map((order) => (
                            <Link key={order.id} href={`/orders/${order.id}`}>
                                <Card className="hover:bg-slate-50 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 rounded-full">
                                                <Package className="h-6 w-6 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="font-bold">{order.listings?.title_th}</div>
                                                <div className="text-sm text-gray-500">ผู้ซื้อ: {order.profiles?.display_name}</div>
                                                <div className="text-xs text-gray-400">Order ID: {order.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">{getStatusBadge(order.status)}</div>
                                            <div className="font-bold text-gray-700">+{formatPrice(order.net_amount)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ให้คะแนนสินค้าและผู้ขาย</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <div className="text-center text-sm font-medium text-gray-600">
                            {rating === 5 ? 'ดีเยี่ยม' : rating === 4 ? 'ดีมาก' : rating === 3 ? 'พอใช้' : rating === 2 ? 'ควรปรับปรุง' : 'แย่'}
                        </div>

                        <div className="space-y-2">
                            <Label>ความคิดเห็นเพิ่มเติม</Label>
                            <Textarea
                                placeholder="เล่าประสบการณ์ของคุณ..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-500"
                            onClick={handleReviewSubmit}
                            disabled={submittingReview}
                        >
                            {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ส่งรีวิว
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
