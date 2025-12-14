'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Search, MessageSquare, Image as ImageIcon, MoreVertical, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getOrCreateConversation, deleteConversation, sendMessage } from '@/app/actions/chat'

interface Profile {
    id: string
    display_name: string
    avatar_url: string
    last_seen?: string
}

interface Message {
    id: string
    sender_id: string
    content: string
    created_at: string
    is_read: boolean
    message_type: 'text' | 'image'
    media_url?: string
}

interface Conversation {
    id: string
    partner: Profile
    last_message_preview: string
    updated_at: string
    unread_count: number
}

export function ChatContent() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [user, setUser] = useState<any>(null)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // State for Image Preview
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isPartnerTyping, setIsPartnerTyping] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Scroll to bottom
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isPartnerTyping, imagePreview])

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
            const sellerId = searchParams.get('seller_id')
            if (sellerId && sellerId !== user.id) {
                try {
                    const convId = await getOrCreateConversation(sellerId)
                    setSelectedConversationId(convId)
                    // Remove param to clean URL
                    router.replace('/chat')
                } catch (error) {
                    console.error(error)
                    toast.error('Could not open chat')
                }
            }

            fetchConversations(user.id)

            fetchConversations(user.id)
        }
        init()
    }, [])

    // Fetch Conversations from DB
    const fetchConversations = async (userId: string) => {
        const { data: convs, error } = await supabase
            .from('conversations')
            .select(`
                id,
                last_message_preview,
                updated_at,
                hidden_for,
                participant1:profiles!participant1_id(id, display_name, avatar_url, last_seen),
                participant2:profiles!participant2_id(id, display_name, avatar_url, last_seen)
            `)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error fetching conversations:', error)
            toast.error(`Error loading chats: ${error.message} (${error.code})`)
            return
        }

        if (!convs) return

        // Fetch unread counts
        const { data: unreadData } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('receiver_id', userId)
            .eq('is_read', false)

        // Count per conversation
        const unreadMap: Record<string, number> = {}
        unreadData?.forEach((msg: any) => {
            unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1
        })

        // Filter out hidden chats and format
        const formatted: Conversation[] = convs
            .filter((c: any) => !c.hidden_for?.includes(userId)) // Client-side soft delete filter
            .map((c: any) => {
                const partner = c.participant1.id === userId ? c.participant2 : c.participant1
                return {
                    id: c.id,
                    partner: partner,
                    last_message_preview: c.last_message_preview || 'Start a conversation',
                    updated_at: c.updated_at,
                    unread_count: unreadMap[c.id] || 0
                }
            })

        setConversations(formatted)
    }

    // Typing Status Map
    const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({})
    const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

    // Subscribe to ALL conversations for Sidebar (Typer + Last Msg + Unread Counts)
    const conversationIds = conversations.map(c => c.id).sort().join(',')

    useEffect(() => {
        if (!user || conversations.length === 0) return

        console.log('ChatPage: Subscribing to sidebar channels', conversations.length)

        const channels = conversations.map(convo => {
            return supabase
                .channel(`chat:${convo.id}`)
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.userId !== user.id) {
                        setTypingStatus(prev => ({ ...prev, [convo.id]: true }))

                        if (typingTimeouts.current[convo.id]) clearTimeout(typingTimeouts.current[convo.id])

                        typingTimeouts.current[convo.id] = setTimeout(() => {
                            setTypingStatus(prev => ({ ...prev, [convo.id]: false }))
                        }, 3000)
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
                    // Update conversation list via fetch to get new message snippet and ordering
                    fetchConversations(user.id)
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload) => {
                    // Listen for read updates to clear sidebar bubbles locally if marked read elsewhere
                    // Or just refresh to be safe
                    console.log('ChatPage: Sidebar UPDATE received', payload)
                    fetchConversations(user.id)
                })
                .subscribe()
        })

        return () => {
            console.log('ChatPage: Unsubscribing sidebar channels')
            channels.forEach(ch => supabase.removeChannel(ch))
        }
    }, [conversationIds, user?.id])


    // Specific Subscription for Active Chat (Read Receipts + Messages list)
    useEffect(() => {
        if (!selectedConversationId || !user) return

        const channel = supabase.channel(`active-chat-${selectedConversationId}`)

        // 1. Mark as read immediately in UI (optimistic) and DB
        const markReadAndClearSidebar = async () => {
            // Optimistically clear sidebar count
            setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unread_count: 0 } : c))

            // Send Broadcast: "I have read this chat"
            // This notifies the other user instantly without waiting for DB replication
            await channel.send({
                type: 'broadcast',
                event: 'read-receipt',
                payload: { userId: user.id, conversationId: selectedConversationId }
            })

            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', selectedConversationId)
                .neq('sender_id', user.id)
                .eq('is_read', false)
        }
        markReadAndClearSidebar()

        const loadMessages = async () => {
            setLoadingMessages(true)
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConversationId)
                .order('created_at', { ascending: true })

            if (data) {
                setMessages(data)
            }
            setLoadingMessages(false)
        }
        loadMessages()

        // SUBSCRIBE
        channel
            // Listen for Broadcast Read Receipts
            .on('broadcast', { event: 'read-receipt' }, (payload) => {
                console.log('ChatPage: Read Receipt Broadcast received', payload)
                // If the OTHER user read our messages, mark all as read locally
                if (payload.payload.userId !== user.id) {
                    setMessages(prev => prev.map(m => (!m.is_read ? { ...m, is_read: true } : m)))
                }
            })
            // INSERT: New Messages
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversationId}` }, async (payload) => {
                const newMsg = payload.new as Message
                if (newMsg.sender_id !== user.id) {
                    // We received a message while active -> Mark read immediately
                    await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id)
                    newMsg.is_read = true

                    // Notify sender we read it
                    channel.send({
                        type: 'broadcast',
                        event: 'read-receipt',
                        payload: { userId: user.id, conversationId: selectedConversationId }
                    })
                }
                if (newMsg.sender_id === user.id) return
                setMessages(prev => [...prev, newMsg])
                fetchConversations(user.id)
            })
            // UPDATE: DB Fallback for Read Receipts
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                console.log('ChatPage: UPDATE payload active chat:', payload)
                const updatedMsg = payload.new as Message
                if (updatedMsg.is_read) {
                    setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, is_read: true } : m))
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Retrigger mark read to ensure broadcast goes through if needed
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedConversationId, user])

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const previewUrl = URL.createObjectURL(file)
        setImageFile(file)
        setImagePreview(previewUrl)
        // Reset file input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const clearImage = () => {
        setImageFile(null)
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }
    const handleTyping = async () => {
        if (!selectedConversationId || !user) return

        await supabase.channel(`chat:${selectedConversationId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id }
        })
    }

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if ((!newMessage.trim() && !imageFile) || !selectedConversationId || !user) return

        const content = newMessage.trim()
        const fileToSend = imageFile

        // Clear input immediately
        setNewMessage('')
        clearImage()

        let optimisticMsg: Message = {
            id: Date.now().toString(),
            sender_id: user.id,
            content: content,
            created_at: new Date().toISOString(),
            is_read: false,
            message_type: 'text'
        }

        // Logic for Image Upload
        if (fileToSend) {
            optimisticMsg.message_type = 'image'
            optimisticMsg.media_url = imagePreview || undefined // Use preview as optimistic url
            optimisticMsg.content = 'Sent an image'
        }

        setMessages(prev => [...prev, optimisticMsg])

        try {
            let mediaUrl = undefined

            if (fileToSend) {
                const fileName = `${Date.now()}-${fileToSend.name}`
                const { data, error } = await supabase.storage
                    .from('chat-attachments')
                    .upload(`${selectedConversationId}/${fileName}`, fileToSend)

                if (error) throw error

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(data.path)

                mediaUrl = publicUrl
            }

            // Send actual message
            await sendMessage(selectedConversationId, content || (mediaUrl ? 'Sent an image' : ''), mediaUrl ? 'image' : 'text', mediaUrl)

            // Refresh sidebar to show latest message
            fetchConversations(user.id)

        } catch (error) {
            console.error(error)
            toast.error('Failed to send message')
            // Rollback
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        }
    }

    const handleDeleteChat = async () => {
        if (!selectedConversationId) return
        if (confirm('Are you sure you want to delete this chat? It will disappear from your list.')) {
            await deleteConversation(selectedConversationId)
            setSelectedConversationId(null)
            if (user) fetchConversations(user.id)
            toast.success('Chat deleted')
        }
    }

    // Helper: Format Date for Headers
    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr)
        const today = new Date()
        if (date.toDateString() === today.toDateString()) return 'Today'
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }

    // State for single conversation fallback
    const [singleConversation, setSingleConversation] = useState<Conversation | null>(null)
    const [loadingConversation, setLoadingConversation] = useState(false)

    // Derived active conversation
    const activeConvo = conversations.find(c => c.id === selectedConversationId) || singleConversation

    // Fetch single conversation if selected but missing from list
    useEffect(() => {
        if (!selectedConversationId || activeConvo) return

        const fetchSingle = async () => {
            setLoadingConversation(true)
            const { data: c, error } = await supabase
                .from('conversations')
                .select(`
                    id,
                    last_message_preview,
                    updated_at,
                    hidden_for,
                    participant1:profiles!participant1_id(id, display_name, avatar_url, last_seen),
                    participant2:profiles!participant2_id(id, display_name, avatar_url, last_seen)
                `)
                .eq('id', selectedConversationId)
                .single()

            if (error) {
                console.error('Error fetching single conversation:', error)
                toast.error('Could not load chat details')
            } else if (c) {
                // Handle potential array return from Supabase relations
                const p1 = Array.isArray(c.participant1) ? c.participant1[0] : c.participant1
                const p2 = Array.isArray(c.participant2) ? c.participant2[0] : c.participant2

                const partner = p1.id === user?.id ? p2 : p1
                setSingleConversation({
                    id: c.id,
                    partner: partner,
                    last_message_preview: c.last_message_preview || 'Start a conversation',
                    updated_at: c.updated_at,
                    unread_count: 0
                })
            }
            setLoadingConversation(false)
        }

        if (user) fetchSingle()
    }, [selectedConversationId, activeConvo, user])

    // ... rest of loading/fetching messages ...
    const getPresenceStatus = (lastSeen?: string) => {
        if (!lastSeen) return { text: 'Offline', color: 'text-gray-500' }
        const diff = (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 / 60 // mins
        if (diff < 2) return { text: 'Online', color: 'text-green-500' }
        if (diff < 60) return { text: `Last seen ${Math.floor(diff)}m ago`, color: 'text-gray-400' }
        return { text: 'Offline', color: 'text-gray-500' }
    }

    const presence = activeConvo ? getPresenceStatus(activeConvo.partner.last_seen) : null

    return (
        <div className="container mx-auto py-4 md:py-6 h-[calc(100dvh-70px)] md:h-[calc(100vh-80px)] overscroll-none block">
            <div className="grid grid-cols-1 md:grid-cols-4 h-full gap-4 md:gap-6 bg-[#1e202e] rounded-xl overflow-hidden border border-white/5">

                {/* Sidebar */}
                <div className={`${selectedConversationId ? 'hidden md:flex' : 'flex'} md:col-span-1 bg-[#13151f] border-r border-white/5 flex-col h-full`}>
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
                                key={convo.id}
                                onClick={() => setSelectedConversationId(convo.id)}
                                className={cn(
                                    "p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/5",
                                    selectedConversationId === convo.id ? "bg-white/5 border-l-4 border-indigo-500" : "border-l-4 border-transparent"
                                )}
                            >
                                <Avatar className="w-10 h-10 border border-white/10">
                                    <AvatarImage src={convo.partner.avatar_url} />
                                    <AvatarFallback>{convo.partner.display_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`font-medium truncate ${convo.unread_count > 0 ? 'text-white font-bold' : 'text-gray-300'}`}>
                                            {convo.partner.display_name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(convo.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm truncate w-32 ${convo.unread_count > 0 ? 'text-white font-semibold' : 'text-gray-400'} ${typingStatus[convo.id] ? 'text-green-400 font-medium italic animate-pulse' : ''}`}>
                                            {typingStatus[convo.id] ? 'กำลังพิมพ์...' : convo.last_message_preview}
                                        </span>
                                        {convo.unread_count > 0 && (
                                            <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                                {convo.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`${!selectedConversationId ? 'hidden md:flex' : 'flex'} md:col-span-3 flex-col bg-[#1e202e] relative h-full overflow-hidden`}>
                    {selectedConversationId && activeConvo ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#13151f]/50 flex-none z-20">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversationId(null)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                    <Avatar className="w-10 h-10 border border-white/10">
                                        <AvatarImage src={activeConvo.partner.avatar_url} />
                                        <AvatarFallback>{activeConvo.partner.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-bold text-white">{activeConvo.partner.display_name}</div>
                                        <div className={cn("text-xs flex items-center gap-1", presence?.color)}>
                                            {presence?.text === 'Online' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                                            {presence?.text}
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-5 h-5 text-gray-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#13151f] border-white/10 text-white">
                                        <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-500/10" onClick={handleDeleteChat}>
                                            <Trash2 className="w-4 h-4 mr-2" /> ลบแชท (Delete)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-contain" ref={scrollRef}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender_id === user?.id
                                    const showHeader = index === 0 || formatDateHeader(msg.created_at) !== formatDateHeader(messages[index - 1].created_at)

                                    return (
                                        <div key={msg.id} className={cn("flex flex-col mb-4", isMe ? "items-end" : "items-start")}>
                                            {showHeader && (
                                                <div className="flex justify-center w-full my-4">
                                                    <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-[#13151f] px-2 py-1 rounded-full border border-white/5">
                                                        {formatDateHeader(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={cn("flex max-w-[70%]", isMe ? "justify-end" : "justify-start")}>
                                                <div className={cn(
                                                    "p-3 rounded-2xl text-sm leading-relaxed break-words",
                                                    isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-[#2a2d3e] text-gray-200 rounded-bl-none"
                                                )}>
                                                    {msg.message_type === 'image' && msg.media_url ? (
                                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                            <img src={msg.media_url} alt="Shared image" className="max-w-full h-auto" />
                                                        </div>
                                                    ) : (
                                                        <p>{msg.content}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Timestamp & Read Status - Outside Bubble */}
                                            <div className="flex items-center gap-1 mt-1 px-1">
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    <span className={cn("text-[10px]", msg.is_read ? "text-indigo-400" : "text-gray-600")}>
                                                        {/* Double Tick SVG */}
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3">
                                                            <path d="M18 6L7 17L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M22 10L12 20L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                {typingStatus[selectedConversationId] && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="bg-[#2a2d3e] p-3 rounded-2xl rounded-bl-none flex items-center gap-1">
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-white/5 bg-[#13151f] flex-none z-10">

                                {/* Image Preview Area */}
                                {imagePreview && (
                                    <div className="mb-4 flex items-center gap-4 bg-white/5 p-2 rounded-lg w-fit">
                                        <div className="relative w-20 h-20 rounded-md overflow-hidden border border-white/10">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-400 max-w-[150px] truncate">{imageFile?.name}</span>
                                            <Button type="button" variant="ghost" size="sm" className="h-6 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={clearImage}>
                                                <X className="w-3 h-3 mr-1" /> Remove
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSend} className="flex gap-2 items-end">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn("text-gray-400 hover:text-white", imageFile ? "text-indigo-400" : "")}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </Button>
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value)
                                            handleTyping()
                                        }}
                                        placeholder="พิมพ์ข้อความ..."
                                        className="bg-[#0b0c14] border-white/10 text-white focus-visible:ring-indigo-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSend()
                                            }
                                        }}
                                    />
                                    <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-500" disabled={(!newMessage.trim() && !imageFile)}>
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            {loadingConversation ? (
                                <div className="text-center">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p>Loading chat...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <MessageSquare className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>Select a conversation to start chatting</p>
                                </>
                            )}
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
