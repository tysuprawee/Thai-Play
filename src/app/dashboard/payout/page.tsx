'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LucideIcon } from 'lucide-react'
import { DollarSign, Clock, CheckCircle, AlertCircle, Building2, History } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const BANKS = [
    { code: 'KBANK', name: 'Kasikornbank (กสิกรไทย)' },
    { code: 'SCB', name: 'SCB (ไทยพาณิชย์)' },
    { code: 'BBL', name: 'Bangkok Bank (กรุงเทพ)' },
    { code: 'KTB', name: 'Krungthai (กรุงไทย)' },
    { code: 'BAY', name: 'Krungsri (กรุงศรี)' },
    { code: 'TTB', name: 'TTB (ทหารไทยธนชาต)' },
    { code: 'GSB', name: 'GSB (ออมสิน)' },
    { code: 'PROMPTPAY', name: 'PromptPay (พร้อมเพย์)' },
]

export default function PayoutPage() {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [stats, setStats] = useState({
        grossIncome: 0,
        totalFees: 0,
        totalIncome: 0,
        totalWithdrawn: 0,
        pendingWithdrawal: 0,
        availableBalance: 0
    })
    const [payouts, setPayouts] = useState<any[]>([])

    // Form State
    const [amount, setAmount] = useState('')
    const [bank, setBank] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [accountName, setAccountName] = useState('')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        // 1. Total Income (Completed Orders)
        const { data: completedOrders } = await supabase
            .from('orders')
            .select('amount, fee_amount, net_amount')
            .eq('seller_id', user.id)
            .eq('status', 'completed')

        const grossIncome = completedOrders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0
        const totalFees = completedOrders?.reduce((sum, o) => sum + Number(o.fee_amount), 0) || 0
        const totalIncome = completedOrders?.reduce((sum, o) => sum + Number(o.net_amount), 0) || 0

        // 2. Withdrawal History & Stats
        const { data: payoutHistory } = await supabase
            .from('payouts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        const history = payoutHistory || []
        setPayouts(history)

        const totalWithdrawn = history
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0)

        const pendingWithdrawal = history
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0)

        setStats({
            grossIncome,
            totalFees,
            totalIncome, // This is Net Income
            totalWithdrawn,
            pendingWithdrawal,
            availableBalance: totalIncome - totalWithdrawn - pendingWithdrawal
        })
        setLoading(false)
    }

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        const withdrawAmount = Number(amount)

        if (withdrawAmount < 100) {
            toast.error('ยอดถอนขั้นต่ำคือ 100 บาท')
            setSubmitting(false)
            return
        }

        if (withdrawAmount > stats.availableBalance) {
            toast.error('ยอดเงินคงเหลือไม่พอ')
            setSubmitting(false)
            return
        }

        if (!bank || !accountNumber || !accountName) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
            setSubmitting(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('payouts').insert({
            user_id: user.id,
            amount: withdrawAmount,
            net_amount: withdrawAmount, // No fee for now
            fee_amount: 0,
            bank_name: bank,
            account_number: accountNumber,
            account_name: accountName,
            status: 'pending'
        })

        if (error) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message)
        } else {
            toast.success('ส่งคำขอถอนเงินเรียบร้อยแล้ว')
            setAmount('')
            // Refresh data
            fetchData()
        }
        setSubmitting(false)
    }

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>

    // Calculate Progress
    const MIN_WITHDRAW = 100
    const progress = Math.min((stats.availableBalance / MIN_WITHDRAW) * 100, 100)
    const canWithdraw = stats.availableBalance >= MIN_WITHDRAW

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4">
            <h1 className="text-3xl font-bold text-white mb-2">Wallet & Payouts</h1>
            <p className="text-gray-400 mb-8">จัดการรายได้และถอนเงินเข้าบัญชีธนาคาร</p>

            {/* Income Breakdown Card */}
            <Card className="bg-[#1e202e] border-white/5 text-white mb-8">
                <CardHeader>
                    <CardTitle className="text-lg">สรุปรายได้ (Income Breakdown)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 space-y-1 text-center md:text-left">
                            <div className="text-sm text-gray-400">ยอดขายรวม (Gross Sales)</div>
                            <div className="text-2xl font-bold text-white">{formatPrice(stats.grossIncome)}</div>
                        </div>

                        <div className="hidden md:block h-12 w-px bg-white/10"></div>

                        <div className="flex-1 space-y-1 text-center md:text-left">
                            <div className="text-sm text-gray-500">หักค่าธรรมเนียม (Platform Fees)</div>
                            <div className="text-xl font-medium text-gray-500">-{formatPrice(stats.totalFees)}</div>
                        </div>

                        <div className="hidden md:block h-12 w-px bg-white/10"></div>

                        <div className="flex-1 space-y-1 text-center md:text-left">
                            <div className="text-sm text-green-400 font-medium">รายได้สุทธิ (Net Income)</div>
                            <div className="text-3xl font-bold text-green-400">{formatPrice(stats.totalIncome)}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="รายได้ทั้งหมด (Total Income)"
                    value={stats.totalIncome}
                    icon={DollarSign}
                    color="text-indigo-400"
                    desc="จากออเดอร์ที่สำเร็จแล้ว"
                />
                <StatCard
                    title="ถอนแล้ว (Withdrawn)"
                    value={stats.totalWithdrawn}
                    icon={CheckCircle}
                    color="text-green-400"
                />
                <StatCard
                    title="รอตรวจสอบ (Pending)"
                    value={stats.pendingWithdrawal}
                    icon={Clock}
                    color="text-orange-400"
                />
                {/* Available Balance Card with Progress */}
                <Card className="bg-gradient-to-br from-indigo-900 to-[#1e202e] border-indigo-500/30 text-white shadow-lg col-span-1 md:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-sm font-medium text-indigo-300 mb-1">ยอดที่ถอนได้ (Available)</div>
                                <div className="text-4xl font-bold">{formatPrice(stats.availableBalance)}</div>
                            </div>
                            {canWithdraw ? (
                                <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/50">พร้อมถอนเงิน</Badge>
                            ) : (
                                <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border-gray-500/50">ยอดไม่ถึงขั้นต่ำ</Badge>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>ความคืบหน้าการถอน (ขั้นต่ำ 100 บาท)</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-indigo-950" indicatorClassName={canWithdraw ? "bg-green-500" : "bg-indigo-500"} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Withdrawal Form */}
                <Card className="bg-[#1e202e] border-white/5 text-white lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                            แจ้งถอนเงิน
                        </CardTitle>
                        <CardDescription>โอนเข้าบัญชีธนาคารภายใน 24 ชม.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div className="space-y-2">
                                <Label>ธนาคาร (Bank)</Label>
                                <Select value={bank} onValueChange={setBank}>
                                    <SelectTrigger className="bg-[#13151f] border-white/10 text-white">
                                        <SelectValue placeholder="เลือกธนาคาร" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                        {BANKS.map(b => (
                                            <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>เลขบัญชี (Account No.)</Label>
                                <Input
                                    className="bg-[#13151f] border-white/10 text-white"
                                    placeholder="xxxxxxxxxx"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>ชื่อบัญชี (Account Name)</Label>
                                <Input
                                    className="bg-[#13151f] border-white/10 text-white"
                                    placeholder="ชื่อ-นามสกุล (ภาษาไทย)"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>จำนวนเงิน (Amount)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="bg-[#13151f] border-white/10 text-white pl-8"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        min={100}
                                        step={0.01}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
                                </div>
                                <p className="text-xs text-gray-400">ขั้นต่ำ 100 บาท (ฟรีค่าธรรมเนียม)</p>
                            </div>

                            <Button disabled={submitting || !canWithdraw} type="submit" className="w-full bg-green-600 hover:bg-green-500 mt-4">
                                {submitting ? 'กำลังส่งคำขอ...' : 'ยืนยันการถอนเงิน'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History Table */}
                <Card className="bg-[#1e202e] border-white/5 text-white lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-400" />
                            ประวัติการถอนเงิน
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-gray-400">วันที่</TableHead>
                                    <TableHead className="text-gray-400">ธนาคาร</TableHead>
                                    <TableHead className="text-gray-400">จำนวน</TableHead>
                                    <TableHead className="text-gray-400 text-right">สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payouts.length === 0 ? (
                                    <TableRow className="border-white/10">
                                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                            ยังไม่มีประวัติการถอนเงิน
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payouts.map((p) => (
                                        <TableRow key={p.id} className="border-white/10 hover:bg-white/5">
                                            <TableCell className="text-gray-300">
                                                {new Date(p.created_at).toLocaleDateString('th-TH', {
                                                    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{p.bank_name}</div>
                                                <div className="text-xs text-gray-500">{p.account_number}</div>
                                            </TableCell>
                                            <TableCell className="font-medium">{formatPrice(p.amount)}</TableCell>
                                            <TableCell className="text-right">
                                                <StatusBadge status={p.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, desc }: any) {
    return (
        <Card className="bg-[#1e202e] border-white/5 text-white">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">{title}</h3>
                    <div className={`p-2 bg-white/5 rounded-lg ${color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{formatPrice(value)}</div>
                {desc && <p className="text-xs text-gray-500 mt-1">{desc}</p>}
            </CardContent>
        </Card>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'completed':
            return <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20">สำเร็จ</Badge>
        case 'pending':
            return <Badge className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">รอตรวจสอบ</Badge>
        case 'rejected':
            return <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20">ถูกปฏิเสธ</Badge>
        default:
            return <Badge className="bg-gray-500/10 text-gray-400">{status}</Badge>
    }
}
