import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, ShoppingBag, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // 1. Total Sales (Completed Orders)
    const { data: salesData } = await supabase
        .from('orders')
        .select('amount')
        .eq('status', 'completed')

    const totalSales = salesData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0

    // 2. Active Disputes
    const { count: disputeCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disputed')

    // 3. New Sellers
    const { count: sellerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('seller_level', 'new')

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">ภาพรวมระบบ</h2>
                <p className="text-gray-400">ยินดีต้อนรับสู่แผงควบคุมผู้ดูแลระบบ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">ยอดขายรวม</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">฿{totalSales.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">จากคำสั่งซื้อที่สำเร็จทั้งหมด</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">ข้อพิพาทที่รอตรวจสอบ</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{disputeCount || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">รายการที่ต้องดำเนินการ</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">ผู้ขายใหม่</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{sellerCount || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">รอการยืนยันตัวตน</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
