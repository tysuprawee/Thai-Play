import { createClient } from '@/lib/supabase/server'
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
    const { data: requests } = await supabase
        .from('game_requests')
        .select('*, profiles(display_name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    // Actions
    async function approveRequest(formData: FormData) {
        'use server'
        const id = formData.get('id') as string
        const name = formData.get('name') as string
        const slug = name.toLowerCase().replace(/\s+/g, '-')
        const supabase = await createClient()

        // 1. Create Category
        const { error: catError } = await supabase.from('categories').insert({
            name_th: name,
            slug: slug,
            type: 'game', // Defaulting to game for now, could be dynamic
            icon: '🎮'
        })

        if (!catError) {
            // 2. Update Request
            await supabase.from('game_requests').update({ status: 'approved' }).eq('id', id)
            revalidatePath('/admin/requests')
        }
    }

    async function rejectRequest(formData: FormData) {
        'use server'
        const id = formData.get('id') as string
        const supabase = await createClient()
        await supabase.from('game_requests').update({ status: 'rejected' }).eq('id', id)
        revalidatePath('/admin/requests')
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6 text-white">คำขอเพิ่มเกม (Game Requests)</h1>

            <div className="grid gap-4">
                {requests?.length === 0 && <p className="text-gray-400">ไม่มีคำขอที่รอดำเนินการ (No pending requests)</p>}

                {requests?.map((req) => (
                    <div key={req.id} className="bg-[#1e202e] border border-white/10 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="font-bold text-lg text-white">{req.game_name}</div>
                            <div className="text-sm text-gray-400">{req.description || '-'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Requested by: {req.profiles?.display_name} ({req.profiles?.email})
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <form action={rejectRequest}>
                                <input type="hidden" name="id" value={req.id} />
                                <Button variant="destructive" size="icon" type="submit">
                                    <X className="h-4 w-4" />
                                </Button>
                            </form>
                            <form action={approveRequest}>
                                <input type="hidden" name="id" value={req.id} />
                                <input type="hidden" name="name" value={req.game_name} />
                                <Button variant="default" size="icon" className="bg-green-600 hover:bg-green-700" type="submit">
                                    <Check className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
