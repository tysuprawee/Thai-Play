'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ShoppingBag, Menu, User, Bell, Gamepad2, Coins, CreditCard, Sparkles, LogIn, PlusCircle, ChevronDown, LayoutDashboard, MessageSquare } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Mock Data for Mega Menu
const MEGA_MENU_ITEMS: Record<string, any[]> = {
    'account': [
        { name: 'RoV', icon: '⚔️', slug: 'rov', count: '1.2k' },
        { name: 'Valorant', icon: '🔫', slug: 'valorant', count: '850' },
        { name: 'Genshin Impact', icon: '✨', slug: 'genshin', count: '500' },
        { name: 'Free Fire', icon: '🔥', slug: 'free-fire', count: '300' },
        { name: 'Roblox', icon: '🧱', slug: 'roblox', count: '2.1k' },
        { name: 'Blox Fruits', icon: '🍎', slug: 'blox-fruits', count: '1.5k' },
    ],
    'item': [
        { name: 'Robux', icon: '💰', slug: 'robux', count: 'Fast' },
        { name: 'V-Bucks', icon: '🎮', slug: 'fortnite', count: 'Gift' },
        { name: 'Steam Wallet', icon: '💳', slug: 'steam', count: 'Code' },
        { name: 'Garena Shells', icon: '🐚', slug: 'garena', count: 'Code' },
    ],
    'service': [
        { name: 'ปั๊มแรงค์ RoV', icon: '🏆', slug: 'rov-rank', count: 'Pro' },
        { name: 'ปั๊มแรงค์ Val', icon: '🎖️', slug: 'val-rank', count: 'Radiant' },
        { name: 'รับฟาร์ม Blox', icon: '⚔️', slug: 'blox-farm', count: 'Fast' },
        { name: 'แก้แฮก/ลืมรหัส', icon: '🔐', slug: 'recovery', count: 'Secure' },
    ]
}

import { usePresence } from '@/lib/hooks/usePresence'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Navbar() {
    const { t } = useLanguage()
    usePresence()
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()
    const navRef = useRef<HTMLDivElement>(null)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        toast.success(t.common.success)
        setUser(null)
        setUserProfile(null)
        setIsAdmin(false)
        router.push('/')
        router.refresh()
    }

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            if (user) {
                // Fetch full profile (display_name, avatar_url, role)
                const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url, role').eq('id', user.id).single()

                if (profile) {
                    setUserProfile(profile)
                    if (profile.role === 'admin' || ['Exeria2142', 'suprawee2929'].includes(profile.display_name)) {
                        setIsAdmin(true)
                    }
                }
            }
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            // If session changes (e.g. login), we might want to re-fetch profile.
            if (session?.user) {
                supabase.from('profiles').select('display_name, avatar_url, role').eq('id', session.user.id).single().then(({ data }) => {
                    if (data) setUserProfile(data)
                })
            } else {
                setUserProfile(null)
            }
        })

        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)

        // Close menu when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setActiveMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            subscription.unsubscribe()
            window.removeEventListener('scroll', handleScroll)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadChatCount, setUnreadChatCount] = useState(0)

    // Derived state for unread notifications
    const unreadNotifCount = notifications.filter(n => !n.is_read).length

    const markNotificationsAsRead = async () => {
        if (unreadNotifCount === 0) return
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

        if (user) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
        }
    }

    // Initialize Data & Subscriptions
    useEffect(() => {
        if (!user) return

        const fetchData = async () => {
            // 1. Fetch Notifications
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (notifs) setNotifications(notifs)

            // 2. Fetch Chat Unread Count (General Messages)
            // Note: This needs 'is_read' on messages table which we just added. 
            // For now, let's assume it works or returns 0 if column missing.
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false)

            setUnreadChatCount(count || 0)
        }

        fetchData()

        // Realtime Subscriptions
        const channel = supabase
            .channel(`navbar-notifs-${user.id}`)
            // 1. Notifications Table Updates
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
                console.log('Navbar: Notification Update', payload)
                fetchData()
            })
            // 2. Messages INSERT (New Message)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new as any
                // For INSERT, all columns normally present
                if (newMsg.receiver_id === user.id) {
                    // Play Sound
                    try {
                        const audio = new Audio('/sounds/notification.mp3')
                        audio.play().catch(e => console.warn('Audio play prevented:', e))
                    } catch (err) {
                        console.error('Audio setup failed', err)
                    }

                    // Refresh counts
                    fetchData()
                    toast.info('New Message')
                }
            })
            // 3. Messages UPDATE (Read Status Change)
            // Note: We listen globally because 'receiver_id' might be missing in payload if Replica Identity is default
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                // We can't easily check receiver_id here without full replica identity.
                // But we can just refresh the count. It's a lightweight query.
                // We could try to OPTIMIZE by checking if we have unread messages? 
                // Simple approach: Always fetch.
                // console.log('Navbar: Global Message Update received, refreshing...')
                fetchData()
            })
            .subscribe((status) => {
                console.log('Navbar: Subscription Status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    // Time Ago Helper
    function timeAgo(dateString: string) {
        const date = new Date(dateString)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (seconds < 60) return 'Just now'
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
    }

    return (
        <nav
            ref={navRef}
            className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled || activeMenu ? 'bg-[#0f1016]/95 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent border-b border-transparent'}`}
            onMouseLeave={() => setActiveMenu(null)}
        >
            <div className="container mx-auto flex h-20 items-center justify-between px-4">

                {/* Logo & Main Nav */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl group-hover:shadow-glow transition-all">
                            <ShoppingBag className="h-6 w-6 text-white" />
                        </div>
                        <span className="hidden font-bold text-xl tracking-tight sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {t.navbar.brand}
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center space-x-1 h-20">
                        <NavItem
                            id="account"
                            href="/browse?type=account"
                            icon={<Gamepad2 className="w-4 h-4" />}
                            label={t.navbar.account}
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        <NavItem
                            id="item"
                            href="/browse?type=item"
                            icon={<Coins className="w-4 h-4" />}
                            label={t.navbar.item}
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        <NavItem
                            id="service"
                            href="/browse?type=service"
                            icon={<Sparkles className="w-4 h-4" />}
                            label={t.navbar.service}
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        {/* <NavItem
                            id="topup"
                            href="/browse?type=topup"
                            icon={<CreditCard className="w-4 h-4" />}
                            label={t.navbar.topup}
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        /> */}
                    </nav>
                </div>

                {/* Mobile Menu */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10" suppressHydrationWarning>
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-background/95 backdrop-blur border-r-white/10">
                        <Link href="/" className="flex items-center gap-2 mb-8">
                            <div className="bg-indigo-600 p-2 rounded-lg">
                                <ShoppingBag className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-lg text-white">{t.navbar.brand}</span>
                        </Link>
                        <div className="flex flex-col gap-2">
                            <MobileNavItem href="/browse?type=account" icon={<Gamepad2 />} label={t.navbar.buy_account} />
                            <MobileNavItem href="/browse?type=item" icon={<Coins />} label={t.navbar.buy_item} />
                            <MobileNavItem href="/browse?type=service" icon={<Sparkles />} label={t.navbar.hire_rank} />

                            {user ? (
                                <>
                                    <MobileNavItem href="/chat" icon={<MessageSquare />} label={t.navbar.chat} />
                                    <MobileNavItem href="/sell" icon={<PlusCircle />} label={t.navbar.sell} className="text-indigo-400" />
                                </>
                            ) : (
                                <>
                                    <div className="my-2 h-px bg-white/10" />
                                    <MobileNavItem href="/login" icon={<LogIn />} label={t.navbar.login} className="text-white" />
                                    <MobileNavItem href="/sell" icon={<PlusCircle />} label={t.navbar.sell} className="text-indigo-400" />
                                </>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Right Action */}
                <div className="flex items-center gap-3">
                    <Button variant="default" size="sm" className="hidden md:flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/20" asChild>
                        <Link href="/sell">
                            <PlusCircle className="mr-2 h-4 w-4" /> {t.navbar.sell}
                        </Link>
                    </Button>

                    {isAdmin && (
                        <Button variant="ghost" size="sm" className="hidden md:flex text-indigo-400 hover:text-indigo-300 hover:bg-white/10" asChild>
                            <Link href="/admin">
                                <LayoutDashboard className="mr-2 h-4 w-4" /> {t.navbar.admin}
                            </Link>
                        </Button>
                    )}

                    {user ? (
                        <>
                            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10" asChild>
                                <Link href="/chat">
                                    <MessageSquare className="h-5 w-5" />
                                    {unreadChatCount > 0 && (
                                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 shadow-md animate-pulse" />
                                    )}
                                </Link>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10" onClick={markNotificationsAsRead}>
                                        <Bell className="h-5 w-5" />
                                        {unreadNotifCount > 0 && (
                                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 shadow-md" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-80 bg-[#1e202e] border-white/10 text-white p-0 " align="end">
                                    <div className="p-3 border-b border-white/5 font-semibold text-sm">Notifications</div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <Link key={n.id} href={n.link || '#'} className="block p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">{n.title}</div>
                                                            <div className="text-xs text-gray-400 line-clamp-2">{n.message}</div>
                                                            <div className="text-[10px] text-gray-500 mt-1">{timeAgo(n.created_at)}</div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-gray-500">No new notifications</div>
                                        )}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/10 hover:ring-indigo-500 transition-all">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={userProfile?.avatar_url || user.user_metadata?.avatar_url} alt={user.email || ''} />
                                            <AvatarFallback>{(userProfile?.display_name || user.email)?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 bg-card border-white/10 text-white" align="end">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="font-medium">{userProfile?.display_name || user.user_metadata?.full_name || 'User'}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem asChild className="focus:bg-white/10"><Link href="/profile">{t.navbar.profile}</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild className="focus:bg-white/10"><Link href="/orders">{t.navbar.orders}</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild className="focus:bg-white/10"><Link href="/settings">{t.navbar.settings}</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={handleLogout}>
                                        {t.navbar.logout}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" className="hidden md:flex text-gray-300 hover:text-white hover:bg-white/10" asChild>
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" /> {t.navbar.login}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Mega Menu Panel */}
            {activeMenu && MEGA_MENU_ITEMS[activeMenu] && (
                <div
                    className="absolute top-20 left-0 w-full bg-[#13151f]/98 backdrop-blur-xl border-t border-white/5 border-b shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                    onMouseEnter={() => setActiveMenu(activeMenu)}
                    onMouseLeave={() => setActiveMenu(null)}
                >
                    <div className="container mx-auto py-8 px-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                {activeMenu === 'account' ? 'เกมยอดฮิต' : activeMenu === 'item' ? 'ไอเท็มยอดนิยม' : 'บริการแนะนำ'}
                            </h3>
                            <Link href={`/browse?type=${activeMenu}`} className="text-indigo-400 text-sm hover:text-indigo-300">ดูทั้งหมด &rarr;</Link>
                        </div>
                        <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
                            {MEGA_MENU_ITEMS[activeMenu].map((item) => (
                                <Link key={item.slug} href={`/browse?type=${activeMenu}&category=${item.slug}`}>
                                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/10">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-lg">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-200 group-hover:text-white text-sm">{item.name}</div>
                                            <div className="text-[10px] text-gray-500 group-hover:text-indigo-400">{item.count} รายการ</div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}

function NavItem({ id, href, icon, label, activeMenu, onHover }: any) {
    const isActive = activeMenu === id
    return (
        <div
            className="h-full flex items-center"
            onMouseEnter={() => onHover(id)}
        >
            <Link href={href}>
                <Button variant="ghost" className={`gap-2 h-10 transition-all ${isActive ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
                    {icon}
                    <span>{label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} />
                </Button>
            </Link>
        </div>
    )
}

function MobileNavItem({ href, icon, label, className }: any) {
    return (
        <Link href={href} className={`flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium ${className || 'text-gray-300'}`}>
            {icon}
            {label}
        </Link>
    )
}
