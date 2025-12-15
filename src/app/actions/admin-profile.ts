'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSupportAvatar(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Verify Admin Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    const file = formData.get('file') as File
    if (!file) throw new Error('No file uploaded')

    // 2. Upload to Storage
    const SUPPORT_ID = '00000000-0000-0000-0000-000000000000'
    const fileName = `support-avatar-${Date.now()}.jpg`

    // We can use the 'avatars' bucket.
    // Ensure RLS allows admin upload, or usage of Service Role if needed.
    // Since we are in Server Action with `createClient` (which uses cookie auth by default), 
    // we act as the logged-in admin.
    // We assume admins have insert/update permissions on 'avatars' bucket.

    const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

    if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

    // 3. Update Support Profile
    const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', SUPPORT_ID)

    if (dbError) throw new Error('Database update failed: ' + dbError.message)

    revalidatePath('/chat')
    return { success: true, url: publicUrl }
}
