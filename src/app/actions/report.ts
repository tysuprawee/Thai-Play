'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createReport(reportedId: string, reason: string, description: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('reports')
        .insert({
            reporter_id: user.id,
            reported_id: reportedId,
            reason,
            description
        })

    if (error) {
        console.error('Error creating report:', error)
        throw new Error('Failed to create report')
    }

    return true
}

export async function getReports() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Verify Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('Configuration Error: NEXT_PUBLIC_SUPABASE_URL is missing')
        throw new Error('Configuration Error: Missing API URL')
    }

    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            *,
            reporter:profiles!reporter_id(display_name, avatar_url),
            reported:profiles!reported_id(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching reports:', error)
        throw new Error(`Failed to fetch reports: ${error.message} hint: ${error.hint}`)
    }

    return reports
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Verify Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId)

    if (error) {
        throw new Error('Failed to update report')
    }

    revalidatePath('/admin/reports')
    return true
}
