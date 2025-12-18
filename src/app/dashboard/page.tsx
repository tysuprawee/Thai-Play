'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Clock, Eye, MousePointerClick, ShoppingBag, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState({
        totalEarnings: 0,
        pendingPayout: 0,
        totalOrders: 0,
        activeListings: 0,
        totalViews: 0
    })

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // 1. Total Earnings (Completed Orders)
            const { data: completedOrders } = await supabase
                .from('orders')
                .select('net_amount')
                .eq('seller_id', user.id)
                .eq('status', 'completed')

            const totalEarnings = completedOrders?.reduce((sum, o) => sum + (o.net_amount || 0), 0) || 0

            // 2. Pending Payout (Escrowed/Delivered Orders)
            const { data: pendingOrders } = await supabase
                .from('orders')
                .select('net_amount')
                .eq('seller_id', user.id)
                .in('status', ['escrowed', 'delivered'])

            const pendingPayout = pendingOrders?.reduce((sum, o) => sum + (o.net_amount || 0), 0) || 0

            // 3. Total Orders Count
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)

            // 4. Listings Stats (Active Count & Total Views)
            const { data: userListings } = await supabase
                .from('listings')
                .select('views, status')
                .eq('seller_id', user.id)

            const activeListings = userListings?.filter(l => l.status === 'active').length || 0
            const totalViews = userListings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0

            setStats({
                totalEarnings,
                pendingPayout,
                totalOrders: ordersCount || 0,
                activeListings,
                totalViews
            })
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return <div className="p-10 text-center text-white">Loading Dashboard...</div>

    return (
        <div className="container mx-auto max-w-6xl py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Seller Dashboard</h1>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
                    <Link href="/selling/listings">Manage Listings <ExternalLink className="ml-2 w-4 h-4" /></Link>
                </Button>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-indigo-900 via-[#1e202e] to-[#1e202e] border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-indigo-300">รายได้รวม (Total Earnings)</h3>
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold">{formatPrice(stats.totalEarnings)}</div>
                        <p className="text-xs text-indigo-300/70 mt-2">รายได้สุทธิที่ได้รับแล้ว</p>
                        <Button asChild size="sm" className="mt-4 w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30">
                            <Link href="/dashboard/payout">แจ้งถอนเงิน (Withdraw) <ExternalLink className="ml-2 w-3 h-3" /></Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e202e] border-white/5 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-400">เงินรอตรวจสอบ (Pending)</h3>
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Clock className="w-6 h-6 text-orange-400" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-orange-400">{formatPrice(stats.pendingPayout)}</div>
                        <p className="text-xs text-gray-500 mt-2">จากออเดอร์ที่กำลังดำเนินการ</p>
                    </CardContent>
                </Card>
            </div>

            {/* Engagement Stats */}
            <h2 className="text-xl font-semibold text-white mb-4">Statistics & Engagement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Orders */}
                <Card className="bg-[#13151f] border-white/5 text-white hover:border-indigo-500/30 transition-colors">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                            <ShoppingBag className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.totalOrders}</div>
                        <div className="text-sm text-gray-400">Total Orders</div>
                    </CardContent>
                </Card>

                {/* Active Listings */}
                <Card className="bg-[#13151f] border-white/5 text-white hover:border-indigo-500/30 transition-colors">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                            <ExternalLink className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.activeListings}</div>
                        <div className="text-sm text-gray-400">Active Listings</div>
                    </CardContent>
                </Card>

                {/* Total Views (Refined Statistics) */}
                <Card className="bg-[#13151f] border-white/5 text-white hover:border-indigo-500/30 transition-colors">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <Eye className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stats.totalViews}</div>
                        <div className="text-sm text-gray-400">Total Listing Views</div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions or Future Charts can go here */}
        </div>
    )
}
