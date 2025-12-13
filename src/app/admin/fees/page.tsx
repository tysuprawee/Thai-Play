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
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'

export default function AdminFeesPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const supabase = createClient()

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('name_th')

        if (data) setCategories(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const updateFee = async (id: string, newFee: string) => {
        setSaving(id)
        const { error } = await supabase
            .from('categories')
            .update({ fee_percent: parseFloat(newFee) })
            .eq('id', id)

        if (!error) {
            // Success animation or toast could go here
        } else {
            alert('Error: ' + error.message)
        }
        setSaving(null)
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">ตั้งค่าค่าธรรมเนียม (Platform Fees)</h2>

            <div className="bg-[#1e202e] border border-white/5 rounded-lg overflow-hidden max-w-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead className="text-gray-400">หมวดหมู่</TableHead>
                            <TableHead className="text-gray-400">ค่าธรรมเนียมปัจจุบัน (%)</TableHead>
                            <TableHead className="text-gray-400 text-right">บันทึก</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                                </TableCell>
                            </TableRow>
                        ) : categories.map((cat) => (
                            <TableRow key={cat.id} className="border-white/5 hover:bg-white/5">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{cat.icon}</span>
                                        {cat.name_th}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 max-w-[150px]">
                                        <Input
                                            type="number"
                                            defaultValue={cat.fee_percent || 5.0}
                                            className="h-8 bg-[#13151f] border-white/10 text-white"
                                            onChange={(e) => {
                                                // Just local state update if needed, but we save on button click
                                                cat.newFee = e.target.value
                                            }}
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-500"
                                        onClick={() => updateFee(cat.id, cat.newFee || cat.fee_percent)}
                                        disabled={saving === cat.id}
                                    >
                                        {saving === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
