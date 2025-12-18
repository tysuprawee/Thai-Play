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
    const [stock, setStock] = useState('1')
    const [images, setImages] = useState<{ file: File, preview: string }[]>([])

    // Specifications State
    // Default Delivery Method to Instant
    const [specs, setSpecs] = useState<{ key: string, value: string }[]>([{ key: 'Delivery Method', value: 'Instant' }])
    const [newSpecKey, setNewSpecKey] = useState('')
    const [newSpecValue, setNewSpecValue] = useState('')

    // Secret Info for Instant Delivery
    const [secretInfo, setSecretInfo] = useState('')

    // Tags State
    const [tagsInput, setTagsInput] = useState('')

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

    const addSpec = () => {
        if (newSpecKey && newSpecValue) {
            setSpecs([...specs, { key: newSpecKey, value: newSpecValue }])
            setNewSpecKey('')
            setNewSpecValue('')
        }
    }

    const removeSpec = (index: number) => {
        setSpecs(specs.filter((_, i) => i !== index))
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

        // Prepare Specs JSON
        const specsJson = specs.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})

        // Prepare Tags Array
        const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)

        // 1. Create Listing
        const { data: listingData, error: listingError } = await supabase.from('listings').insert({
            seller_id: user.id,
            category_id: categoryId,
            title_th: title,
            description_th: description,
            price_min: parseFloat(price),
            listing_type: type,
            stock: parseInt(stock) || 1,
            specifications: specsJson,
            tags: tagsArray,
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

            // 3. Save Secret Info if Instant Delivery
            const deliveryMethod = specs.find(s => s.key === 'Delivery Method')?.value
            if (deliveryMethod === 'Instant' && secretInfo.trim()) {
                const { error: secretError } = await supabase.from('listing_secrets').insert({
                    listing_id: newListingId,
                    content: secretInfo
                })
                if (secretError) console.error('Failed to save secret:', secretError)
            }

            router.push(`/listing/${newListingId}`)
        } catch (error: any) {
            console.error('Upload Error:', error)
            alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + error.message)
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl text-white">
            <Card className="bg-[#1e202e] border-white/5 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl">ลงขายสินค้า / บริการ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-300">ชื่อประกาศ</Label>
                            <Input
                                className="bg-[#13151f] border-white/10"
                                placeholder="เช่น รับจ้างดันแรงค์ Valorant หรือ ขายไอดี RoV"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">หมวดหมู่เกม</Label>
                                <Select onValueChange={setCategoryId} required>
                                    <SelectTrigger className="bg-[#13151f] border-white/10">
                                        <SelectValue placeholder="เลือกเกม/บริการ" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id} className="focus:bg-white/10">{cat.name_th}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">ประเภท</Label>
                                <Select onValueChange={setType} defaultValue="service">
                                    <SelectTrigger className="bg-[#13151f] border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                        <SelectItem value="service" className="focus:bg-white/10">บริการ (Service)</SelectItem>
                                        <SelectItem value="item" className="focus:bg-white/10">ไอเท็ม (Item)</SelectItem>
                                        <SelectItem value="account" className="focus:bg-white/10">ไอดีเกม (Account)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Required Specifications */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <Label className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                ข้อมูลจำเพาะ (Required Specifications)
                            </Label>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">วิธีการส่งมอบ (Delivery Method)</Label>
                                    <Select
                                        onValueChange={(val) => setSpecs(prev => {
                                            const others = prev.filter(s => s.key !== 'Delivery Method')
                                            return [...others, { key: 'Delivery Method', value: val }]
                                        })}
                                        defaultValue="Instant"
                                    >
                                        <SelectTrigger className="bg-[#13151f] border-white/10">
                                            <SelectValue placeholder="เลือกวิธีส่งมอบ" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                            <SelectItem value="Instant" className="focus:bg-white/10">ส่งทันที (Instant)</SelectItem>
                                            <SelectItem value="Coordinated" className="focus:bg-white/10">นัดหมายส่งจอง (Coordinated)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">ระยะเวลาส่งมอบ (Est. Time)</Label>
                                    {specs.find(s => s.key === 'Delivery Method')?.value === 'Instant' ? (
                                        <Input
                                            className="bg-[#13151f] border-white/10 text-gray-500 cursor-not-allowed"
                                            value="Instant (ทันที)"
                                            disabled
                                        />
                                    ) : (
                                        <Select
                                            onValueChange={(val) => setSpecs(prev => {
                                                const others = prev.filter(s => s.key !== 'Estimated Time')
                                                return [...others, { key: 'Estimated Time', value: val }]
                                            })}
                                        >
                                            <SelectTrigger className="bg-[#13151f] border-white/10">
                                                <SelectValue placeholder="เลือกเวลาโดยประมาณ" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                                <SelectItem value="As soon as online" className="focus:bg-white/10">ทันทีที่ออนไลน์ (As soon as online)</SelectItem>
                                                <SelectItem value="Within 6 hours" className="focus:bg-white/10">ภายใน 6 ชม. (Within 6 hours)</SelectItem>
                                                <SelectItem value="Within 12 hours" className="focus:bg-white/10">ภายใน 12 ชม. (Within 12 hours)</SelectItem>
                                                <SelectItem value="Within 24 hours" className="focus:bg-white/10">ภายใน 24 ชม. (Within 24 hours)</SelectItem>
                                                <SelectItem value="1-3 Days" className="focus:bg-white/10">1-3 วัน (1-3 Days)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            {/* Secret Info Input for Instant Delivery */}
                            {specs.find(s => s.key === 'Delivery Method')?.value === 'Instant' && (
                                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                                    <Label className="text-green-400 font-semibold flex items-center gap-2">
                                        ข้อมูลสำหรับส่งมอบ (Instant Delivery Data)
                                        <span className="text-xs font-normal text-gray-500">*ลูกค้าจะเห็นข้อมูลนี้ทันทีที่ชำระเงิน</span>
                                    </Label>
                                    <Textarea
                                        className="bg-[#13151f] border-green-500/30 min-h-[100px] font-mono text-sm"
                                        placeholder="ใส่รหัสบัตร, ID/Pass, หรือลิ้งค์ดาวน์โหลดที่ต้องการส่งให้ลูกค้า..."
                                        value={secretInfo}
                                        onChange={(e) => setSecretInfo(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {/* Custom Specifications Builder */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <Label className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                ข้อมูลเพิ่มเติม (Additional Specs)
                            </Label>

                            {/* List of added specs */}
                            <div className="grid grid-cols-1 gap-2">
                                {specs.filter(s => s.key !== 'Delivery Method' && s.key !== 'Estimated Time').map((spec, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <div className="flex-1 bg-white/5 p-2 rounded text-sm text-gray-300 border border-white/5">
                                            <span className="font-bold text-white">{spec.key}:</span> {spec.value}
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="ชื่อหัวข้อ (เช่น Server, Rank)"
                                    value={newSpecKey}
                                    onChange={(e) => setNewSpecKey(e.target.value)}
                                    className="flex-1 bg-[#13151f] border-white/10"
                                />
                                <Input
                                    placeholder="รายละเอียด (เช่น Asia, Diamond)"
                                    value={newSpecValue}
                                    onChange={(e) => setNewSpecValue(e.target.value)}
                                    className="flex-1 bg-[#13151f] border-white/10"
                                />
                                <Button type="button" onClick={addSpec} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border border-white/5">
                                    เพิ่ม
                                </Button>
                            </div>
                        </div>

                        {/* Tags Input */}
                        <div className="space-y-2">
                            <Label className="text-gray-300">แท็กค้นหา (Tags)</Label>
                            <Input
                                className="bg-[#13151f] border-white/10"
                                placeholder="เช่น card, skin, rare, level 50 (คั่นด้วยเครื่องหมายจุลภาค ,)"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">ช่วยให้ผู้ซื้อค้นหาเจอได้ง่ายขึ้น</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-300">รายละเอียด</Label>
                            <Textarea
                                placeholder="อธิบายรายละเอียดสินค้าของคุณให้ชัดเจน..."
                                className="h-32 bg-[#13151f] border-white/10"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-gray-300">รูปภาพสินค้า (อย่างน้อย 1 รูป)</Label>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">ราคา (บาท)</Label>
                                <Input
                                    type="number"
                                    className="bg-[#13151f] border-white/10"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">จำนวนสินค้า (Quantity / Stock)</Label>
                                <Input
                                    type="number"
                                    className="bg-[#13151f] border-white/10"
                                    placeholder="1"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    min="1"
                                    required
                                />
                                <p className="text-xs text-gray-500">Default: 1</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'กำลังสร้างประกาศ...' : 'ลงประกาศขายทันที'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
