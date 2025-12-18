'use client'

import { formatPrice } from '@/lib/utils'
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
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, ExternalLink, Plus, Clock, User } from 'lucide-react'
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

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()

    // State
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [supportAvatarPreview, setSupportAvatarPreview] = useState<string | null>(null)

    // Cropper State
    const [cropModalOpen, setCropModalOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [imageType, setImageType] = useState<'personal' | 'support'>('personal')

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profile) {
                setDisplayName(profile.display_name || '')
                setBio(profile.bio || '')
                if (profile.avatar_url) {
                    setAvatarPreview(profile.avatar_url)
                }
                setIsAdmin(profile.role === 'admin' || profile.display_name === 'Exeria2142' || profile.display_name === 'suprawee2929')
                // Check for support avatar if admin
                if (profile.role === 'admin') {
                    // logic for support avatar if needed, or stored in profile settings
                }
            }
            setLoading(false)
        }
        fetchProfile()
    }, [router, supabase])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const updates: any = {
            id: user.id,
            display_name: displayName,
            bio: bio,
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.from('profiles').upsert(updates)

        if (error) {
            alert('Error updating profile!')
        } else {
            // Success feedback
        }
        setLoading(false)
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'personal' | 'support') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageDataUrl = URL.createObjectURL(file)
            setTempImageSrc(imageDataUrl)
            setImageType(type)
            setCropModalOpen(true)
        }
    }

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const saveCroppedImage = async () => {
        if (!tempImageSrc || !croppedAreaPixels || !user) return

        try {
            setLoading(true)
            const croppedImageBlob = await getCroppedImg(tempImageSrc, croppedAreaPixels)

            if (!croppedImageBlob) throw new Error('Could not create cropped image')

            const fileName = `${user.id}/${Date.now()}.jpg`
            const bucket = imageType === 'personal' ? 'avatars' : 'support-avatars' // Assuming separate logic or reused

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars') // Using avatars bucket for now
                .upload(fileName, croppedImageBlob)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            if (imageType === 'personal') {
                setAvatarPreview(publicUrl)
                // Update profile immediately or wait for save? Usually immediately for avatar
                await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
            } else {
                setSupportAvatarPreview(publicUrl)
                if (isAdmin) {
                    await updateSupportAvatar(publicUrl)
                }
            }

            setCropModalOpen(false)
            setTempImageSrc(null)
        } catch (e) {
            console.error(e)
            alert('Error uploading image')
        } finally {
            setLoading(false)
        }
    }
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0f1016] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-5xl py-10 px-4">
            {/* Header */}
            <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

            {/* EDIT PROFILE SECTION (Simplified without Tabs) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-4">
                    <Card className="bg-[#1e202e] border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" />
                                แก้ไขข้อมูลส่วนตัว
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-6 max-w-2xl mx-auto">
                                <div className="flex flex-col items-center mb-6 gap-4">
                                    <div className="relative group cursor-pointer">
                                        <Avatar className="h-28 w-28 ring-4 ring-[#13151f] group-hover:ring-indigo-500 transition-all shadow-lg">
                                            <AvatarImage src={avatarPreview || user.user_metadata?.avatar_url} />
                                            <AvatarFallback>ME</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Pencil className="w-8 h-8 text-white" />
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

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">ชื่อที่ใช้แสดง (Display Name)</Label>
                                        <Input className="bg-[#13151f] border-white/10 text-white h-12" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">เกี่ยวกับฉัน (Bio)</Label>
                                        <Textarea
                                            className="bg-[#13151f] border-white/10 text-white min-h-[120px]"
                                            value={bio}
                                            onChange={e => setBio(e.target.value)}
                                            placeholder="แนะนำตัวเอง เวลาออน บริการที่ถนัด..."
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-white/5 my-6" />

                                <div className="flex justify-end">
                                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 min-w-[150px]" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        บันทึกการเปลี่ยนแปลง
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

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
        </div >
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
