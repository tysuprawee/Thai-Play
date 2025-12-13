'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Trash2, Search, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function AdminListingsPage() {
    const [listings, setListings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const supabase = createClient()

    const fetchListings = async () => {
        setLoading(true)
        let query = supabase
            .from('listings')
            .select('*, profiles(display_name)')
            .order('created_at', { ascending: false })

        if (searchTerm) {
            query = query.ilike('title_th', `%${searchTerm}%`)
        }

        const { data, error } = await query
        if (data) setListings(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchListings()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return

        const { error } = await supabase.from('listings').delete().eq('id', id)
        if (error) {
            alert('ลบไม่สำเร็จ: ' + error.message)
        } else {
            alert('ลบประกาศเรียบร้อยแล้ว')
            fetchListings()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">จัดการประกาศสินค้า</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="ค้นหาประกาศ..."
                            className="pl-9 bg-[#1e202e] border-white/10 text-white w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchListings()}
                        />
                    </div>
                    <Button onClick={fetchListings} variant="secondary">ค้นหา</Button>
                </div>
            </div>

            <Card className="bg-[#1e202e] border-white/5 text-white">
                <CardHeader>
                    <CardTitle>รายการสินค้าทั้งหมด ({listings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-400">ชื่อประกาศ</TableHead>
                                <TableHead className="text-gray-400">ผู้ขาย</TableHead>
                                <TableHead className="text-gray-400">ราคา</TableHead>
                                <TableHead className="text-gray-400">ประเภท</TableHead>
                                <TableHead className="text-gray-400">สถานะ</TableHead>
                                <TableHead className="text-right text-gray-400">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">กำลังโหลด...</TableCell>
                                </TableRow>
                            ) : listings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">ไม่พบข้อมูล</TableCell>
                                </TableRow>
                            ) : listings.map((item) => (
                                <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="line-clamp-1 max-w-[200px]" title={item.title_th}>{item.title_th}</span>
                                            <Link href={`/listing/${item.id}`} target="_blank">
                                                <ExternalLink className="w-3 h-3 text-indigo-400" />
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.profiles?.display_name || 'Unknown'}</TableCell>
                                    <TableCell>{formatPrice(item.price_min)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-white/20 text-gray-300">
                                            {item.listing_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${item.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                            }`}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> ลบ
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
