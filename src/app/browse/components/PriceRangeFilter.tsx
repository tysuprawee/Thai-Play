'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function PriceRangeFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize from URL or default
    const [min, setMin] = useState(searchParams.get('min') || '')
    const [max, setMax] = useState(searchParams.get('max') || '')

    const applyFilter = () => {
        const params = new URLSearchParams(searchParams.toString())

        if (min) params.set('min', min)
        else params.delete('min')

        if (max) params.set('max', max)
        else params.delete('max')

        router.push(`/browse?${params.toString()}`)
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold mb-2">ช่วงราคา (Price Range)</h3>
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    placeholder="Min"
                    value={min}
                    onChange={e => setMin(e.target.value)}
                    className="h-8 text-sm"
                />
                <span className="text-gray-400">-</span>
                <Input
                    type="number"
                    placeholder="Max"
                    value={max}
                    onChange={e => setMax(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>
            <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs h-8"
                onClick={applyFilter}
            >
                Apply <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
        </div>
    )
}
