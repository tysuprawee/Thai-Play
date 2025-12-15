'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Gamepad2, Plus } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export function RequestGameModal() {
    const { language } = useLanguage()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    const isThai = language === 'th'

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
                    game_name: name,
                    description: description
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
                    <Plus className="h-4 w-4" />
                    <span>{isThai ? "ขอเพิ่มเกม" : "Request Game"}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isThai ? "ขอเพิ่มเกมใหม่" : "Request New Game"}</DialogTitle>
                    <DialogDescription>
                        {isThai ? "เกมที่คุณต้องการยังไม่มีในระบบ? บอกเราได้เลย!" : "Game missing? Tell us!"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{isThai ? "ชื่อเกม" : "Game Name"}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Genshin Impact"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">{isThai ? "รายละเอียดเพิ่มเติม (ถ้ามี)" : "Description (Optional)"}</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={isThai ? "ทำไมถึงอยากให้เพิ่มเกมนี้?" : "Reason?"}
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
