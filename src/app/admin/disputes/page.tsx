'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight } from 'lucide-react'

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchDisputes = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, buyer:buyer_id(display_name), seller:seller_id(display_name)')
            .eq('status', 'disputed')
            .order('updated_at', { ascending: false })

        if (data) setDisputes(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchDisputes()
    }, [])

    const resolveDispute = async (orderId: string, resolution: 'refund' | 'release') => {
        const newStatus = resolution === 'refund' ? 'cancelled' : 'completed' // Simplified flow

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (!error) {
            alert(`ดำเนินการสำเร็จ: ${newStatus === 'cancelled' ? 'คืนเงินผู้ซื้อ' : 'ปล่อยเงินให้ผู้ขาย'}`)
            fetchDisputes()
        } else {
            alert('Error: ' + error.message)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">จัดการข้อพิพาท (Disputes)</h2>

            <div className="bg-[#1e202e] border border-white/5 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead className="text-gray-400">Order ID</TableHead>
                            <TableHead className="text-gray-400">คู่กรณี</TableHead>
                            <TableHead className="text-gray-400">จำนวนเงิน</TableHead>
                            <TableHead className="text-gray-400 text-right">การตัดสิน</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                                </TableCell>
                            </TableRow>
                        ) : disputes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                    ไม่มีข้อพิพาทที่รอตรวจสอบ
                                </TableCell>
                            </TableRow>
                        ) : disputes.map((order) => (
                            <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                                <TableCell className="font-mono text-xs text-gray-400">
                                    {order.id.slice(0, 8)}...
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <span className="text-red-400">{order.buyer?.display_name}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-600" />
                                        <span className="text-green-400">{order.seller?.display_name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-white font-medium">
                                    ฿{order.amount}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        onClick={() => resolveDispute(order.id, 'refund')}
                                    >
                                        คืนเงินผู้ซื้อ
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-500 text-white"
                                        onClick={() => resolveDispute(order.id, 'release')}
                                    >
                                        ปล่อยเงินให้ผู้ขาย
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
