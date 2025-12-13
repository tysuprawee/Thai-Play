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
import { Loader2, Upload, X } from 'lucide-react'

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
    const [images, setImages] = useState<{ file: File, preview: string }[]>([])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImages = Array.from(e.target.files).map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }))
            setImages([...images, ...newImages])
        }
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

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

        if (images.length === 0) {
            alert('กรุณาอัพโหลดรูปภาพอย่างน้อย 1 รูป')
            setLoading(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Create Listing
        const { data: listingData, error: listingError } = await supabase.from('listings').insert({
            seller_id: user.id,
            category_id: categoryId,
            title_th: title,
            description_th: description,
            price_min: parseFloat(price),
            listing_type: type,
            status: 'active'
        }).select()

        if (listingError) {
            alert('เกิดข้อผิดพลาด: ' + listingError.message)
            setLoading(false)
            return
        }

        const newListingId = listingData[0].id

        // 2. Upload Images & Create Media Records
        try {
            for (let i = 0; i < images.length; i++) {
                const file = images[i].file
                const fileExt = file.name.split('.').pop()
                const fileName = `${newListingId}/${Date.now()}_${i}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('listing-images')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('listing-images')
                    .getPublicUrl(fileName)

                await supabase.from('listing_media').insert({
                    listing_id: newListingId,
                    media_url: publicUrl,
                    sort_order: i
                })
            }

            router.push(`/listing/${newListingId}`)
        } catch (error: any) {
            console.error('Upload Error:', error)
            alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + error.message)
            // Optional: Cleanup listing if upload fails? For MVP we keep it but warn user.
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
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

                        <div className="space-y-4">
                            <Label>รูปภาพสินค้า (อย่างน้อย 1 รูป)</Label>
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 group">
                                        <img src={img.preview} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <div className="aspect-square rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-white/5 transition-colors relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageUpload}
                                        multiple
                                        accept="image/*"
                                    />
                                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                    <span className="text-xs text-gray-400">เพิ่มรูปภาพ</span>
                                </div>
                            </div>
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
