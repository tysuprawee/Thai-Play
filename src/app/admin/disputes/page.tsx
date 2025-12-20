'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowRight, Eye } from 'lucide-react'
import { resolveDispute } from '@/app/actions/admin-dispute'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDispute, setSelectedDispute] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [resolutionStage, setResolutionStage] = useState<'details' | 'confirm_refund' | 'confirm_release'>('details')
    const [resolutionMessage, setResolutionMessage] = useState('')
    const [processing, setProcessing] = useState(false)
    const [activeTab, setActiveTab] = useState('active')
    const supabase = createClient()

    const fetchDisputes = async () => {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select('*, buyer:buyer_id(display_name), seller:seller_id(display_name)')
            .order('updated_at', { ascending: false })

        if (activeTab === 'active') {
            query = query.eq('status', 'disputed')
        } else {
            // History: Not disputed, but has a reason (implies it WAS disputed and resolved)
            query = query.neq('status', 'disputed').not('dispute_reason', 'is', null)
        }

        const { data } = await query

        if (data) setDisputes(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchDisputes()
    }, [activeTab])

    const handleResolution = async () => {
        if (!selectedDispute || !resolutionMessage.trim()) return

        setProcessing(true)
        try {
            const type = resolutionStage === 'confirm_refund' ? 'refund' : 'release'
            await resolveDispute(selectedDispute.id, type, resolutionMessage)

            alert(`ดำเนินการสำเร็จ: ${type === 'refund' ? 'คืนเงินผู้ซื้อ' : 'ปล่อยเงินให้ผู้ขาย'}`)
            fetchDisputes()
            setIsDialogOpen(false)
            setResolutionMessage('')
            setResolutionStage('details')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">จัดการข้อพิพาท (Disputes)</h2>

            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#1e202e] border border-white/10 mb-6">
                    <TabsTrigger value="active" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
                        รอตรวจสอบ (Active)
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
                        ประวัติ (History)
                    </TabsTrigger>
                </TabsList>

                <div className="bg-[#1e202e] border border-white/5 rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-white/5">
                                <TableHead className="text-gray-400">Order ID</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400">คู่กรณี</TableHead>
                                <TableHead className="text-gray-400">เหตุผล (Reason)</TableHead>
                                <TableHead className="text-gray-400">จำนวนเงิน</TableHead>
                                <TableHead className="text-gray-400 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                                    </TableCell>
                                </TableRow>
                            ) : disputes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                        {activeTab === 'active' ? 'ไม่มีข้อพิพาทที่รอตรวจสอบ' : 'ไม่มีประวัติข้อพิพาท'}
                                    </TableCell>
                                </TableRow>
                            ) : disputes.map((order) => (
                                <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell className="font-mono text-xs text-gray-400">
                                        {order.id.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`
                                            ${order.status === 'disputed' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : ''}
                                            ${order.status === 'cancelled' ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''}
                                            ${order.status === 'completed' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : ''}
                                        `}>
                                            {order.status === 'disputed' && 'รอตรวจสอบ'}
                                            {order.status === 'cancelled' && 'คืนเงินแล้ว'}
                                            {order.status === 'completed' && 'ปล่อยเงินแล้ว'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <span className="text-red-400">{order.buyer?.display_name}</span>
                                            <ArrowRight className="w-3 h-3 text-gray-600" />
                                            <span className="text-green-400">{order.seller?.display_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            // Parse "[Category] Reason" format
                                            const match = order.dispute_reason?.match(/^\[(.*?)\] (.*)$/)
                                            if (match) {
                                                return (
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400">
                                                            {match[1]}
                                                        </Badge>
                                                        <p className="text-xs text-gray-400 max-w-[200px] truncate" title={match[2]}>
                                                            {match[2]}
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return <span className="text-xs text-gray-400">{order.dispute_reason || '-'}</span>
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-white font-medium">
                                        ฿{order.amount}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                            onClick={() => {
                                                setSelectedDispute(order)
                                                setIsDialogOpen(true)
                                            }}
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                    setSelectedDispute(null) // Added this line
                    setResolutionStage('details')
                    setResolutionMessage('')
                }
            }}>
                <DialogContent className="sm:max-w-[600px] bg-[#1e202e] border-white/10 text-white"> {/* Changed max-w-2xl to sm:max-w-[600px] to match original */}
                    <DialogHeader>
                        <DialogTitle>
                            {resolutionStage === 'details' ? 'Dispute Details' :
                                resolutionStage === 'confirm_refund' ? 'Confirm Refund to Buyer' : 'Confirm Release to Seller'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {resolutionStage === 'details' ? 'Review details and take action.' : 'Please provide a reason for this decision. This will be sent to the users.'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDispute && (
                        <div className="space-y-6 py-4">
                            {resolutionStage === 'details' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 uppercase font-bold">Buyer</label>
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md">
                                                <span className="text-sm font-medium text-red-400">{selectedDispute.buyer?.display_name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 uppercase font-bold">Seller</label>
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md">
                                                <span className="text-sm font-medium text-green-400">{selectedDispute.seller?.display_name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase font-bold">Dispute Reason</label>
                                        <div className="p-4 bg-[#0b0c14] border border-white/5 rounded-md space-y-2">
                                            {(() => {
                                                const match = selectedDispute.dispute_reason?.match(/^\[(.*?)\] (.*)$/)
                                                if (match) {
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="border-orange-500/50 text-orange-400 mb-2">
                                                                {match[1]}
                                                            </Badge>
                                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{match[2]}</p>
                                                        </>
                                                    )
                                                }
                                                return <p className="text-sm text-gray-300">{selectedDispute.dispute_reason || 'No reason provided'}</p>
                                            })()}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 uppercase font-bold">Amount In Escrow</label>
                                        <div className="text-xl font-bold text-white">
                                            ฿{selectedDispute.amount}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-200 text-sm">
                                        Warning: This action is irreversible. The order status will be updated immediately.
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Resolution Message (Required)</label>
                                        <Textarea
                                            value={resolutionMessage}
                                            onChange={(e) => setResolutionMessage(e.target.value)}
                                            placeholder="Explain why you are making this decision..."
                                            className="bg-[#0b0c14] border-white/10 text-white min-h-[120px]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        {resolutionStage === 'details' ? (
                            <>
                                <Button
                                    onClick={() => setResolutionStage('confirm_refund')}
                                    className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none"
                                >
                                    Refund Buyer
                                </Button>
                                <Button
                                    onClick={() => setResolutionStage('confirm_release')}
                                    className="bg-green-600 hover:bg-green-500 text-white border-none"
                                >
                                    Release to Seller
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setResolutionStage('details')
                                        setResolutionMessage('')
                                    }}
                                    className="text-gray-400 hover:text-white"
                                    disabled={processing}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleResolution}
                                    className={resolutionStage === 'confirm_refund' ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}
                                    disabled={!resolutionMessage.trim() || processing}
                                >
                                    {processing ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Confirm {resolutionStage === 'confirm_refund' ? 'Refund' : 'Release'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mt-12 border-t border-white/5 pt-6 flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-white text-xs"
                    onClick={async () => {
                        toast.info('Testing Support Connection...')
                        try {
                            const { testSupportConnection } = await import('@/app/actions/admin-dispute')
                            const res = await testSupportConnection()
                            console.log('Test Result:', res)
                            if (res.success) {
                                let msg = `Profile: ${res.profileExists ? '✅' : '❌'} | Chat: ${res.conversationId ? '✅' : '❌'}`
                                if (res.lastMessage) {
                                    msg += ` | Last Msg: "${res.lastMessage.content.slice(0, 15)}..."`
                                } else {
                                    msg += ' | No msgs'
                                }
                                if (!res.profileExists) toast.error('Support Profile Missing! Run migration.')
                                else if (!res.conversationId) toast.error('Chat Missing! RPC failure.')
                                else toast.success(msg)
                            } else {
                                toast.error(`Test Failed: ${res.error}`)
                            }
                        } catch (e) {
                            console.error(e)
                            toast.error('Test Action Failed')
                        }
                    }}
                >
                    Test Support System
                </Button>
            </div>
        </div>
    )
}
