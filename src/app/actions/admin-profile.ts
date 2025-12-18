'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSupportAvatar(avatarUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Verify Admin Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    // 2. Update Support Profile
    const SUPPORT_ID = '00000000-0000-0000-0000-000000000000'

    const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', SUPPORT_ID)

    if (dbError) throw new Error('Database update failed: ' + dbError.message)

    revalidatePath('/chat')
    return { success: true, url: avatarUrl }
}
