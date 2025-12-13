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

export function Navbar() {
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
        toast.success('ออกจากระบบเรียบร้อยแล้ว')
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
                            ThaiPlay
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center space-x-1 h-20">
                        <NavItem
                            id="account"
                            href="/browse?type=account"
                            icon={<Gamepad2 className="w-4 h-4" />}
                            label="ไอดีเกม"
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        <NavItem
                            id="item"
                            href="/browse?type=item"
                            icon={<Coins className="w-4 h-4" />}
                            label="ไอเท็ม"
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        <NavItem
                            id="service"
                            href="/browse?type=service"
                            icon={<Sparkles className="w-4 h-4" />}
                            label="บริการ"
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
                        <NavItem
                            id="topup"
                            href="/browse?type=topup"
                            icon={<CreditCard className="w-4 h-4" />}
                            label="เติมเกม"
                            activeMenu={activeMenu}
                            onHover={setActiveMenu}
                        />
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
                            <span className="font-bold text-lg text-white">ThaiPlay</span>
                        </Link>
                        <div className="flex flex-col gap-2">
                            <MobileNavItem href="/browse?type=account" icon={<Gamepad2 />} label="ซื้อไอดีเกม" />
                            <MobileNavItem href="/browse?type=item" icon={<Coins />} label="ซื้อไอเท็ม" />
                            <MobileNavItem href="/browse?type=service" icon={<Sparkles />} label="จ้างดันแรงค์" />

                            {user ? (
                                <>
                                    <MobileNavItem href="/chat" icon={<MessageSquare />} label="แชท/ข้อความ" />
                                    <MobileNavItem href="/sell" icon={<PlusCircle />} label="ลงขายสินค้า" className="text-indigo-400" />
                                </>
                            ) : (
                                <>
                                    <div className="my-2 h-px bg-white/10" />
                                    <MobileNavItem href="/login" icon={<LogIn />} label="เข้าสู่ระบบ" className="text-white" />
                                    <MobileNavItem href="/sell" icon={<PlusCircle />} label="ลงขายสินค้า" className="text-indigo-400" />
                                </>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Right Action */}
                <div className="flex items-center gap-3">
                    <Button variant="default" size="sm" className="hidden md:flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/20" asChild>
                        <Link href="/sell">
                            <PlusCircle className="mr-2 h-4 w-4" /> ลงขาย
                        </Link>
                    </Button>

                    {isAdmin && (
                        <Button variant="ghost" size="sm" className="hidden md:flex text-indigo-400 hover:text-indigo-300 hover:bg-white/10" asChild>
                            <Link href="/admin">
                                <LayoutDashboard className="mr-2 h-4 w-4" /> Admin
                            </Link>
                        </Button>
                    )}

                    {user ? (
                        <>
                            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10" asChild>
                                <Link href="/chat">
                                    <MessageSquare className="h-5 w-5" />
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 shadow-md" />
                            </Button>
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
                                    <DropdownMenuItem asChild className="focus:bg-white/10"><Link href="/profile">โปรไฟล์</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild className="focus:bg-white/10"><Link href="/orders">รายการซื้อขาย</Link></DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={handleLogout}>
                                        ออกจากระบบ
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" className="hidden md:flex text-gray-300 hover:text-white hover:bg-white/10" asChild>
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" /> เข้าสู่ระบบ
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
