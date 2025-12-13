'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SellPage() {
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const router = useRouter()
    const supabase = createClient()

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [type, setType] = useState('service')

    useEffect(() => {
        // Check Auth
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            }
        }
        checkUser()

        // Fetch Categories
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*')
            if (data) setCategories(data)
        }
        fetchCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase.from('listings').insert({
            seller_id: user.id,
            category_id: categoryId,
            title_th: title,
            description_th: description,
            price_min: parseFloat(price),
            listing_type: type,
            status: 'active'
        }).select()

        if (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message)
            setLoading(false)
        } else {
            router.push(`/listing/${data[0].id}`)
        }
    }

    return (
        <div className="container py-10 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">ลงขายสินค้า / บริการ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>ชื่อประกาศ</Label>
                            <Input
                                placeholder="เช่น รับจ้างดันแรงค์ Valorant หรือ ขายไอดี RoV"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>หมวดหมู่เกม</Label>
                                <Select onValueChange={setCategoryId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกเกม/บริการ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name_th}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ประเภท</Label>
                                <Select onValueChange={setType} defaultValue="service">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="service">บริการ (Service)</SelectItem>
                                        <SelectItem value="item">ไอเท็ม (Item)</SelectItem>
                                        <SelectItem value="account">ไอดีเกม (Account)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                placeholder="อธิบายรายละเอียดสินค้าของคุณให้ชัดเจน..."
                                className="h-32"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ราคา (บาท)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'กำลังสร้างประกาศ...' : 'ลงประกาศขายทันที'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
