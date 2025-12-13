import Link from 'next/link'
import { ShoppingBag, Facebook, Twitter, Instagram, Mail } from 'lucide-react'

export function Footer() {
    return (
        <footer className="bg-slate-950 text-slate-400 border-t border-white/10">
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center space-x-2">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            <span className="font-bold">ThaiPlay</span>
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground">
                            ตลาดซื้อขายไอดีเกมและบริการเกมที่ปลอดภัยที่สุดสำหรับคนไทย ด้วยระบบ Escrow และการยืนยันตัวตน
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">ซื้อขาย</h3>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/browse" className="hover:text-foreground">หมวดหมู่ทั้งหมด</Link></li>
                            <li><Link href="/browse/games" className="hover:text-foreground">ไอดีเกม</Link></li>
                            <li><Link href="/browse/services" className="hover:text-foreground">บริการ</Link></li>
                            <li><Link href="/sell" className="hover:text-foreground">สมัครเป็นผู้ขาย</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">ช่วยเหลือ</h3>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/trust" className="hover:text-foreground">ศูนย์ความปลอดภัย</Link></li>
                            <li><Link href="/faq" className="hover:text-foreground">คำถามที่พบบ่อย</Link></li>
                            <li><Link href="/contact" className="hover:text-foreground">ติดต่อเรา</Link></li>
                            <li><Link href="/report" className="hover:text-foreground">แจ้งการโกง</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">กฎระเบียบ</h3>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/terms" className="hover:text-foreground">ข้อตกลงการใช้งาน</Link></li>
                            <li><Link href="/privacy" className="hover:text-foreground">นโยบายความเป็นส่วนตัว</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} ThaiPlay. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
