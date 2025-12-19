'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export function ListingSorter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Default to 'relevance' if not specified
    const currentSort = searchParams.get('sort') || 'relevance'

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('sort', value)
        // Reset to page 1 if pagination exists (not yet implemented but good practice)
        // params.delete('page') 
        router.push(`/browse?${params.toString()}`)
    }

    return (
        <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-[#1e202e] border-white/10 text-white">
                <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="relevance">ความเกี่ยวข้อง (Relevance)</SelectItem>
                <SelectItem value="popular">ยอดนิยม (Popular)</SelectItem>
                <SelectItem value="price_asc">ราคา: ต่ำ - สูง (Low to High)</SelectItem>
                <SelectItem value="price_desc">ราคา: สูง - ต่ำ (High to Low)</SelectItem>
            </SelectContent>
        </Select>
    )
}
