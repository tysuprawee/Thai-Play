'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { approveRequest, rejectRequest } from '@/app/actions/admin-game'

interface RequestActionsProps {
    request: {
        id: string
        game_name: string
    }
}

export function RequestActions({ request }: RequestActionsProps) {
    const [isApproveOpen, setIsApproveOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [gameName, setGameName] = useState(request.game_name)
    const [slug, setSlug] = useState(request.game_name.toLowerCase().replace(/\s+/g, '-'))

    const handleAutoSlug = (name: string) => {
        setGameName(name)
        setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    }

    const onApprove = async () => {
        setLoading(true)
        try {
            await approveRequest(request.id, gameName, slug)
            toast.success(`Approved ${gameName}!`)
            setIsApproveOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve')
        } finally {
            setLoading(false)
        }
    }

    const onReject = async () => {
        if (!confirm('Are you sure you want to REJECT this request?')) return
        setLoading(true)
        try {
            await rejectRequest(request.id)
            toast.success('Request rejected')
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex gap-2">
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={onReject}
                    disabled={loading}
                    title="Reject"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>

                <Button
                    variant="default"
                    size="icon"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setIsApproveOpen(true)}
                    disabled={loading}
                    title="Approve & Create Category"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
            </div>

            {/* Approve Dialog */}
            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Game Approval</DialogTitle>
                        <DialogDescription>
                            Please review the game name and slug before creating the category.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="gameName">Game Name (Displayed)</Label>
                            <Input
                                id="gameName"
                                value={gameName}
                                onChange={(e) => handleAutoSlug(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug">Slug (URL)</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                            />
                            <p className="text-xs text-gray-400">Unique identifier for URLs (e.g. /category/genshin-impact)</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={onApprove} disabled={loading || !gameName || !slug}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
