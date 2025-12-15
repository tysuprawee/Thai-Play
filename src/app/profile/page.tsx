'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Crop as CropIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, ExternalLink, Plus } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Link from 'next/link'
import Cropper from 'react-easy-crop'

import { updateSupportAvatar } from '@/app/actions/admin-profile' // New

export default function EditProfilePage() {
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isAdmin, setIsAdmin] = useState(false) // New
    const [listings, setListings] = useState<any[]>([])

    // Form Fields
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')

    // Avatar Upload & Crop State
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

    // Support Avatar State (Admin)
    const [supportAvatarFile, setSupportAvatarFile] = useState<File | null>(null)
    const [supportAvatarPreview, setSupportAvatarPreview] = useState<string | null>(null)
    const [cropTarget, setCropTarget] = useState<'personal' | 'support'>('personal')

    // Crop Modal State
    const [cropModalOpen, setCropModalOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null) // The raw image to crop
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

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
                setAvatarPreview(data.avatar_url || user.user_metadata?.avatar_url || null) // Prefer DB

                if (data.role === 'admin') {
                    setIsAdmin(true)
                    // Fetch Support Avatar
                    const { data: supportData } = await supabase
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', '00000000-0000-0000-0000-000000000000')
                        .single()
                    if (supportData) {
                        setSupportAvatarPreview(supportData.avatar_url)
                    }
                }
            }
        }
        fetchProfile()
    }, [])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'personal' | 'support' = 'personal') => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        setCropTarget(target)

        // Read file as URL for cropper
        const reader = new FileReader()
        reader.addEventListener('load', () => {
            setTempImageSrc(reader.result?.toString() || null)
            setCropModalOpen(true)
            e.target.value = '' // Reset input
        })
        reader.readAsDataURL(file)
    }

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const saveCroppedImage = async () => {
        try {
            if (!tempImageSrc || !croppedAreaPixels) return
            const croppedImageBlob = await getCroppedImg(tempImageSrc, croppedAreaPixels)
            if (!croppedImageBlob) return

            // Create a File from Blob
            const fileName = `avatar-${Date.now()}.jpg`
            const file = new File([croppedImageBlob], fileName, { type: 'image/jpeg' })

            if (cropTarget === 'personal') {
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(croppedImageBlob))
            } else {
                setSupportAvatarFile(file)
                setSupportAvatarPreview(URL.createObjectURL(croppedImageBlob))
            }

            setCropModalOpen(false)
            setTempImageSrc(null)
            setZoom(1)
        } catch (e) {
            console.error(e)
            alert('Failed to crop image')
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        let avatarUrl = user.user_metadata?.avatar_url

        // 1. Upload Avatar if changed
        if (avatarFile) {
            const fileExt = 'jpg' // We convert to jpg in cropper
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile)

            if (uploadError) {
                alert('Error uploading avatar: ' + uploadError.message)
                setLoading(false)
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            avatarUrl = publicUrl
        }

        // 1.5 Upload Support Avatar (If Admin and Changed)
        if (isAdmin && supportAvatarFile) {
            const formData = new FormData()
            formData.append('file', supportAvatarFile)
            try {
                await updateSupportAvatar(formData)
            } catch (e: any) {
                console.error(e)
                alert('Support Avatar Failed: ' + e.message)
            }
        }

        // 2. Update Database Profile
        const { error: dbError } = await supabase
            .from('profiles')
            .update({
                display_name: displayName,
                bio: bio,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (dbError) {
            alert('Error updating profile: ' + dbError.message)
            setLoading(false)
            return
        }

        // 3. Update Auth Metadata (Syncs with Navbar)
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                full_name: displayName,
                avatar_url: avatarUrl
            }
        })

        if (authError) {
            alert('Error syncing auth data: ' + authError.message)
        } else {
            alert('บันทึกข้อมูลเรียบร้อย')
            router.refresh()
            // Force reload to ensure Navbar updates if router.refresh() isn't enough for client components
            window.location.reload()
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
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="flex flex-col items-center mb-6 gap-4">
                                    <div className="relative group cursor-pointer">
                                        <Avatar className="h-24 w-24 ring-2 ring-white/10 group-hover:ring-indigo-500 transition-all">
                                            <AvatarImage src={avatarPreview || user.user_metadata?.avatar_url} />
                                            <AvatarFallback>ME</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Pencil className="w-6 h-6 text-white" />
                                        </div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handleAvatarChange(e, 'personal')}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์</p>

                                    {isAdmin && (
                                        <div className="flex flex-col items-center mt-4 pt-4 border-t border-white/10 w-full">
                                            <Label className="text-gray-300 mb-2">Support Bot Avatar</Label>
                                            <div className="relative group cursor-pointer">
                                                <Avatar className="h-20 w-20 ring-2 ring-indigo-500/20 group-hover:ring-indigo-500 transition-all">
                                                    <AvatarImage src={supportAvatarPreview || ''} />
                                                    <AvatarFallback>BOT</AvatarFallback>
                                                </Avatar>
                                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-5 h-5 text-white" />
                                                </div>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => handleAvatarChange(e, 'support')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

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

                                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    บันทึกการเปลี่ยนแปลง
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* CROP MODAL */}
            <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[#13151f] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>ปรับแต่งรูปโปรไฟล์</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            ลากเพื่อเลื่อน และซูมเพื่อจัดตำแหน่งให้เหมาะสม
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden my-4">
                        {tempImageSrc && (
                            <Cropper
                                image={tempImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Square aspect ratio
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-xs text-gray-400">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => { setCropModalOpen(false); setTempImageSrc(null); }}
                            className="text-gray-400 hover:text-white"
                        >
                            ยกเลิก
                        </Button>
                        <Button onClick={saveCroppedImage} className="bg-indigo-600 hover:bg-indigo-500">
                            ยืนยันรูปภาพ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Utility to crop image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

async function getCroppedImg(imageSrc: string, pixelCrop: any) {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // draw cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    // As Blob
    return new Promise<Blob | null>((resolve, reject) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/jpeg')
    })
}
