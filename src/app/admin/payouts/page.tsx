'use client'

import { useEffect, useState } from 'react'
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
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchPayouts()
    }, [])

    const fetchPayouts = async () => {
        const { data } = await supabase
            .from('payouts')
            .select('*, profiles(display_name, avatar_url)')
            .order('created_at', { ascending: false })

        if (data) setPayouts(data)
        setLoading(false)
    }

    const handleAction = async (id: string, action: 'completed' | 'rejected') => {
        if (!confirm(`Are you sure you want to mark this as ${action}?`)) return

        setProcessing(id)
        const { error } = await supabase
            .from('payouts')
            .update({
                status: action,
                completed_at: action === 'completed' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            toast.error('Failed to update status: ' + error.message)
        } else {
            toast.success(`Marked as ${action}`)
            fetchPayouts()
        }
        setProcessing(null)
    }

    if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>

    const pendingPayouts = payouts.filter(p => p.status === 'pending')
    const completedPayouts = payouts.filter(p => p.status === 'completed')
    const rejectedPayouts = payouts.filter(p => p.status === 'rejected')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">จัดการการถอนเงิน (Withdrawal Requests)</h2>
                <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">
                    Pending: {formatPrice(pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0))}
                </Badge>
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-[#1e202e] border border-white/5">
                    <TabsTrigger value="pending">รออนุมัติ ({pendingPayouts.length})</TabsTrigger>
                    <TabsTrigger value="completed">สำเร็จ ({completedPayouts.length})</TabsTrigger>
                    <TabsTrigger value="rejected">ปฏิเสธ ({rejectedPayouts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                    <PayoutTable
                        data={pendingPayouts}
                        processing={processing}
                        onApprove={(id: string) => handleAction(id, 'completed')}
                        onReject={(id: string) => handleAction(id, 'rejected')}
                        showActions={true}
                    />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                    <PayoutTable data={completedPayouts} processing={null} showActions={false} />
                </TabsContent>

                <TabsContent value="rejected" className="mt-6">
                    <PayoutTable data={rejectedPayouts} processing={null} showActions={false} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PayoutTable({ data, processing, onApprove, onReject, showActions }: any) {
    if (data.length === 0) {
        return <div className="p-8 text-center text-gray-500 border border-white/5 rounded-lg bg-[#1e202e]">ไม่มีรายการ</div>
    }

    return (
        <div className="bg-[#1e202e] border border-white/5 rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-white/5">
                        <TableHead className="text-gray-400">วันที่</TableHead>
                        <TableHead className="text-gray-400">ผู้ขาย</TableHead>
                        <TableHead className="text-gray-400">บัญชีธนาคาร</TableHead>
                        <TableHead className="text-gray-400">จำนวนเงิน</TableHead>
                        <TableHead className="text-gray-400 text-right">สถานะ / Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((p: any) => (
                        <TableRow key={p.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-gray-300">
                                {new Date(p.created_at).toLocaleDateString('th-TH', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </TableCell>
                            <TableCell>
                                <div className="text-white font-medium">{p.profiles?.display_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{p.user_id}</div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-indigo-300">{p.bank_name}</span>
                                    <span className="text-sm text-gray-300">{p.account_number}</span>
                                    <span className="text-xs text-gray-500">{p.account_name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="font-bold text-white text-lg">
                                {formatPrice(p.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                                {showActions ? (
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-green-500/20 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                                            onClick={() => onApprove(p.id)}
                                            disabled={!!processing}
                                        >
                                            {processing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                            อนุมัติ
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            onClick={() => onReject(p.id)}
                                            disabled={!!processing}
                                        >
                                            {processing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                                            ปฏิเสธ
                                        </Button>
                                    </div>
                                ) : (
                                    <StatusBadge status={p.status} />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'completed': return <Badge className="bg-green-500/10 text-green-400">สำเร็จแล้ว</Badge>
        case 'rejected': return <Badge className="bg-red-500/10 text-red-400">ปฏิเสธแล้ว</Badge>
        default: return <Badge className="bg-gray-500/10 text-gray-400">{status}</Badge>
    }
}
