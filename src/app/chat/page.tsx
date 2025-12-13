'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send, Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
    id: string
    display_name: string
    avatar_url: string
}

interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
    is_read: boolean
}

interface Conversation {
    partner: Profile
    lastMessage: Message
    unreadCount: number
}

import { Suspense } from 'react'

// ... existing imports ...

function ChatContent() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [user, setUser] = useState<any>(null)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loadingMessages, setLoadingMessages] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)

    // Initial Load & Auth Check
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // Check URL params for direct chat (e.g. from listing page)
            const partnerId = searchParams.get('seller_id')
            if (partnerId && partnerId !== user.id) {
                setSelectedPartnerId(partnerId)
            }

            fetchConversations(user.id)
        }
        init()
    }, [])

    // ... (rest of the logic remains exactly the same, creating fetchConversations, useEffect for messages, handleSendMessage etc.)
    // Note: I will need to copy the entire function body of the original component into ChatContent

    // Fetch Conversations
    const fetchConversations = async (userId: string) => {
        const { data: msgs } = await supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false })

        if (!msgs) return

        const convoMap = new Map<string, Conversation>()

        msgs.forEach((msg: any) => {
            const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
            const partnerProfile = msg.sender_id === userId ? msg.receiver : msg.sender

            if (!convoMap.has(partnerId)) {
                convoMap.set(partnerId, {
                    partner: partnerProfile,
                    lastMessage: {
                        id: msg.id,
                        sender_id: msg.sender_id,
                        receiver_id: msg.receiver_id,
                        content: msg.content,
                        created_at: msg.created_at,
                        is_read: msg.is_read
                    },
                    unreadCount: 0
                })
            }

            const convo = convoMap.get(partnerId)!
            if (msg.receiver_id === userId && !msg.is_read) {
                convo.unreadCount++
            }
        })

        setConversations(Array.from(convoMap.values()))
    }

    // Fetch Messages when Partner Selected
    useEffect(() => {
        if (!selectedPartnerId || !user) return

        const fetchMessages = async () => {
            setLoadingMessages(true)
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedPartnerId}),and(sender_id.eq.${selectedPartnerId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            setLoadingMessages(false)

            // Mark as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', selectedPartnerId)
                .eq('receiver_id', user.id)
                .is('is_read', false)
        }

        fetchMessages()

        // Realtime Subscription
        const channel = supabase
            .channel('chat_room')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, (payload) => {
                const newMsg = payload.new as Message
                if (newMsg.sender_id === selectedPartnerId) {
                    setMessages(prev => [...prev, newMsg])
                }
                // Refresh conversations list to update 'last message'
                fetchConversations(user.id)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPartnerId, user])

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !selectedPartnerId || !user) return

        const msgContent = newMessage.trim()
        setNewMessage('')

        // Optimistic UI
        const tempId = Date.now().toString()
        const tempMsg: Message = {
            id: tempId,
            sender_id: user.id,
            receiver_id: selectedPartnerId,
            content: msgContent,
            created_at: new Date().toISOString(),
            is_read: false
        }
        setMessages(prev => [...prev, tempMsg])

        const { error } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: selectedPartnerId,
            content: msgContent
        })

        if (error) {
            console.error('Failed to send', error)
            // Rollback optimistic update
            setMessages(prev => prev.filter(m => m.id !== tempId))
        } else {
            fetchConversations(user.id)
        }
    }

    // Helper to get selected partner profile
    const selectedPartnerProfile = conversations.find(c => c.partner.id === selectedPartnerId)?.partner

    return (
        <div className="container mx-auto py-6 h-[calc(100vh-80px)]">
            <div className="grid grid-cols-1 md:grid-cols-4 h-full gap-6 bg-[#1e202e] rounded-xl overflow-hidden border border-white/5">

                {/* Sidebar */}
                <div className="md:col-span-1 bg-[#13151f] border-r border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-xl font-bold text-white mb-4">ข้อความ (Chats)</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input placeholder="ค้นหา..." className="pl-9 bg-[#0b0c14] border-white/10 text-white" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(convo => (
                            <div
                                key={convo.partner.id}
                                onClick={() => setSelectedPartnerId(convo.partner.id)}
                                className={cn(
                                    "p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/5",
                                    selectedPartnerId === convo.partner.id ? "bg-white/5 border-l-4 border-indigo-500" : "border-l-4 border-transparent"
                                )}
                            >
                                <Avatar className="w-10 h-10 border border-white/10">
                                    <AvatarImage src={convo.partner.avatar_url} />
                                    <AvatarFallback>{convo.partner.display_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-medium text-white truncate">{convo.partner.display_name}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(convo.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400 truncate w-32">
                                            {convo.lastMessage.sender_id === user?.id ? 'คุณ: ' : ''}{convo.lastMessage.content}
                                        </span>
                                        {convo.unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                {convo.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {conversations.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                ยังไม่มีการสนทนา
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="md:col-span-3 flex flex-col bg-[#1e202e]">
                    {selectedPartnerId ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border border-white/10">
                                        <AvatarImage src={selectedPartnerProfile?.avatar_url} />
                                        <AvatarFallback>{selectedPartnerProfile?.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-bold text-white">{selectedPartnerProfile?.display_name || 'Loading...'}</div>
                                        <div className="text-xs text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            ออนไลน์
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === user?.id
                                    return (
                                        <div key={index} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed",
                                                isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-[#2a2d3e] text-gray-200 rounded-bl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    )
                                })}
                                {messages.length === 0 && !loadingMessages && (
                                    <div className="text-center text-gray-500 mt-10">
                                        เริ่มการสนทนากับ {selectedPartnerProfile?.display_name}
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-white/5 bg-[#13151f]">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="พิมพ์ข้อความ..."
                                        className="bg-[#0b0c14] border-white/10 text-white focus-visible:ring-indigo-500"
                                    />
                                    <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-500" disabled={!newMessage.trim()}>
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 opacity-50" />
                            </div>
                            <p>เลือกการสนทนาเพื่อเริ่มแชท</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Loading chat...</div>}>
            <ChatContent />
        </Suspense>
    )
}
