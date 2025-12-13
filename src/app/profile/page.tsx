'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

export default function EditProfilePage() {
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)

    // Form Fields
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (data) {
                setDisplayName(data.display_name || '')
                setBio(data.bio || '')
            }
        }
        fetchProfile()
    }, [])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase
            .from('profiles')
            .update({
                display_name: displayName,
                bio: bio,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (error) {
            alert('Error: ' + error.message)
        } else {
            alert('บันทึกข้อมูลเรียบร้อย')
            router.refresh()
        }
        setLoading(false)
    }

    if (!user) return <div className="p-10 text-center">Loading...</div>

    return (
        <div className="container max-w-2xl py-10">
            <Card>
                <CardHeader>
                    <CardTitle>แก้ไขโปรไฟล์</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center mb-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={user.user_metadata?.avatar_url} />
                            <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <Label>ชื่อที่ใช้แสดง</Label>
                            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>เกี่ยวกับฉัน</Label>
                            <Textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                placeholder="แนะนำตัวเอง เวลาออน บริการที่ถนัด..."
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
