'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Send, CheckCircle, AlertTriangle, ShieldCheck, Star } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [rating, setRating] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [existingReview, setExistingReview] = useState<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const init = async () => {
            const { id } = await params
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
    }, [])

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
        if (rating === 0) return alert('กรุณาให้คะแนน')

        const { error } = await supabase.from('reviews').insert({
            order_id: order.id,
            reviewer_id: currentUser.id,
            seller_id: order.seller_id,
            rating,
            comment_th: reviewComment
        })

        if (error) alert(error.message)
        else window.location.reload()
    }

    const updateStatus = async (status: string) => {
        if (!confirm('ยืนยันการเปลี่ยนแปลงสถานะ?')) return
        await supabase.from('orders').update({ status }).eq('id', order.id)
        window.location.reload() // Simple reload to refresh state
    }

    if (loading) return <div className="p-10 text-center">Loading...</div>
    if (!order) return <div className="p-10 text-center">Order not found</div>

    const isBuyer = currentUser?.id === order.buyer_id
    const isSeller = currentUser?.id === order.seller_id

    return (
        <div className="container py-6 px-4 md:px-6 h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6">

            {/* Left: Order Details & Status Actions */}
            <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-lg flex flex-col gap-4 overflow-y-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">สถานะคำสั่งซื้อ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Status</span>
                            <Badge className="text-base">{order.status}</Badge>
                        </div>
                        <Separator />

                        {/* Action Buttons based on Status */}
                        {order.status === 'pending_payment' && isBuyer && (
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus('escrowed')}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> ชำระเงิน (Mock)
                            </Button>
                        )}
                        {order.status === 'escrowed' && isSeller && (
                            <Button className="w-full" onClick={() => updateStatus('delivered')}>
                                <Package className="mr-2 h-4 w-4" /> แจ้งส่งมอบงาน/ของ
                            </Button>
                        )}
                        {order.status === 'delivered' && isBuyer && (
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus('completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> ยืนยันรับของ (ปิดงาน)
                            </Button>
                        )}
                        {order.status === 'completed' && (
                            <div className="space-y-4">
                                <div className="bg-green-100 text-green-800 p-3 rounded text-center text-sm font-medium">
                                    รายการเสร็จสมบูรณ์
                                </div>

                                {isBuyer && !existingReview && (
                                    <div className="p-4 border border-dashed rounded bg-white">
                                        <h4 className="font-bold mb-2">ให้คะแนนร้านค้า</h4>
                                        <div className="flex gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s} type="button" onClick={() => setRating(s)}>
                                                    <Star className={`h-6 w-6 ${s <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="เขียนรีวิว..."
                                            className="mb-2"
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                        />
                                        <Button size="sm" className="w-full" onClick={submitReview}>ส่งรีวิว</Button>
                                    </div>
                                )}

                                {existingReview && (
                                    <div className="p-4 border rounded bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm">รีวิวของคุณ</span>
                                            <div className="flex text-yellow-500">
                                                {Array.from({ length: existingReview.rating }).map((_, i) => (
                                                    <Star key={i} className="h-3 w-3 fill-current" />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600">{existingReview.comment_th}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <div>
                                เงินของคุณปลอดภัยในระบบ Escrow จนกว่าผู้ซื้อจะกดยืนยันรับของ (โอนเงินให้ผู้ขายหลังสถานะ Completed)
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-lg">รายละเอียด</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <div className="font-semibold text-gray-500">สินค้า/บริการ</div>
                            <div className="font-medium">{order.listings.title_th}</div>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-500">ราคา</div>
                            <div className="font-medium text-lg">{formatPrice(order.net_amount)}</div>
                        </div>
                        <Separator />
                        <div>
                            <div className="font-semibold text-gray-500">คู่ค้า</div>
                            <div className="mt-1 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gray-200" />
                                <span>{isBuyer ? order.seller.display_name : order.buyer.display_name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Chat System */}
            <div className="flex-1 flex flex-col bg-white border rounded-lg shadow-sm h-full overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" /> ห้องสนทนา
                    </h3>
                    <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                        ห้ามแลกเปลี่ยน Line/เบอร์โทร เพื่อความปลอดภัย
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser?.id
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border shadow-sm'}`}>
                                    <div>{msg.message_th}</div>
                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t bg-white">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="พิมพ์ข้อความ..."
                            className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

        </div>
    )
}

function Package(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
        </svg>
    )
}

function MessageSquare(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    )
}
