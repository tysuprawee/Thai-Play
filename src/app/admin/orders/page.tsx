'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedChatOrder, setSelectedChatOrder] = useState<string | null>(null)
    const [chatMessages, setChatMessages] = useState<any[]>([])
    const supabase = createClient()

    const fetchOrders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                listings(title_th),
                buyer:profiles!orders_buyer_id_fkey(display_name),
                seller:profiles!orders_seller_id_fkey(display_name)
            `)
            .order('created_at', { ascending: false })

        if (data) setOrders(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        if (!confirm(`เปลี่ยนสถานะเป็น ${newStatus}?`)) return

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) {
            alert('Error: ' + error.message)
        } else {
            fetchOrders()
        }
    }

    const loadChat = async (orderId: string) => {
        setSelectedChatOrder(orderId)
        const { data } = await supabase
            .from('order_messages')
            .select('*, sender:profiles(display_name)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })

        if (data) setChatMessages(data)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">จัดการคำสั่งซื้อ (Orders)</h1>

            <Card className="bg-[#1e202e] border-white/5 text-white">
                <CardHeader>
                    <CardTitle>รายการคำสั่งซื้อล่าสุด</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-400">Order ID</TableHead>
                                <TableHead className="text-gray-400">สินค้า</TableHead>
                                <TableHead className="text-gray-400">ผู้ซื้อ vs ผู้ขาย</TableHead>
                                <TableHead className="text-gray-400">ยอดเงิน</TableHead>
                                <TableHead className="text-gray-400">สถานะ</TableHead>
                                <TableHead className="text-right text-gray-400">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">กำลังโหลด...</TableCell>
                                </TableRow>
                            ) : orders.map((order) => (
                                <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-mono text-xs text-gray-400">
                                        {order.id.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {order.listings?.title_th}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="text-indigo-400">B: {order.buyer?.display_name}</span>
                                            <span className="text-purple-400">S: {order.seller?.display_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatPrice(order.total_amount)}</TableCell>
                                    <TableCell>
                                        <Badge className={`uppercase ${order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                                order.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                                                    order.status === 'disputed' ? 'bg-orange-500/20 text-orange-300' :
                                                        'bg-blue-500/20 text-blue-300'
                                            }`}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => loadChat(order.id)}>
                                                    <MessageSquare className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-[#1e202e] border-white/10 text-white max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>ข้อความสนทนา (Order: {order.id.slice(0, 8)})</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    {chatMessages.length === 0 ? (
                                                        <p className="text-center text-gray-500">ไม่มีข้อความ</p>
                                                    ) : chatMessages.map((msg) => (
                                                        <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.sender_id === order.buyer_id ? 'bg-indigo-500/10 border border-indigo-500/20 ml-auto max-w-[80%]' :
                                                                'bg-gray-800 border border-white/5 mr-auto max-w-[80%]'
                                                            }`}>
                                                            <div className="text-[10px] text-gray-400 mb-1">{msg.sender?.display_name}</div>
                                                            {msg.message_text}
                                                        </div>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Select onValueChange={(val) => handleStatusUpdate(order.id, val)}>
                                            <SelectTrigger className="w-[100px] h-8 text-xs bg-[#13151f] border-white/10">
                                                <SelectValue placeholder="Action" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="completed">Complete</SelectItem>
                                                <SelectItem value="cancelled">Cancel</SelectItem>
                                                <SelectItem value="disputed">Dispute</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
