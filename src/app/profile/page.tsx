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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, ExternalLink, Plus } from 'lucide-react'
import Link from 'next/link'

export default function EditProfilePage() {
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [listings, setListings] = useState<any[]>([])

    // Form Fields
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')

    const supabase = createClient()
    const router = useRouter()

    const fetchListings = async (userId: string) => {
        const { data } = await supabase
            .from('listings')
            .select('*, listing_media(media_url)')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false })
        if (data) setListings(data)
    }

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)
            fetchListings(user.id)

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

    const handleDeleteListing = async (listingId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบประกาศนี้?')) return

        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', listingId)

        if (error) {
            alert('ลบไม่สำเร็จ: ' + error.message)
        } else {
            setListings(listings.filter(l => l.id !== listingId))
        }
    }

    if (!user) return <div className="p-10 text-center text-white">Loading...</div>

    return (
        <div className="container mx-auto max-w-4xl py-10">
            <h1 className="text-3xl font-bold text-white mb-8">จัดการบัญชี</h1>

            <Tabs defaultValue="listings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#1e202e]">
                    <TabsTrigger value="listings">ประกาศของฉัน ({listings.length})</TabsTrigger>
                    <TabsTrigger value="profile">แก้ไขโปรไฟล์</TabsTrigger>
                </TabsList>

                <TabsContent value="listings" className="mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">ประกาศทั้งหมด</h2>
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
                            <Link href="/sell">
                                <Plus className="w-4 h-4 mr-2" />
                                ลงประกาศใหม่
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {listings.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
                                <p className="text-gray-400 mb-4">คุณยังไม่มีประกาศขาย</p>
                                <Button variant="outline" asChild>
                                    <Link href="/sell">ลงประกาศเลย</Link>
                                </Button>
                            </div>
                        ) : listings.map((item) => (
                            <Card key={item.id} className="bg-[#1e202e] border-white/5 overflow-hidden">
                                <div className="flex flex-col sm:flex-row gap-4 p-4">
                                    <div className="w-full sm:w-32 h-32 bg-gray-800 rounded-lg flex-shrink-0 relative overflow-hidden group">
                                        {item.listing_media && item.listing_media.length > 0 ? (
                                            <img src={item.listing_media[0].media_url} alt={item.title_th} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No Image</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-white text-lg truncate pr-4">{item.title_th}</h3>
                                                <div className="text-indigo-400 font-bold mb-1">฿{item.price_min}</div>
                                                <div className="text-xs text-gray-400">
                                                    สถานะ: <span className={item.status === 'active' ? 'text-green-500' : 'text-gray-500'}>{item.status}</span>
                                                    {' • '}
                                                    ลงเมื่อ: {new Date(item.created_at).toLocaleDateString('th-TH')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col gap-2 justify-center border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/listing/${item.id}`} target="_blank">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                ดู
                                            </Link>
                                        </Button>
                                        <Button variant="secondary" size="sm" asChild>
                                            <Link href={`/listing/${item.id}/edit`}>
                                                <Pencil className="w-4 h-4 mr-2" />
                                                แก้ไข
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteListing(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            ลบ
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="profile">
                    <Card className="bg-[#1e202e] border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">ข้อมูลส่วนตัว</CardTitle>
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
                                    <Label className="text-gray-300">ชื่อที่ใช้แสดง</Label>
                                    <Input className="bg-[#13151f] border-white/10 text-white" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">เกี่ยวกับฉัน</Label>
                                    <Textarea
                                        className="bg-[#13151f] border-white/10 text-white"
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
                </TabsContent>
            </Tabs>
        </div>
    )
}
