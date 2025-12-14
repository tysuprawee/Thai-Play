'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, Package, ShieldCheck, AlertTriangle, Star, Copy, ExternalLink, Sparkles, MessageSquare, Send } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { PromptPayQR } from '@/components/payment/PromptPayQR'
import { confirmPayment, confirmDelivery, confirmReceipt, disputeOrder, mockPaymentSuccess } from '@/app/actions/order'
import { submitReview as submitReviewAction } from '@/app/actions/review'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [rating, setRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [existingReview, setExistingReview] = useState<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setCurrentUser(user)

            // Fetch Order
            const { data: orderData } = await supabase
                .from('orders')
                .select('*, listings(*), buyer:profiles!buyer_id(*), seller:profiles!seller_id(*)')
                .eq('id', id)
                .single()

            setOrder(orderData)
            setLoading(false)

            // Fetch Messages
            const { data: msgs } = await supabase
                .from('order_messages')
                .select('*, sender:profiles!sender_id(display_name)')
                .eq('order_id', id)
                .order('created_at', { ascending: true })

            setMessages(msgs || [])

            // Subscribe to new messages
            const channel = supabase
                .channel(`order-${id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${id}` }, (payload) => {
                    setMessages((prev) => [...prev, payload.new]) // Ideally fetch sender name too, but sufficient for now or can re-fetch
                    const fetchNewMsg = async () => {
                        const { data } = await supabase.from('order_messages').select('*, sender:profiles!sender_id(display_name)').eq('id', payload.new.id).single()
                        if (data) setMessages(prev => prev.map(m => m.id === payload.new.id ? data : m).concat(prev.find(m => m.id === payload.new.id) ? [] : [data]))
                    }
                    fetchNewMsg()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
            // Fetch Review
            const { data: reviewData } = await supabase
                .from('reviews')
                .select('*')
                .eq('order_id', id)
                .single()

            setExistingReview(reviewData)
        }
        init()
    }, [id])

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !currentUser || !order) return

        await supabase.from('order_messages').insert({
            order_id: order.id,
            sender_id: currentUser.id,
            message_th: newMessage
        })
        setNewMessage('')
    }

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) return toast.error('กรุณาให้คะแนน (Please rate)')

        try {
            await submitReviewAction(order.id, rating, reviewComment)
            toast.success('ขอบคุณสำหรับรีวิว! (Review submitted)')
            // Refresh to show the read-only review
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit review')
        }
    }

    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const [disputeOpen, setDisputeOpen] = useState(false)
    const [disputeReason, setDisputeReason] = useState('')

    const updateStatus = async (status: string) => {
        setPendingStatus(status)
    }

    const confirmUpdateStatus = async (status: string) => {
        const loadingToast = toast.loading('Updating status...')
        try {
            if (status === 'delivered') {
                await confirmDelivery(id)
                toast.success('Confirmed delivery')
            } else if (status === 'completed') {
                await confirmReceipt(id)
                toast.success('Order completed')
            } else if (status === 'escrowed') {
                await confirmPayment(id)
                toast.success('Payment confirmed')
            } else {
                // Fallback
                await supabase.from('orders').update({ status }).eq('id', order.id)
            }
            toast.dismiss(loadingToast)
            setPendingStatus(null)
            // Reload to reflect changes
            window.location.reload()
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Failed to update status')
        }
    }

    const handleMockPayment = async () => {
        try {
            await mockPaymentSuccess(id)
            toast.success('Mock Payment Successful')
            window.location.reload()
        } catch (e) {
            toast.error('Mock Payment Failed')
        }
    }

    const handleDispute = async () => {
        setDisputeOpen(true)
    }

    const submitDispute = async () => {
        if (!disputeReason.trim()) return

        try {
            await disputeOrder(id, disputeReason)
            toast.success('Issue reported')
            setDisputeOpen(false)
            setDisputeReason('')
            window.location.reload()
        } catch (e) {
            toast.error('Failed to report issue')
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_payment': return <Badge variant="outline" className="text-yellow-400 border-yellow-400">รอชำระเงิน</Badge>
            case 'escrowed': return <Badge className="bg-blue-600 border-0">เงินเข้าระบบแล้ว (Escrow)</Badge>
            case 'delivered': return <Badge className="bg-purple-600 border-0">รอตรวจสอบ</Badge>
            case 'pending_release': return <Badge className="bg-orange-500 border-0 animate-pulse">ตรวจสอบความปลอดภัย (24-72 ชม.)</Badge>
            case 'completed': return <Badge className="bg-green-600 border-0">สำเร็จ</Badge>
            case 'cancelled': return <Badge variant="destructive" className="border-0">ยกเลิก</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>
    if (!order) return <div className="p-10 text-center text-white">Order not found</div>

    const isBuyer = currentUser?.id === order.buyer_id
    const isSeller = currentUser?.id === order.seller_id

    return (
        <div className="container mx-auto py-6 px-4 md:px-6 h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6">

            {/* Left: Order Details & Status Actions */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto">
                <Card className="bg-[#1e202e] border-white/5 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">สถานะคำสั่งซื้อ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-400">Status</span>
                            {getStatusBadge(order.status)}
                        </div>
                        <Separator className="bg-white/5" />

                        {/* Action Buttons based on Status */}
                        {/* Action Buttons based on Status */}
                        {order.status === 'pending_payment' && isBuyer && (
                            <div className="space-y-4">
                                <div className="bg-[#13151f] p-6 rounded-xl border border-white/10 flex flex-col items-center">
                                    <PromptPayQR amount={order.net_amount} />
                                    <p className="text-gray-400 text-sm mt-4 text-center max-w-xs">
                                        กรุณาสแกน QR Code ผ่านแอปธนาคารของท่าน<br />
                                        ยอดโอน: <span className="text-indigo-400 font-bold">{formatPrice(order.net_amount)}</span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10" onClick={() => handleMockPayment()}>
                                        <Sparkles className="mr-2 h-4 w-4" /> Mock Success
                                    </Button>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('escrowed')}>
                                        <ShieldCheck className="mr-2 h-4 w-4" /> แจ้งชำระเงิน
                                    </Button>
                                </div>
                            </div>
                        )}

                        {order.status === 'escrowed' && isSeller && (
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
                                    <h4 className="font-bold mb-1">คำแนะนำ</h4>
                                    <p className="text-xs opacity-80">เมื่อส่งมอบสินค้า/รหัสให้ผู้ซื้อแล้ว กรุณากดปุ่มด้านล่าง</p>
                                </div>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={() => updateStatus('delivered')}>
                                    <Package className="mr-2 h-4 w-4" /> แจ้งส่งมอบงาน/ของ
                                </Button>
                            </div>
                        )}

                        {order.status === 'delivered' && isBuyer && (
                            <div className="space-y-3">
                                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-200">
                                    <h4 className="font-bold mb-1">ตรวจสอบสินค้า</h4>
                                    <p className="text-xs opacity-80">กรุณาตรวจสอบสินค้าให้เรียบร้อยก่อนกดยืนยัน หากกดยืนยันแล้วระบบจะโอนเงินให้ผู้ขายทันที</p>
                                    {order.auto_confirm_at && (
                                        <div className="mt-2 text-xs font-mono bg-black/20 p-1 rounded">
                                            Auto-complete: {new Date(order.auto_confirm_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => updateStatus('completed')}>
                                    <ShieldCheck className="mr-2 h-4 w-4" /> ยืนยันรับของ (โอนเงินให้ผู้ขาย)
                                </Button>
                            </div>
                        )}

                        {order.status === 'completed' && (
                            <div className="space-y-4">
                                <div className="bg-green-500/10 text-green-400 p-3 rounded text-center text-sm font-medium border border-green-500/20">
                                    รายการเสร็จสมบูรณ์
                                    {order.funds_release_at && (
                                        <div className="mt-1 text-xs text-green-300/70 font-normal">
                                            Funds release: {new Date(order.funds_release_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                {isBuyer && !existingReview && (
                                    <div className="p-4 border border-white/5 border-dashed rounded bg-[#13151f]">
                                        <h4 className="font-bold mb-2 text-white">ให้คะแนนร้านค้า</h4>
                                        <div className="flex gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s} type="button" onClick={() => setRating(s)}>
                                                    <Star className={`h-6 w-6 ${s <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="เขียนรีวิว..."
                                            className="mb-2 bg-[#0b0c14] border-white/10 text-white"
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                        />
                                        <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={submitReview}>ส่งรีวิว</Button>
                                    </div>
                                )}

                                {existingReview && (
                                    <div className="p-4 border border-white/5 rounded bg-[#13151f]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-white">รีวิวของคุณ</span>
                                            <div className="flex text-yellow-500">
                                                {Array.from({ length: existingReview.rating }).map((_, i) => (
                                                    <Star key={i} className="h-3 w-3 fill-current" />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">{existingReview.comment_th}</p>
                                    </div>
                                )}

                                {/* Dispute Button for Post-Completion Issues */}
                                <div className="pt-2 border-t border-white/5">
                                    <Button variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDispute()}>
                                        <AlertTriangle className="mr-2 h-4 w-4" /> แจ้งปัญหา/ดึงคืน (Report Issue)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {order.status === 'disputed' && (
                            <div className="bg-red-500/10 text-red-400 p-4 rounded text-center text-sm font-medium border border-red-500/20">
                                รายการนี้กำลังถูกตรวจสอบ (Disputed)
                            </div>
                        )}

                        <div className="bg-blue-500/10 p-3 rounded text-xs text-blue-300 flex items-start gap-2 border border-blue-500/20">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <div>
                                เงินของคุณปลอดภัยในระบบ Escrow จนกว่าผู้ซื้อจะกดยืนยันรับของ (โอนเงินให้ผู้ขายหลังสถานะ Completed)
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 bg-[#1e202e] border-white/5 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">รายละเอียด</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <div className="font-semibold text-gray-400">สินค้า/บริการ</div>
                            <div className="font-medium text-white">{order.listings.title_th}</div>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-400">ราคา</div>
                            <div className="font-medium text-lg text-indigo-400">{formatPrice(order.net_amount)}</div>
                        </div>
                        <Separator className="bg-white/5" />
                        <div>
                            <div className="font-semibold text-gray-400">คู่ค้า</div>
                            <div className="mt-1 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-[#13151f] border border-white/10 flex items-center justify-center text-xs">
                                    {(isBuyer ? order.seller.display_name : order.buyer.display_name)?.[0]?.toUpperCase()}
                                </div>
                                <span>{isBuyer ? order.seller.display_name : order.buyer.display_name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Chat System */}
            <div className="flex-1 flex flex-col bg-[#1e202e] border border-white/5 rounded-lg shadow-xl h-full overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-[#13151f] flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-400" /> ห้องสนทนา
                    </h3>
                    <div className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs rounded-full font-medium">
                        ห้ามแลกเปลี่ยน Line/เบอร์โทร เพื่อความปลอดภัย
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0b0c14]">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser?.id
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-[#1e202e] text-gray-200 border border-white/5'}`}>
                                    <div>{msg.message_th}</div>
                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-white/5 bg-[#13151f]">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="พิมพ์ข้อความ..."
                            className="flex-1 bg-[#0b0c14] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500"
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Dialogs */}
            <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
                <AlertDialogContent className="bg-[#1e202e] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการเปลี่ยนแปลงสถานะ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะเป็น {pendingStatus}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-indigo-600 hover:bg-indigo-500"
                            onClick={() => pendingStatus && confirmUpdateStatus(pendingStatus)}
                        >
                            ยืนยัน
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                <DialogContent className="bg-[#1e202e] border-white/10 text-white">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">แจ้งปัญหา (Report Issue)</h3>
                        <p className="text-sm text-gray-400">กรุณาระบุรายละเอียดปัญหาเพื่อให้เจ้าหน้าที่ตรวจสอบ</p>
                        <Input
                            value={disputeReason}
                            onChange={e => setDisputeReason(e.target.value)}
                            placeholder="รายละเอียดปัญหา..."
                            className="bg-[#0b0c14] border-white/10 text-white"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setDisputeOpen(false)}>ยกเลิก</Button>
                            <Button variant="destructive" onClick={submitDispute} disabled={!disputeReason.trim()}>ส่งรายงาน</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}

