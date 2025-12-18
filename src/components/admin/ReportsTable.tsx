'use client'

import { useState, useEffect } from 'react'
import { updateReportStatus } from '@/app/actions/report'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface ReportsTableProps {
    initialReports: any[]
}

export function ReportsTable({ initialReports }: ReportsTableProps) {
    // We can use local state if we want to update UI optimistically, 
    // or just rely on router.refresh() since the parent passes fresh data.
    // Let's rely on router.refresh() for simplicity and consistency with server data.
    const router = useRouter()
    const [selectedReport, setSelectedReport] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [updating, setUpdating] = useState(false)

    // Realtime Subscription
    const supabase = createClient()
    useEffect(() => {
        const channel = supabase
            .channel('realtime-reports')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports',
                },
                (payload) => {
                    console.log('Realtime update:', payload)
                    router.refresh()
                    if (payload.eventType === 'INSERT') {
                        toast.info('New user report received!')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, router])

    const handleUpdateStatus = async (id: string, status: 'resolved' | 'dismissed') => {
        setUpdating(true)
        try {
            await updateReportStatus(id, status)
            toast.success(`Report marked as ${status}`)
            router.refresh() // Refresh server data

            // If updating from within the dialog, close it or update local state?
            // Closing it feels natural if resolved.
            if (isDialogOpen && selectedReport?.id === id) {
                setIsDialogOpen(false)
            }
        } catch (error) {
            toast.error('Failed to update status')
        } finally {
            setUpdating(false)
        }
    }

    const openDetails = (report: any) => {
        setSelectedReport(report)
        setIsDialogOpen(true)
    }

    if (!initialReports || initialReports.length === 0) {
        return <div className="text-center py-8 text-gray-500">No reports found. Good job!</div>
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Reporter</TableHead>
                        <TableHead className="text-gray-400">Reported User</TableHead>
                        <TableHead className="text-gray-400">Reason</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Description</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-right text-gray-400">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialReports.map((report) => (
                        <TableRow key={report.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-medium text-white">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={report.reporter?.avatar_url} />
                                        <AvatarFallback>{report.reporter?.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{report.reporter?.display_name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-white">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={report.reported?.avatar_url} />
                                        <AvatarFallback>{report.reported?.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{report.reported?.display_name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="w-fit border-indigo-500/50 text-indigo-300">
                                    {report.reason}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge className={`
                                    ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : ''}
                                    ${report.status === 'resolved' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : ''}
                                    ${report.status === 'dismissed' ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30' : ''}
                                `}>
                                    {report.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {report.description ? (
                                    <span className="text-xs text-gray-400 max-w-[200px] truncate block" title={report.description}>
                                        {report.description}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-600 italic">No description</span>
                                )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                                {new Date(report.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                        onClick={() => openDetails(report)}
                                        title="View Details"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    {report.status === 'pending' && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                onClick={() => handleUpdateStatus(report.id, 'resolved')}
                                                title="Mark Resolved"
                                                disabled={updating}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300 hover:bg-white/10"
                                                onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                                                title="Dismiss"
                                                disabled={updating}
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[#1e202e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Report Details</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Review full details of this report.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-bold">Reporter</label>
                                    <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={selectedReport.reporter?.avatar_url} />
                                            <AvatarFallback>{selectedReport.reporter?.display_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{selectedReport.reporter?.display_name || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-bold">Reported User</label>
                                    <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={selectedReport.reported?.avatar_url} />
                                            <AvatarFallback>{selectedReport.reported?.display_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{selectedReport.reported?.display_name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold">Reason</label>
                                <div>
                                    <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                        {selectedReport.reason}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold">Description</label>
                                <div className="p-4 bg-[#0b0c14] border border-white/5 rounded-md text-sm text-gray-300 min-h-[100px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                    {selectedReport.description || "No description provided."}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold">Submitted At</label>
                                <div className="text-sm text-gray-300">
                                    {new Date(selectedReport.created_at).toLocaleString()}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold">Status</label>
                                <div>
                                    <Badge className={`
                                        ${selectedReport.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : ''}
                                        ${selectedReport.status === 'resolved' ? 'bg-green-500/20 text-green-500' : ''}
                                        ${selectedReport.status === 'dismissed' ? 'bg-gray-500/20 text-gray-400' : ''}
                                    `}>
                                        {selectedReport.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        {selectedReport?.status === 'pending' && (
                            <>
                                <Button
                                    onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                                    variant="outline"
                                    className="border-white/10 hover:bg-white/5 text-gray-400"
                                    disabled={updating}
                                >
                                    Dismiss Report
                                </Button>
                                <Button
                                    onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                                    disabled={updating}
                                >
                                    Resolve Report
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={() => setIsDialogOpen(false)}
                            variant="ghost"
                            className="hover:bg-white/10"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
