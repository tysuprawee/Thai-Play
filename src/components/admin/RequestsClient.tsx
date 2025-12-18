'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Gamepad2, Sparkles, Bug, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface RequestsClientProps {
    initialRequests: any[]
}

export function RequestsClient({ initialRequests }: RequestsClientProps) {
    const router = useRouter()
    const [updating, setUpdating] = useState(false)
    const supabase = createClient()

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('realtime-requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_requests',
                },
                (payload) => {
                    console.log('Realtime request update:', payload)
                    router.refresh()
                    if (payload.eventType === 'INSERT') {
                        toast.info('New request received!')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, router])

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        setUpdating(true)
        try {
            const { error } = await supabase
                .from('game_requests')
                .update({ status })
                .eq('id', id)

            if (error) throw error

            toast.success(`Request ${status}`)
            router.refresh()
        } catch (error) {
            toast.error('Failed to update request')
        } finally {
            setUpdating(false)
        }
    }

    const RequestsTable = ({ requests, type }: { requests: any[], type: string }) => {
        if (requests.length === 0) {
            return <div className="text-center py-10 text-gray-500">No {type} requests found.</div>
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-gray-400">Requester</TableHead>
                        <TableHead className="text-gray-400">Title</TableHead>
                        <TableHead className="text-gray-400">Description</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-right text-gray-400">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map((req) => (
                        <TableRow key={req.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-medium text-white">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={req.profiles?.avatar_url} />
                                        <AvatarFallback>{req.profiles?.display_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{req.profiles?.display_name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                                {req.game_name}
                            </TableCell>
                            <TableCell>
                                {req.description ? (
                                    <span className="text-xs text-gray-400 max-w-[200px] truncate block" title={req.description}>
                                        {req.description}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-600 italic">No details</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge className={`
                                    ${req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : ''}
                                    ${req.status === 'approved' ? 'bg-green-500/20 text-green-500' : ''}
                                    ${req.status === 'rejected' ? 'bg-red-500/20 text-red-500' : ''}
                                `}>
                                    {req.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                                {new Date(req.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                                {req.status === 'pending' && (
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                                            title="Approve"
                                            disabled={updating}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                            title="Reject"
                                            disabled={updating}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    const gameRequests = initialRequests.filter(r => r.request_type === 'game' || !r.request_type)
    const featureRequests = initialRequests.filter(r => r.request_type === 'feature')
    const bugRequests = initialRequests.filter(r => r.request_type === 'bug')

    return (
        <Tabs defaultValue="game" className="space-y-6">
            <div className="flex items-center justify-between">
                <TabsList className="bg-[#1e202e] border border-white/5">
                    <TabsTrigger value="game" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        Game Requests
                        {gameRequests.some(r => r.status === 'pending') && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="feature" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Features
                        {featureRequests.some(r => r.status === 'pending') && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="bug" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                        <Bug className="w-4 h-4 mr-2" />
                        Bugs
                        {bugRequests.some(r => r.status === 'pending') && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="game">
                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-indigo-400" />
                            Game Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RequestsTable requests={gameRequests} type="game" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="feature">
                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            Feature Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RequestsTable requests={featureRequests} type="feature" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="bug">
                <Card className="bg-[#1e202e] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Bug className="w-5 h-5 text-red-400" />
                            Bug Reports
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RequestsTable requests={bugRequests} type="bug" />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
