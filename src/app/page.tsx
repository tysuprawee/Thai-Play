import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ShieldCheck, Zap, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

// Images
import valorantBg from '../pics/valorant1.jpg'
import valorantCard from '../pics/valorant2.jpg'
import rovCard from '../pics/Rov.jpg'

export default async function Home() {
  const supabase = await createClient()

  // Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')

  // Fetch Latest Listings
  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(display_name, seller_level), listing_media(media_url)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1016]">
      {/* Premium Hero Section */}
      <section className="relative pt-32 pb-48 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <Image
            src={valorantBg}
            alt="Hero Background"
            fill
            className="object-cover opacity-40 blur-sm mask-gradient-to-b"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-[#0f1016]/60 to-transparent" />
        </div>

        <div className="container mx-auto relative z-10 px-4 md:px-6 text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm mb-6 animate-fade-in-up backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
            <span>แพลตฟอร์มซื้อขายเกมอันดับ 1 ในไทย</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl">
            ตลาดซื้อขายเกม <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">สำหรับเกมเมอร์ทุกคน</span>
          </h1>

          <p className="mx-auto max-w-[700px] text-gray-300 md:text-xl mb-10 leading-relaxed font-light">
            ซื้อ ขาย และสร้างรายได้ไปกับเรา <br />
            ระบบคนกลางปลอดภัย • ส่งมอบทันที • ดูแลตลอด 24 ชม.
          </p>

          {/* Centered Search Pill */}
          <div className="mx-auto max-w-3xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative flex items-center bg-[#1e202e] rounded-full border border-white/10 p-2 shadow-2xl">
              <div className="pl-6 pr-4 text-gray-400 border-r border-white/10 flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <span className="text-sm font-medium">ทุกหมวดหมู่</span>
              </div>
              <input
                type="text"
                placeholder="ค้นหาเกม, ไอเท็ม, บริการ ฯลฯ..."
                className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 focus:outline-none h-12 px-4"
              />
              <Button size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 shadow-lg shadow-indigo-500/20">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Tags */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <span>คำค้นยอดฮิต:</span>
            <Link href="/browse?category=rov" className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-colors border border-white/5">RoV</Link>
            <Link href="/browse?category=valorant" className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-colors border border-white/5">Valorant</Link>
            <Link href="/browse?category=genshin" className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-colors border border-white/5">Genshin</Link>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="border-y border-white/5 bg-[#13151f] py-8">
        <div className="container mx-auto flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><ShieldCheck className="w-6 h-6" /></div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-gray-400">การันตีคืนเงิน</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Users className="w-6 h-6" /></div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">50K+</div>
              <div className="text-xs text-gray-400">ผู้ใช้งานจริง</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Zap className="w-6 h-6" /></div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">5นาที</div>
              <div className="text-xs text-gray-400">เฉลี่ยเวลาส่งมอบ</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending / Popular Games */}
      <section className="py-12 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-8 flex items-center gap-2">
            เกมยอดนิยม
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          </h2>
          <div className="relative">
            <div className="flex overflow-x-auto pb-8 gap-6 scrollbar-hide snap-x mask-linear-gradient">
              {categories?.filter((c: any) => c.type === 'game').map((game: any) => {
                const bgImage = game.slug === 'valorant' ? valorantCard :
                  game.slug === 'rov' ? rovCard :
                    valorantBg;

                return (
                  <Link key={game.id} href={`/browse?category=${game.slug}`} className="snap-start shrink-0">
                    <div className="group relative w-[220px] h-[300px] rounded-3xl overflow-hidden bg-gray-800 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2 ring-1 ring-white/10 hover:ring-indigo-500/50">
                      {/* Image Background */}
                      <div className="absolute inset-0 z-0">
                        <Image
                          src={bgImage}
                          alt={game.name_th}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-[#0f1016]/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                        <h3 className="text-white font-bold text-2xl leading-tight mb-2 group-hover:text-indigo-300 transition-colors drop-shadow-md">{game.name_th}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>Active</span>
                          </div>
                          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white group-hover:bg-indigo-600 transition-colors">
                            <Zap className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-[#13151f]/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">หมวดหมู่ยอดนิยม</h2>
            <Link href="/browse" className="text-indigo-400 hover:text-indigo-300 transition-colors">ดูทั้งหมด &rarr;</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories && categories.length > 0 ? categories.map((cat: any) => (
              <Link key={cat.id} href={`/browse?category=${cat.slug}`} className="group">
                <div className="h-full bg-[#1e202e] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 hover:bg-[#25283a] transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-indigo-500/10">
                  <span className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-all transform group-hover:scale-110 duration-300">{cat.icon || '🎮'}</span>
                  <h3 className="font-semibold text-gray-300 group-hover:text-white">{cat.name_th}</h3>
                </div>
              </Link>
            )) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-[#1e202e] rounded-2xl animate-pulse" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Latest Listings */}
      <section className="py-16 bg-[#13151f]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">มาใหม่ล่าสุด</h2>
              <p className="text-gray-400 text-sm mt-1">สินค้าและบริการที่เพิ่งลงขาย</p>
            </div>
            <Link href="/browse" className="text-indigo-400 hover:text-indigo-300 transition-colors">ดูทั้งหมด &rarr;</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings && listings.length > 0 ? listings.map((item: any) => (
              <Link key={item.id} href={`/listing/${item.id}`} className="group">
                <Card className="overflow-hidden border-0 bg-[#1e202e] text-white hover:translate-y-[-4px] transition-all duration-300 shadow-lg hover:shadow-indigo-500/20">
                  <div className="aspect-video bg-gray-800 relative group-hover:opacity-90 transition-opacity">
                    {item.listing_media && item.listing_media.length > 0 ? (
                      <Image
                        src={item.listing_media[0].media_url}
                        alt={item.title_th}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-xs">
                        NO IMAGE
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-10">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${item.listing_type === 'service' ? 'bg-purple-500/20 text-purple-300' :
                        item.listing_type === 'account' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                        {item.listing_type}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold line-clamp-1 mb-1 text-gray-100 group-hover:text-indigo-400 transition-colors">{item.title_th}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{item.description_th}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-lg font-bold text-white">{formatPrice(item.price_min)}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] text-indigo-400">
                          {item.profiles?.display_name?.[0] || 'U'}
                        </div>
                        {item.profiles?.display_name || 'Seller'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )) : (
              <div className="col-span-full text-center py-20 bg-[#1e202e] rounded-2xl border border-dashed border-white/10">
                <p className="text-gray-500">ยังไม่มีรายการสินค้า</p>
                <Button variant="link" className="text-indigo-400">ลงขายคนแรกเลย!</Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
