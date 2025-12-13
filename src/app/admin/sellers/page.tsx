'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, CheckCircle, Ban } from 'lucide-react'

export default function AdminSellersPage() {
    const [profiles, setProfiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchProfiles = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setProfiles(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchProfiles()
    }, [])

    const updateStatus = async (id: string, updates: any) => {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)

        if (!error) {
            fetchProfiles() // Refresh
        } else {
            alert('Error updating profile: ' + error.message)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">จัดการผู้ขาย</h2>

            <div className="bg-[#1e202e] border border-white/5 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead className="text-gray-400">ผู้ใช้งาน</TableHead>
                            <TableHead className="text-gray-400">สถานะ</TableHead>
                            <TableHead className="text-gray-400">ระดับ</TableHead>
                            <TableHead className="text-gray-400 text-right">การกระทำ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                                </TableCell>
                            </TableRow>
                        ) : profiles.map((profile) => (
                            <TableRow key={profile.id} className="border-white/5 hover:bg-white/5">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={profile.avatar_url} />
                                            <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-white">{profile.display_name}</div>
                                            <div className="text-xs text-gray-500">{profile.id}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={profile.status === 'banned' ? 'destructive' : 'secondary'} className={profile.status === 'active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''}>
                                        {profile.status || 'active'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-white/10 text-gray-400">
                                        {profile.seller_level}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    {profile.seller_level === 'new' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                            onClick={() => updateStatus(profile.id, { seller_level: 'verified' })}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            อนุมัติ
                                        </Button>
                                    )}
                                    {profile.status !== 'banned' ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => updateStatus(profile.id, { status: 'banned' })}
                                        >
                                            <Ban className="w-4 h-4 mr-1" />
                                            แบน
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-gray-400 hover:text-white"
                                            onClick={() => updateStatus(profile.id, { status: 'active' })}
                                        >
                                            ปลดแบน
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
