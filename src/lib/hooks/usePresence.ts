import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePresence() {
    const supabase = createClient()

    useEffect(() => {
        const updatePresence = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase
                .from('profiles')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', user.id)
        }

        // Update immediately on mount
        updatePresence()

        // Update every 30 seconds
        const interval = setInterval(updatePresence, 30000)

        // Update on visibility change (tab focus)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePresence()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])
}
