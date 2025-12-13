'use client'

import { useState, useEffect, use } from 'react'
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
import { Loader2, Save, ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [loading, setLoading] = useState(true) // Initial load
    const [saving, setSaving] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const router = useRouter()
    const supabase = createClient()

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [type, setType] = useState('service')
    // Image State
    const [existingImages, setExistingImages] = useState<any[]>([])
    const [newImages, setNewImages] = useState<{ file: File, preview: string }[]>([])
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

    useEffect(() => {
        const init = async () => {
            // 1. Check Auth
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 2. Fetch Categories
            const { data: cats } = await supabase.from('categories').select('*')
            if (cats) setCategories(cats)

            // 3. Fetch Listing with Media
            const { data: listing, error } = await supabase
                .from('listings')
                .select('*, listing_media(*)')
                .eq('id', id)
                .single()

            if (error || !listing) {
                alert('ไม่พบประกาศนี้')
                router.push('/profile')
                return
            }

            // Verify ownership
            if (listing.seller_id !== user.id) {
                alert('คุณไม่มีสิทธิ์แก้ไขประกาศนี้')
                router.push('/profile')
                return
            }

            // Pre-fill form
            setTitle(listing.title_th)
            setDescription(listing.description_th || '')
            setPrice(listing.price_min.toString())
            setCategoryId(listing.category_id)
            setType(listing.listing_type)
            if (listing.listing_media) {
                // Sort by sort_order
                const sorted = listing.listing_media.sort((a: any, b: any) => a.sort_order - b.sort_order)
                setExistingImages(sorted)
            }

            setLoading(false)
        }
        init()
    }, [id, router, supabase])

    // Image Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const added = Array.from(e.target.files).map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }))
            setNewImages([...newImages, ...added])
        }
    }

    const removeNewImage = (index: number) => {
        setNewImages(newImages.filter((_, i) => i !== index))
    }

    const removeExistingImage = (imageId: string) => {
        setExistingImages(existingImages.filter(img => img.id !== imageId))
        setDeletedImageIds([...deletedImageIds, imageId])
    }


    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { error } = await supabase
            .from('listings')
            .update({
                title_th: title,
                description_th: description,
                price_min: parseFloat(price),
                category_id: categoryId,
                listing_type: type,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message)
            setSaving(false)
            return
        }

        // Handle Image Deletions
        if (deletedImageIds.length > 0) {
            await supabase.from('listing_media').delete().in('id', deletedImageIds)
            // Note: Ideally we should delete from Storage too, but for MVP we skip to avoid strict RLS complexity on storage delete.
        }

        // Handle New Image Uploads
        if (newImages.length > 0) {
            // Get current max sort order
            const currentMaxOrder = existingImages.length > 0
                ? Math.max(...existingImages.map(img => img.sort_order))
                : -1

            let startOrder = currentMaxOrder + 1

            for (let i = 0; i < newImages.length; i++) {
                const file = newImages[i].file
                const fileExt = file.name.split('.').pop()
                const fileName = `${id}/${Date.now()}_${i}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('listing-images')
                    .upload(fileName, file)

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('listing-images')
                        .getPublicUrl(fileName)

                    await supabase.from('listing_media').insert({
                        listing_id: id,
                        media_url: publicUrl,
                        sort_order: startOrder + i
                    })
                }
            }
        }

        alert('แก้ไขประกาศสำเร็จ')
        router.push('/profile')
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f1016] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="container py-10 max-w-2xl">
            <Button variant="ghost" asChild className="mb-4 text-gray-400 hover:text-white">
                <Link href="/profile">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    กลับ
                </Link>
            </Button>

            <Card className="bg-[#1e202e] border-white/5">
                <CardHeader>
                    <CardTitle className="text-2xl text-white">แก้ไขประกาศ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-300">ชื่อประกาศ</Label>
                            <Input
                                className="bg-[#13151f] border-white/10 text-white"
                                placeholder="เช่น รับจ้างดันแรงค์ Valorant หรือ ขายไอดี RoV"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">หมวดหมู่เกม</Label>
                                <Select value={categoryId} onValueChange={setCategoryId} required>
                                    <SelectTrigger className="bg-[#13151f] border-white/10 text-white">
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
                                <Label className="text-gray-300">ประเภท</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="bg-[#13151f] border-white/10 text-white">
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
                            <Label className="text-gray-300">รายละเอียด</Label>
                            <Textarea
                                className="h-32 bg-[#13151f] border-white/10 text-white"
                                placeholder="อธิบายรายละเอียดสินค้าของคุณให้ชัดเจน..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        {/* Image Management Section */}
                        <div className="space-y-4">
                            <Label className="text-gray-300">จัดการรูปภาพ</Label>
                            <div className="grid grid-cols-4 gap-4">
                                {/* Existing Images */}
                                {existingImages.map((img) => (
                                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 group">
                                        <img src={img.media_url} alt="Listing" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(img.id)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="ลบรูปภาพ"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* New Images Pending Upload */}
                                {newImages.map((img, index) => (
                                    <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-green-500/50 group">
                                        <img src={img.preview} alt="New Upload" className="w-full h-full object-cover opacity-80" />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full">New</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Button */}
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
                            <Label className="text-gray-300">ราคา (บาท)</Label>
                            <Input
                                type="number"
                                className="bg-[#13151f] border-white/10 text-white"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" size="lg" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
