import { getReports } from '@/app/actions/report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { ReportsTable } from '@/components/admin/ReportsTable'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    let reports = []
    try {
        reports = await getReports() || []
    } catch (error) {
        console.error('Failed to fetch reports in page', error)
        // We can handle error state UI here if needed, but for now passing empty array or handling in component is fine
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight">User Reports</h1>
            </div>

            <Card className="bg-[#1e202e] border-white/5">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Recent Reports
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReportsTable initialReports={reports} />
                </CardContent>
            </Card>
        </div>
    )
}
