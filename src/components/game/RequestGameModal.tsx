'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Gamepad2, Plus, Sparkles, Bug } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export function RequestGameModal() {
    const { language } = useLanguage()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [requestType, setRequestType] = useState<'game' | 'feature' | 'bug'>('game')

    const isThai = language === 'th'

    const getTitle = () => {
        if (requestType === 'game') return isThai ? "ขอเพิ่มเกมใหม่" : "Request New Game"
        if (requestType === 'feature') return isThai ? "ขอเพิ่มฟีเจอร์" : "Request Feature"
        return isThai ? "แจ้งปัญหา" : "Report Bug"
    }

    const getDescription = () => {
        if (requestType === 'game') return isThai ? "เกมที่คุณต้องการยังไม่มีในระบบ? บอกเราได้เลย!" : "Game missing? Tell us!"
        if (requestType === 'feature') return isThai ? "ต้องการฟีเจอร์อะไรบ้างบอกเราได้เลย" : "What feature do you want?"
        return isThai ? "พบเจอปัญหาการใช้งานแจ้งเราได้เลย" : "Found a bug? Let us know!"
    }

    const getNameLabel = () => {
        if (requestType === 'game') return isThai ? "ชื่อเกม" : "Game Name"
        if (requestType === 'feature') return isThai ? "ชื่อฟีเจอร์" : "Feature Name"
        return isThai ? "หัวข้อปัญหา" : "Bug Title"
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error(isThai ? "กรุณาเข้าสู่ระบบก่อนส่งคำขอ" : "Please login first")
                setLoading(false)
                return
            }

            const { error } = await supabase
                .from('game_requests')
                .insert({
                    requester_id: user.id,
                    game_name: name, // Using generic 'game_name' logic for title
                    description: description,
                    request_type: requestType
                })

            if (error) throw error

            toast.success(isThai ? "ส่งคำขอเรียบร้อยแล้ว!" : "Request submitted")
            setOpen(false)
            setName("")
            setDescription("")
        } catch (error) {
            console.error(error)
            toast.error(isThai ? "เกิดข้อผิดพลาด" : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const handleOpen = (type: 'game' | 'feature' | 'bug') => {
        setRequestType(type)
        setTimeout(() => setOpen(true), 100) // slight delay to prevent focus issues with dropdown
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
                        <Plus className="h-4 w-4" />
                        <span>{isThai ? "ขอคำร้อง" : "Requests"}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1e202e] border-white/10 text-white">
                    <DropdownMenuItem onClick={() => handleOpen('game')} className="focus:bg-white/10 cursor-pointer">
                        <Gamepad2 className="mr-2 h-4 w-4 text-pink-400" />
                        {isThai ? "ขอเพิ่มเกม" : "Add Game"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpen('feature')} className="focus:bg-white/10 cursor-pointer">
                        <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
                        {isThai ? "ขอเพิ่มฟีเจอร์" : "Add Feature"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpen('bug')} className="focus:bg-white/10 cursor-pointer">
                        <Bug className="mr-2 h-4 w-4 text-red-400" />
                        {isThai ? "แจ้งปัญหา" : "Report Bug"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>
                        {getDescription()}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{getNameLabel()}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={requestType === 'game' ? "Ex: Genshin Impact" : "..."}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">{isThai ? "รายละเอียดเพิ่มเติม" : "Description"}</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={isThai ? "รายละเอียด..." : "Details..."}
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? (isThai ? "กำลังส่ง..." : "Sending...") : (isThai ? "ส่งคำขอ" : "Submit")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
