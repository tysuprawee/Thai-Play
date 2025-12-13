import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ShieldCheck, Zap, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

export default async function Home() {
  const supabase = await createClient()

  // Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .limit(8)

  // Fetch Latest Listings
  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(display_name, seller_level)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-16 md:py-24">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl/none mb-6">
            ตลาดซื้อขายเกมสำหรับคนไทย
          </h1>
          <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl mb-8">
            ซื้อขายไอดีเกม บริการดันแรงค์ และไอเท็ม แบบปลอดภัย ไร้โกง ด้วยระบบ Escrow จาก ThaiPlay
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100" asChild>
              <Link href="/browse">เลือกดูสินค้า</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" asChild>
              <Link href="/sell">เริ่มขายของ</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features / Trust */}
      <section className="py-12 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-green-100 rounded-full mb-4">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">ปลอดภัย 100%</h3>
              <p className="text-gray-500">เงินของคุณจะปลอดภัยในระบบ Escrow จนกว่าจะได้รับสินค้าถูกต้อง</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-blue-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">ชุมชนคนไทย</h3>
              <p className="text-gray-500">ซื้อขายกับคนไทย เข้าใจง่าย คุยรู้เรื่อง ตรวจสอบประวัติผู้ขายได้</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-yellow-100 rounded-full mb-4">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">รวดเร็ว ทันใจ</h3>
              <p className="text-gray-500">ระบบแชทและแจ้งเตือน real-time ช่วยให้ปิดการขายได้ไว</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">หมวดหมู่ยอดนิยม</h2>
            <Link href="/browse" className="text-indigo-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories && categories.length > 0 ? categories.map((cat: any) => (
              <Link key={cat.id} href={`/browse?category=${cat.slug}`} className="group">
                <Card className="h-full hover:shadow-lg transition-shadow border-none bg-slate-50">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <span className="text-4xl mb-2">{cat.icon || '🎮'}</span>
                    <h3 className="font-semibold group-hover:text-indigo-600">{cat.name_th}</h3>
                  </CardContent>
                </Card>
              </Link>
            )) : (
              // Skeleton / Fallback if DB empty or not connected
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Latest Listings */}
      <section className="py-12 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">มาใหม่ล่าสุด</h2>
            <Link href="/browse" className="text-indigo-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings && listings.length > 0 ? listings.map((item: any) => (
              <Link key={item.id} href={`/listing/${item.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-200 relative">
                    {/* Image Placeholder or real image */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded rounded-full">
                        {item.listing_type === 'service' ? 'บริการ' : item.listing_type === 'account' ? 'ไอดีเกม' : 'ไอเท็ม'}
                      </span>
                    </div>
                    <h3 className="font-bold line-clamp-1 mb-1">{item.title_th}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description_th}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-indigo-600">{formatPrice(item.price_min)}</span>
                      <span className="text-xs text-gray-400">by {item.profiles?.display_name || 'Seller'}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )) : (
              <div className="col-span-full text-center py-10 text-gray-400">
                ยังไม่มีรายการสินค้า (หรือยังไม่ได้เชื่อมต่อฐานข้อมูล)
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
