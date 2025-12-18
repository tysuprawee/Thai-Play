'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ViewIncrementer({ id }: { id: string }) {
    useEffect(() => {
        const incrementView = async () => {
            // Simple session check to prevent spamming refresh
            const key = `viewed-${id}`
            if (sessionStorage.getItem(key)) return

            // Optimistically set to prevent race conditions (double firing in StrictMode)
            sessionStorage.setItem(key, 'true')

            const supabase = createClient()
            const { error } = await supabase.rpc('increment_listing_view', { listing_id: id })

            if (error) {
                console.error('Failed to increment view', error)
                // Revert if failed so it can try again next time
                sessionStorage.removeItem(key)
            }
        }

        incrementView()
    }, [id])

    return null
}
