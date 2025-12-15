'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin-config'

export function AdminSync() {
    const supabase = createClient()

    useEffect(() => {
        const checkAndSyncAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.email) return

            if (isAdmin(user.email)) {
                // Check current profile role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile && profile.role !== 'admin') {
                    console.log('Syncing Admin Role for', user.email)
                    // Update Role
                    await supabase
                        .from('profiles')
                        .update({ role: 'admin' })
                        .eq('id', user.id)
                }
            }
        }

        checkAndSyncAdmin()
    }, [])

    return null
}
