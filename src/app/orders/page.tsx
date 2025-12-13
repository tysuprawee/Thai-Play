'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { Package, ShoppingBag } from 'lucide-react'

export default function OrdersPage() {
    const [buyingOrders, setBuyingOrders] = useState<any[]>([])
    const [sellingOrders, setSellingOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchOrders = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch Buying
            const { data: buying } = await supabase
                .from('orders')
                .select('*, listings(title_th, listing_type), profiles!seller_id(display_name)')
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false })

            setBuyingOrders(buying || [])

            // Fetch Selling
            const { data: selling } = await supabase
                .from('orders')
                .select('*, listings(title_th, listing_type), profiles!buyer_id(display_name)')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false })

            setSellingOrders(selling || [])
            setLoading(false)
        }
        fetchOrders()
    }, [])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_payment': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">รอชำระเงิน</Badge>
            case 'escrowed': return <Badge className="bg-blue-600">เงินเข้าระบบแล้ว</Badge>
            case 'delivered': return <Badge className="bg-purple-600">รอตรวจสอบ</Badge>
            case 'completed': return <Badge className="bg-green-600">สำเร็จ</Badge>
            case 'cancelled': return <Badge variant="destructive">ยกเลิก</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="container py-8 px-4 md:px-6">
            <h1 className="text-2xl font-bold mb-6">รายการคำสั่งซื้อของฉัน</h1>

            <Tabs defaultValue="buying" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="buying">ฉันซื้อสินค้า ({buyingOrders.length})</TabsTrigger>
                    <TabsTrigger value="selling">ฉันขายสินค้า ({sellingOrders.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="buying">
                    <div className="space-y-4">
                        {buyingOrders.length === 0 && <div className="text-center py-10 text-gray-400">ยังไม่มีรายการสั่งซื้อ</div>}
                        {buyingOrders.map((order) => (
                            <Link key={order.id} href={`/orders/${order.id}`}>
                                <Card className="hover:bg-slate-50 transition-colors">
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
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="selling">
                    <div className="space-y-4">
                        {sellingOrders.length === 0 && <div className="text-center py-10 text-gray-400">ยังไม่มีรายการขาย</div>}
                        {sellingOrders.map((order) => (
                            <Link key={order.id} href={`/orders/${order.id}`}>
                                <Card className="hover:bg-slate-50 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <Package className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold">{order.listings?.title_th}</div>
                                                <div className="text-sm text-gray-500">ผู้ซื้อ: {order.profiles?.display_name}</div>
                                                <div className="text-xs text-gray-400">Order ID: {order.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-1">{getStatusBadge(order.status)}</div>
                                            <div className="font-bold text-green-600">+{formatPrice(order.net_amount)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
