'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, Gavel, FileText, Settings, LogOut, Loader2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin' && !['Exeria2142', 'suprawee2929'].includes(profile?.display_name)) {
                router.push('/') // Redirect non-admins
                return
            }

            setIsAdmin(true)
            setLoading(false)
        }
        checkAdmin()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0f1016] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (!isAdmin) return null

    const navItems = [
        { name: 'ภาพรวม', href: '/admin', icon: LayoutDashboard },
        { name: 'จัดการสินค้า', href: '/admin/listings', icon: FileText },
        { name: 'จัดการคำสั่งซื้อ', href: '/admin/orders', icon: FileText },
        { name: 'จัดการผู้ขาย', href: '/admin/sellers', icon: Users },
        { name: 'ข้อพิพาท', href: '/admin/disputes', icon: Gavel },
        { name: 'ตั้งค่าค่าธรรมเนียม', href: '/admin/fees', icon: Settings },
    ]

    return (
        <div className="flex min-h-screen bg-[#0f1016]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#13151f] border-r border-white/5 hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        Admin Portal
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                    ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
