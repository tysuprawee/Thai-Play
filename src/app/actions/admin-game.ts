'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const isAdmin = async (supabase: any, userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    return data?.role === 'admin'
}

export async function approveRequest(id: string, name: string, slug: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await isAdmin(supabase, user.id))) {
        throw new Error('Unauthorized')
    }

    // 1. Create Category
    const { error: catError } = await supabase.from('categories').insert({
        name_th: name,
        slug: slug,
        type: 'game', // Defaulting to game for now
        icon: '🎮'
    })

    if (catError) {
        throw new Error(catError.message)
    }

    // 2. Update Request Status
    const { error: reqError } = await supabase
        .from('game_requests')
        .update({ status: 'approved' })
        .eq('id', id)

    if (reqError) throw new Error(reqError.message)

    revalidatePath('/admin/requests')
    return { success: true }
}

export async function rejectRequest(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await isAdmin(supabase, user.id))) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('game_requests')
        .update({ status: 'rejected' })
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/requests')
    return { success: true }
}
