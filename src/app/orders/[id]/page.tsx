'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getOrCreateConversation, sendMessage } from '@/app/actions/chat'
import { CheckCircle, Clock, Package, ShieldCheck, AlertTriangle, Star, Copy, ExternalLink, Sparkles, MessageSquare, Send } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { PromptPayQR } from '@/components/payment/PromptPayQR'
import { confirmPayment, confirmDelivery, confirmReceipt, disputeOrder, mockPaymentSuccess } from '@/app/actions/order'
import { submitReview as submitReviewAction } from '@/app/actions/review'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChatGuard } from '@/lib/security/ChatGuard'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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
    // State for Unified Chat
    const [conversationId, setConversationId] = useState<string | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    // Derived partner ID
    const partnerId = order ? (currentUser?.id === order.seller_id ? order.buyer_id : order.seller_id) : null

    const supabase = createClient()
    const router = useRouter()

    const [initialScrollDone, setInitialScrollDone] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const [disputeOpen, setDisputeOpen] = useState(false)
    const [disputeCategory, setDisputeCategory] = useState('')
    const [disputeReason, setDisputeReason] = useState('')

    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [secretCode, setSecretCode] = useState<string | null>(null)
    const [secretData, setSecretData] = useState<any>(null)
    const [isSecretRevealed, setIsSecretRevealed] = useState(false)
    const [revealDialogOpen, setRevealDialogOpen] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false) // Auto-prompt review

    // Typing Indicators
    const [isPartnerTyping, setIsPartnerTyping] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastTypedRef = useRef<number>(0)

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

            if (orderData) {
                // Determine Partner
                const pId = user.id === orderData.seller_id ? orderData.buyer_id : orderData.seller_id

                // Get Request for Order Chat Conversation
                try {
                    const convId = await getOrCreateConversation(pId, orderData.id)
                    setConversationId(convId)

                    // Fetch Messages for this Conversation
                    const { data: msgs } = await supabase
                        .from('messages')
                        .select('*, sender:profiles!sender_id(display_name, avatar_url)')
                        .eq('conversation_id', convId)
                        .order('created_at', { ascending: true })

                    setMessages(msgs || [])

                    // Mark unread as read immediately
                    const unreadIds = (msgs || []).filter((m: any) => !m.is_read && m.sender_id !== user.id).map((m: any) => m.id)
                    if (unreadIds.length > 0) {
                        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
                        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
                    }

                } catch (e) {
                    console.error('Failed to init chat', e)
                    toast.error('Could not load chat')
                }

                // Check for Instant Delivery Secret (Buyer Only)
                const isBuyer = user.id === orderData.buyer_id
                const isInstant = orderData.listings?.specifications && orderData.listings.specifications['Delivery Method'] === 'Instant'
                // Status must be paid or later
                const isPaid = ['escrowed', 'delivered', 'completed', 'disputed'].includes(orderData.status)

                if (isBuyer && isInstant && isPaid && orderData.revealed_at) {
                    // Only fetch if ALREADY revealed (Seal Broken)
                    const { data: sData, error } = await supabase.rpc('reveal_secret', { order_uuid: orderData.id })

                    if (error) {
                        console.error('Auto-load revealed secret error:', error)
                    } else if (sData) {
                        setSecretCode(sData.content)
                        setSecretData(sData)
                        setIsSecretRevealed(true)
                    }
                } else if (user.id === orderData.seller_id && isInstant) {
                    // Seller: Fetch secret directly (Auto-reveal for owner)
                    const { data: sData, error } = await supabase
                        .from('listing_secrets')
                        .select('*')
                        .eq('listing_id', orderData.listing_id)
                        .maybeSingle()

                    if (sData) {
                        setSecretCode(sData.content)
                        setSecretData(sData)
                        setIsSecretRevealed(true) // Show content, no reveal button needed
                    }
                }
            }
            setLoading(false)

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

    // Subscription for Unified Chat (Using 'messages' table)
    useEffect(() => {
        if (!conversationId || !currentUser) return

        const channel = supabase
            .channel(`order-chat-${conversationId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUser.id) {
                    setIsPartnerTyping(true)
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsPartnerTyping(false)
                    }, 3000)
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
                const newMsg = payload.new

                // Fetch sender details for the new message
                const { data: fullMsg } = await supabase
                    .from('messages')
                    .select('*, sender:profiles!sender_id(display_name, avatar_url)')
                    .eq('id', newMsg.id)
                    .single()

                if (fullMsg) {
                    // If it's from partner, mark read immediately
                    if (fullMsg.sender_id !== currentUser.id) {
                        await supabase.from('messages').update({ is_read: true }).eq('id', fullMsg.id)
                        fullMsg.is_read = true
                    }

                    setMessages(prev => {
                        if (prev.find(m => m.id === fullMsg.id)) return prev
                        return [...prev, fullMsg]
                    })
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
            })
            // Watch order updates too
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, async (payload) => {
                const newStatus = payload.new.status
                setOrder((prev: any) => ({ ...prev, ...payload.new }))

                // Realtime: If order becomes 'delivered' or 'completed' and it's instant delivery (and we are buyer), fetch secret
                const isBuyer = currentUser.id === order.buyer_id
                const isInstant = order.listings?.specifications?.['Delivery Method'] === 'Instant'

                if (isBuyer && isInstant && (newStatus === 'delivered' || newStatus === 'completed')) {
                    // Do NOT auto-reveal. 
                    // Just let the UI update to show the "Reveal" button (via !isSecretRevealed default).
                    // Logic: The user sees "Delivered" -> "Click to Reveal" -> User Clicks -> RPC -> Reveal.
                    toast.success('Order Delivered! Click to reveal your item.')
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId, currentUser, id])


    // Auto scroll logic (Container based)
    useEffect(() => {
        if (messages.length > 0 && messagesContainerRef.current) {
            const container = messagesContainerRef.current
            if (!initialScrollDone) {
                container.scrollTop = container.scrollHeight
                setInitialScrollDone(true)
            } else {
                // For unified UI request, stick to bottom
                container.scrollTop = container.scrollHeight
            }
        }
    }, [messages, initialScrollDone])


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !currentUser || !conversationId) return

        // 🛡️ Trust & Safety Guard
        if (ChatGuard.isSuspect(newMessage.trim())) {
            toast.warning("Safety Warning: Please keep transactions on ThaiPlay for your protection.")
            return
        }

        try {
            await sendMessage(conversationId, newMessage.trim(), 'text')
            setNewMessage('')
            // UI update handled by subscription or optimistic if desired
            // But subscription is fast enough usually
        } catch (e) {
            console.error(e)
            toast.error('Failed to send')
        }
    }
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !currentUser || !conversationId || !order) return

        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()

        // Use chat-attachments bucket logic
        const folder = `orders/${order.id}`
        const fullPath = `${folder}/${Date.now()}.${fileExt}`
        setUploading(true)

        try {
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(fullPath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fullPath)

            // Send Image Message via Unified Action
            await sendMessage(conversationId, 'Sent an image', 'image', publicUrl)

        } catch (error: any) {
            console.error('Upload error', error)
            toast.error('Failed to upload image')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

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
                await supabase.from('orders').update({ status }).eq('id', order.id)
            }
            toast.dismiss(loadingToast)
            setPendingStatus(null)
        } catch (error: any) {
            toast.dismiss(loadingToast)
            toast.error('Failed to update status: ' + error.message)
        }
    }

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) return toast.error('กรุณาให้คะแนน (Please rate)')

        try {
            await submitReviewAction(order.id, rating, reviewComment)
            toast.success('ขอบคุณสำหรับรีวิว! (Review submitted)')
            window.location.reload() // Keep reload for review for now as it's a separate table
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit review')
        }
    }

    const handleMockPayment = async () => {
        try {
            await mockPaymentSuccess(id)
            toast.success('Mock Payment Successful')
        } catch (e) {
            toast.error('Mock Payment Failed')
        }
    }

    const handleDispute = async () => {
        setDisputeOpen(true)
    }

    const submitDispute = async () => {
        if (!disputeCategory) return toast.error('Please select a reason')
        if (!disputeReason.trim()) return toast.error('Please provide details')

        const finalReason = `[${disputeCategory}] ${disputeReason}`

        try {
            await disputeOrder(id, finalReason)
            toast.success('Issue reported')
            setDisputeOpen(false)
            setDisputeReason('')
            setDisputeCategory('')
        } catch (e) {
            toast.error('Failed to report issue')
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_payment': return <Badge variant="outline" className="text-yellow-400 border-yellow-400">รอชำระเงิน</Badge>
            case 'escrowed': return <Badge className="bg-blue-600 border-0">เงินเข้าระบบแล้ว (Escrow)</Badge>
            case 'delivered': return <Badge className="bg-purple-600 border-0">รอตรวจสอบ</Badge>
            case 'pending_release': return <Badge className="bg-orange-500 border-0 animate-pulse">ตรวจสอบความปลอดภัย</Badge>
            case 'completed': return <Badge className="bg-green-600 border-0">สำเร็จ</Badge>
            case 'cancelled': return <Badge variant="destructive" className="border-0">ยกเลิก</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>
    if (!order) return <div className="p-10 text-center text-white">Order not found</div>

    const isBuyer = currentUser?.id === order.buyer_id
    const isSeller = currentUser?.id === order.seller_id
    const isInstant = order.listings?.specifications?.['Delivery Method'] === 'Instant'

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

                        {/* STATUS: Pending Payment */}
                        {order.status === 'pending_payment' && isBuyer && (
                            <div className="space-y-4">
                                <div className="bg-[#13151f] p-6 rounded-xl border border-white/10 flex flex-col items-center">
                                    <PromptPayQR amount={order.amount} />
                                    <p className="text-gray-400 text-sm mt-4 text-center max-w-xs">
                                        กรุณาสแกน QR Code ผ่านแอปธนาคารของท่าน<br />
                                        ยอดโอน: <span className="text-indigo-400 font-bold">{formatPrice(order.amount)}</span>
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

                        {/* STATUS: Paid / Processing / Completed */}
                        {['escrowed', 'delivered', 'completed', 'disputed'].includes(order.status) && (
                            <div className="space-y-4">

                                {/* 1. INSTANT DELIVERY LOGIC */}
                                {isInstant ? (
                                    <div className="space-y-3 animate-in fade-in zoom-in duration-300">

                                        {/* Header */}
                                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2 text-green-400 font-bold">
                                                <Sparkles className="h-5 w-5" />
                                                สินค้าจัดส่งอัตโนมัติ (Instant Delivery)
                                            </div>

                                            {/* Secret Content or Reveal Trigger */}
                                            {!isSecretRevealed && !secretCode ? (
                                                <div className="bg-[#0b0c14] p-6 rounded border border-white/10 text-center space-y-3">
                                                    <div className="opacity-50 blur-sm select-none text-gray-400">
                                                        XXXXXXXXXXXXXXXXXXXX
                                                    </div>
                                                    <Button
                                                        variant="secondary"
                                                        className="w-full bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/50"
                                                        onClick={() => setRevealDialogOpen(true)}
                                                    >
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        กดเพื่อดูสินค้า (Click to Reveal)
                                                    </Button>
                                                    <p className="text-[10px] text-gray-500">
                                                        *เมื่อกดดูแล้วจะไม่สามารถขอคืนเงินได้ (Non-refundable after reveal)
                                                    </p>
                                                </div>
                                            ) : (
                                                // REVEALED CONTENT
                                                <div className="bg-[#0b0c14] rounded border border-white/10 overflow-hidden">
                                                    {secretData?.secret_type === 'account' && secretData.credential_data ? (
                                                        <div className="p-4 flex flex-col gap-4">
                                                            {/* Username Block */}
                                                            <div className="bg-[#13151f] rounded-lg border border-white/10 p-3 shadow-sm">
                                                                <label className="text-xs text-indigo-400 uppercase tracking-wider font-bold mb-2 block flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                    Username / ID
                                                                </label>
                                                                <div className="flex items-center gap-3">
                                                                    <code className="text-white font-mono text-base flex-1 break-all bg-black/30 p-2 rounded border border-white/5">
                                                                        {secretData.credential_data.username}
                                                                    </code>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="shrink-0 h-10 px-4 hover:bg-indigo-500/20 hover:text-indigo-300"
                                                                        onClick={() => { navigator.clipboard.writeText(secretData.credential_data.username); toast.success('Copied Username') }}
                                                                    >
                                                                        <Copy className="h-4 w-4 mr-2" /> Copy
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Password Block */}
                                                            <div className="bg-[#13151f] rounded-lg border border-white/10 p-3 shadow-sm">
                                                                <label className="text-xs text-green-400 uppercase tracking-wider font-bold mb-2 block flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                    Password
                                                                </label>
                                                                <div className="flex items-center gap-3">
                                                                    <code className="text-white font-mono text-base flex-1 break-all bg-black/30 p-2 rounded border border-white/5">
                                                                        {secretData.credential_data.password}
                                                                    </code>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="shrink-0 h-10 px-4 hover:bg-green-500/20 hover:text-green-300"
                                                                        onClick={() => { navigator.clipboard.writeText(secretData.credential_data.password); toast.success('Copied Password') }}
                                                                    >
                                                                        <Copy className="h-4 w-4 mr-2" /> Copy
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Note Block */}
                                                            {secretData.credential_data.note && (
                                                                <div className="bg-[#13151f]/50 rounded-lg border border-white/5 p-3">
                                                                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Note</label>
                                                                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{secretData.credential_data.note}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 font-mono text-sm break-all relative group whitespace-pre-wrap">
                                                            {secretCode}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-white"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(secretCode || '')
                                                                    toast.success('Copied to clipboard')
                                                                }}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge for Instant Delivery - Always Completed effectively */}
                                        {order.status === 'completed' && (
                                            <div className="bg-green-500/10 text-green-400 p-4 rounded-xl text-center text-sm font-medium border border-green-500/20 flex flex-col items-center gap-2">
                                                <CheckCircle className="h-8 w-8 text-green-400 mb-1" />
                                                <span>รายการเสร็จสมบูรณ์</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* 2. STANDARD DELIVERY LOGIC */
                                    <div className="space-y-4">
                                        {/* Escrowed -> Waiting for Seller */}
                                        {order.status === 'escrowed' && (
                                            <>
                                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-200">
                                                    <div className="font-bold mb-2 flex items-center gap-2 text-orange-100">
                                                        <Clock className="h-4 w-4" />
                                                        {isSeller ? 'ส่งมอบสินค้า' : 'รอผู้ขายส่งของ'}
                                                    </div>
                                                    <p className="text-xs opacity-90 leading-relaxed text-orange-200/80">
                                                        {isSeller
                                                            ? 'เงินบัญชีกลางแล้ว ส่งสินค้าให้ผู้ซื้อในแชท เสร็จแล้วกด "แจ้งส่งมอบ"'
                                                            : 'ผู้ขายกำลังเตรียมสินค้า...'}
                                                    </p>
                                                </div>
                                                {isSeller && (
                                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 text-base shadow-lg shadow-indigo-500/20" onClick={() => updateStatus('delivered')}>
                                                        <Package className="mr-2 h-5 w-5" /> แจ้งส่งมอบงาน/ของ
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {/* Delivered -> Waiting for Buyer */}
                                        {order.status === 'delivered' && (
                                            <>
                                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-200">
                                                    <div className="font-bold mb-2 flex items-center gap-2 text-orange-100">
                                                        <ShieldCheck className="h-4 w-4" />
                                                        {isBuyer ? 'ตรวจสอบสินค้า' : 'รอผู้ซื้อตรวจสอบ'}
                                                    </div>
                                                    <p className="text-xs opacity-90 leading-relaxed text-orange-200/80">
                                                        {isBuyer
                                                            ? 'ตรวจสอบสินค้าให้ถูกต้องก่อนกดยืนยัน (เงินจะโอนให้ผู้ขายทันที)'
                                                            : 'ผู้ซื้อกำลังตรวจสอบสินค้า ระบบจะโอนเงินให้คุณเมื่อผู้ซื้อยืนยัน'}
                                                    </p>
                                                </div>
                                                {isBuyer && (
                                                    <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base shadow-lg shadow-orange-500/20" onClick={() => updateStatus('completed')}>
                                                        <ShieldCheck className="mr-2 h-5 w-5" /> ยืนยันรับของ (โอนเงินให้ผู้ขาย)
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {/* Completed */}
                                        {order.status === 'completed' && (
                                            <div className="bg-green-500/10 text-green-400 p-4 rounded-xl text-center text-sm font-medium border border-green-500/20 flex flex-col items-center gap-2">
                                                <CheckCircle className="h-8 w-8 text-green-400 mb-1" />
                                                <span>รายการเสร็จสมบูรณ์</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Common: Review / Dispute for Completed Orders */}
                                {order.status === 'completed' && (!isInstant || isSecretRevealed) && (
                                    <div className="space-y-4 pt-2">
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

                                        <div className="pt-2 border-t border-white/5">
                                            <Button variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDispute()}>
                                                <AlertTriangle className="mr-2 h-4 w-4" /> แจ้งปัญหา (Report Issue)
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Disputes Display */}
                                {order.status === 'disputed' && (
                                    <div className="bg-red-500/10 text-red-400 p-4 rounded text-center text-sm font-medium border border-red-500/20">
                                        รายการนี้กำลังถูกตรวจสอบ (Disputed)
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-blue-500/10 p-3 rounded text-xs text-blue-300 flex items-start gap-2 border border-blue-500/20">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <div>
                                เงินปลอดภัยในระบบ Escrow จนกว่าผู้ซื้อจะกดยืนยันรับของ
                            </div>
                        </div>
                    </CardContent>
                </Card >

                <Card className="flex-1 bg-[#1e202e] border-white/5 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">รายละเอียด</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <div className="font-semibold text-gray-400">สินค้า/บริการ</div>
                            <Link href={`/listing/${order.listings.id}`} className="font-medium text-white hover:text-indigo-400 hover:underline transition-colors block">
                                {order.listings.title_th}
                                <ExternalLink className="inline-block ml-1 h-3 w-3 mb-0.5" />
                            </Link>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-400">ราคา</div>
                            <div className="font-medium text-lg text-indigo-400">{formatPrice(order.amount)}</div>
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
            </div >

            {/* Right: Chat System (Updated UI) */}
            < div className="flex-1 flex flex-col bg-[#1e202e] border border-white/5 rounded-2xl shadow-xl h-full overflow-hidden" >
                <div className="p-4 border-b border-white/5 bg-[#13151f] flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-400" /> ห้องสนทนา
                    </h3>
                    <div className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs rounded-full font-medium">
                        ห้ามแลกเปลี่ยน Line/เบอร์โทร เพื่อความปลอดภัย
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0b0c14] min-h-0 overscroll-contain" ref={messagesContainerRef}>
                    {messages.map((msg, index) => {
                        const isMe = msg.sender_id === currentUser?.id

                        // Date Header Logic
                        const formatDateHeader = (dateStr: string) => {
                            const date = new Date(dateStr)
                            const today = new Date()
                            if (date.toDateString() === today.toDateString()) return 'Today'
                            return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                        }
                        const showHeader = index === 0 || formatDateHeader(msg.created_at) !== formatDateHeader(messages[index - 1].created_at)

                        return (
                            <div key={msg.id} className="flex flex-col mb-4">
                                {showHeader && (
                                    <div className="flex justify-center w-full my-4">
                                        <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-[#13151f] px-2 py-1 rounded-full border border-white/5">
                                            {formatDateHeader(msg.created_at)}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex max-w-[70%] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm break-words leading-relaxed ${isMe
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-[#2a2d3e] text-gray-200 rounded-bl-none border border-white/5'
                                            }`}>

                                            {/* Image Support */}
                                            {(msg.message_type === 'image' || msg.media_url) ? (
                                                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                                        <img src={msg.media_url} alt="Shared" className="max-w-full h-auto" />
                                                    </a>
                                                </div>
                                            ) : null}

                                            {/* Text Content */}
                                            {(msg.content && msg.message_type !== 'image') && (
                                                <p>{msg.content}</p>
                                            )}

                                            {/* Fallback for old schema */}
                                            {msg.message_th && !msg.content && (
                                                <p>{msg.message_th}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timestamp & Status - Outside Bubble */}
                                    <div className={`text-[10px] mt-1 flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'} text-gray-500`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && (
                                            <div className="flex items-center gap-1">
                                                {msg.is_read && <span className="text-indigo-400 font-medium">Read</span>}
                                                <span className={msg.is_read ? 'text-indigo-400' : 'text-gray-600'}>
                                                    {msg.is_read ? (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3">
                                                            <path d="M18 6L7 17L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M22 10L12 20L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-white/5 bg-[#13151f] relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {/* Image Preview - Can repurpose the 'uploading' state or add a new preview state if strict preview needed before send. 
                        For now, since handleImageUpload sends immediately in current logic, we might want to change that?
                        User said "exact like regular chat". Regular chat allows preview -> send.
                        Current logic uploads & sends immediately on file select. 
                        Refactoring to Preview -> Send flow to match Main Chat perfectly requires logic change.
                        The user asked for UI similarity primarily ("chat turns out not showing...").
                        Let's stick to the immediate send for now unless user complains, or strictly match. 
                        The Main Chat code has `handleImageSelect` -> `setImagePreview`. 
                        Let's check if I can easily add preview logic. 
                        Yes, I can add `imagePreview` state.
                    */}

                    <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={`text-gray-400 hover:text-white ${uploading ? 'animate-pulse' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Package className="h-5 w-5" />
                        </Button>
                        <Input
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value)

                                // Broadcast typing
                                if (currentUser && conversationId) {
                                    const now = Date.now()
                                    if (now - lastTypedRef.current > 2000) {
                                        lastTypedRef.current = now
                                        supabase.channel(`order-chat-${conversationId}`).send({
                                            type: 'broadcast',
                                            event: 'typing',
                                            payload: { userId: currentUser.id }
                                        })
                                    }
                                }
                            }}
                            placeholder="พิมพ์ข้อความ..."
                            className="flex-1 bg-[#0b0c14] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 rounded-full px-4"
                        />
                        {/* Typing Indicator */}
                        {isPartnerTyping && (
                            <div className="absolute -top-6 left-4 text-xs text-gray-500 animate-pulse flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-0"></span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                                Partner is typing...
                            </div>
                        )}
                        <Button type="submit" size="icon" disabled={!newMessage.trim() && !uploading} className="bg-indigo-600 hover:bg-indigo-500 rounded-full h-10 w-10 shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div >

            {/* Dialogs */}
            < AlertDialog open={!!pendingStatus
            } onOpenChange={(open) => !open && setPendingStatus(null)}>
                <AlertDialogContent className="bg-[#1e202e] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการเปลี่ยนแปลงสถานะ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะเป็น {pendingStatus === 'delivered' ? 'ส่งมอบแล้ว' : pendingStatus === 'completed' ? 'ยืนยันรับของ' : pendingStatus}
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
            </AlertDialog >

            {/* Reveal Secret Dialog */}
            < AlertDialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen} >
                <AlertDialogContent className="bg-[#1e202e] border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
                            <ShieldCheck className="h-5 w-5" />
                            ยืนยันการเปิดดูสินค้า (Confirm Reveal)
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            เมื่อเปิดดูสินค้าแล้ว <span className="text-white font-bold">จะไม่สามารถขอคืนเงินได้</span> ยกเว้นสินค้าใช้งานไม่ได้จริง
                            <br /><br />
                            Once revealed, this item is <span className="text-white font-bold">non-refundable</span> unless proven defective.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={async (e) => {
                                e.preventDefault() // Prevent auto-close if we want to wait, but AlertDialog action usually closes. 
                                // Better to run logic then close? Or close then run?
                                // Let's run logic.
                                try {
                                    const { data: sData, error } = await supabase.rpc('reveal_secret', { order_uuid: id })
                                    if (error) throw error

                                    if (sData) {
                                        setSecretCode(sData.content)
                                        setSecretData(sData)
                                        setIsSecretRevealed(true)
                                        toast.success('Your secret has been revealed!')
                                        // Auto-Prompt Review after 2.5 seconds
                                        setTimeout(() => {
                                            if (!existingReview) {
                                                setShowReviewModal(true)
                                            }
                                        }, 2500)
                                    }
                                } catch (error) {
                                    console.error('Reveal error', error)
                                    toast.error('Failed to reveal secret')
                                }
                                setRevealDialogOpen(false)
                            }}
                        >
                            ยอมรับและเปิดดู (Accept & Reveal)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                <DialogContent className="bg-[#1e202e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>แจ้งปัญหา (Report Issue)</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            กรุณาระบุรายละเอียดปัญหาเพื่อให้เจ้าหน้าที่ตรวจสอบ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">หัวข้อปัญหา (Reason)</label>
                            <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                                <SelectTrigger className="bg-[#0b0c14] border-white/10 text-white">
                                    <SelectValue placeholder="เลือกหัวข้อปัญหา..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Item Not Working">สินค้าใช้งานไม่ได้ (Item Not Working)</SelectItem>
                                    <SelectItem value="Invalid Credentials">รหัสผ่านผิด (Invalid Credentials)</SelectItem>
                                    <SelectItem value="Item Not As Described">สินค้าไม่ตรงปก (Item Not As Described)</SelectItem>
                                    <SelectItem value="Other">อื่นๆ (Other)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">รายละเอียดเพิ่มเติม (Details)</label>
                            <Input
                                value={disputeReason}
                                onChange={e => setDisputeReason(e.target.value)}
                                placeholder="อธิบายปัญหาที่พบ..."
                                className="bg-[#0b0c14] border-white/10 text-white"
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDisputeOpen(false)}>ยกเลิก</Button>
                            <Button variant="destructive" onClick={submitDispute} disabled={!disputeCategory || !disputeReason.trim()}>ส่งรายงาน</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Auto-Prompt Review Dialog */}
            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogContent className="bg-[#1e202e] border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl flex flex-col items-center gap-2">
                            <Sparkles className="h-8 w-8 text-yellow-500 fill-yellow-500/20" />
                            How was your experience?
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400">
                            You just received your item! Please take a moment to rate the seller.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-4 gap-4">
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform hover:scale-110 focus:outline-none">
                                    <Star className={`h-8 w-8 ${s <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                                </button>
                            ))}
                        </div>
                        <Input
                            placeholder="Write a review (optional)..."
                            className="bg-[#0b0c14] border-white/10 text-white w-full"
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="sm:justify-center gap-2">
                        <Button variant="ghost" onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-white">
                            Maybe Later
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 min-w-[120px]" onClick={(e) => {
                            submitReview(e);
                            setShowReviewModal(false);
                        }}>
                            Submit Review
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    )
}
