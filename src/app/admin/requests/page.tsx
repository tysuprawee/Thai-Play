import { createClient } from '@/lib/supabase/server'
import { RequestActions } from './RequestActions'
import { redirect } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revalidatePath } from 'next/cache'

export default async function AdminRequestsPage() {
    const supabase = await createClient()

    // 1. Check Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/')

    // 2. Fetch Requests
    const { data: requests, error } = await supabase
        .from('game_requests')
        .select('*, profiles(display_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    console.log('Admin Requests Query:', { count: requests?.length, error, firstReq: requests?.[0] })

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6 text-white">คำขอเพิ่มเกม (Game Requests)</h1>

            <div className="grid gap-4">
                {error && (
                    <div className="bg-red-900/50 border border-red-500 p-4 rounded text-red-200">
                        Error: {error.message} (Code: {error.code})
                        <pre className="text-xs mt-2 opacity-75">{JSON.stringify(error, null, 2)}</pre>
                    </div>
                )}

                {!error && (!requests || requests.length === 0) && <p className="text-gray-400">ไม่มีคำขอที่รอดำเนินการ (No pending requests)</p>}

                {requests?.map((req) => (
                    <div key={req.id} className="bg-[#1e202e] border border-white/10 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="font-bold text-lg text-white">{req.game_name}</div>
                            <div className="text-sm text-gray-400">{req.description || '-'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Requested by: {req.profiles?.display_name || 'Unknown'}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <RequestActions request={req} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
