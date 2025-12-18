import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestsClient } from '@/components/admin/RequestsClient'

export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
    const supabase = await createClient()

    // 1. Check Admin (Optional if layout handles it, but safe to keep or rely on middleware/layout)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 2. Fetch All Requests (Removed pending filter to show history)
    const { data: requests, error } = await supabase
        .from('game_requests')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching requests:', error)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight">Requests Management</h1>
            </div>

            <RequestsClient initialRequests={requests || []} />
        </div>
    )
}
