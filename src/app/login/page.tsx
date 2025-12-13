'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label' // Need to make sure Label is installed or use standard label
import { AlertTriangle } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.refresh()
            router.push('/')
        }
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-10">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ ThaiPlay</CardTitle>
                    <p className="text-sm text-gray-500">ยินดีต้อนรับกลับสู่ตลาดเกมที่ปลอดภัยที่สุด</p>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4" /> {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label htmlFor="password">รหัสผ่าน</Label>
                                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline">
                                    ลืมรหัสผ่าน?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        ยังไม่มีบัญชี?{' '}
                        <Link href="/register" className="text-indigo-600 hover:underline font-bold">
                            สมัครสมาชิก
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
