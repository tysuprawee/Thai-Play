'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createReport } from '@/app/actions/report'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ReportUserDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    reportedId: string
    reportedName: string
}

export function ReportUserDialog({ isOpen, onOpenChange, reportedId, reportedName }: ReportUserDialogProps) {
    const [reason, setReason] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Please select a reason')
            return
        }

        setIsSubmitting(true)
        try {
            await createReport(reportedId, reason, description)
            toast.success('Report submitted successfully')
            onOpenChange(false)
            setReason('')
            setDescription('')
        } catch (error) {
            console.error(error)
            toast.error('Failed to submit report')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#1e202e] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Report User</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Please provide details about why you are reporting {reportedName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason" className="text-gray-300">Reason</Label>
                        <Select onValueChange={setReason} value={reason}>
                            <SelectTrigger className="bg-[#0b0c14] border-white/10 text-white">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e202e] border-white/10 text-white">
                                <SelectItem value="spam">Spam / Advertising</SelectItem>
                                <SelectItem value="harassment">Harassment / Abusive Language</SelectItem>
                                <SelectItem value="scam">Scam / Fraud</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-gray-300">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide specific details..."
                            className="bg-[#0b0c14] border-white/10 text-white min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
