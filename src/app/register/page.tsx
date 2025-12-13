'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${email}`, // Auto generate avatar
                },
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Supabase defaults to "check email" unless auto-confirm is on in dev.
            // For MVP UX, we might assume auto-confirm or show message.
            // But let's assume successful signup logs them in or asks for confirmation.
            // If auto-confirm is enabled in Supabase project, they are logged in.
            router.refresh()
            router.push('/')
        }
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-10">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">สมัครสมาชิกใหม่</CardTitle>
                    <p className="text-sm text-gray-500">เข้าร่วมชุมชน ThaiPlay วันนี้</p>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4" /> {error}
                        </div>
                    )}
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullname">ชื่อที่ใช้แสดง (Display Name)</Label>
                            <Input
                                id="fullname"
                                placeholder="เช่น GamerPro99"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
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
                            <Label htmlFor="password">รหัสผ่าน</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        มีบัญชีอยู่แล้ว?{' '}
                        <Link href="/login" className="text-indigo-600 hover:underline font-bold">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
