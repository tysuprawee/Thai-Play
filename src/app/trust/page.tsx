import { Shield, Lock, AlertTriangle, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrustPage() {
    return (
        <div className="container py-10 md:py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">ศูนย์ความปลอดภัยและการช่วยเหลือ</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    เราให้ความสำคัญกับความปลอดภัยของคุณเป็นอันดับหนึ่ง เรียนรู้วิธีการใช้งาน ThaiPlay อย่างปลอดภัย
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
                <Card>
                    <CardHeader className="text-center">
                        <Shield className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <CardTitle>ระบบตัวกลาง (Escrow)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        เงินของคุณจะถูกพักไว้ที่ระบบกลาง และจะโอนให้ผู้ขายต่อเมื่อคุณได้รับสินค้าและกดยืนยันแล้วเท่านั้น
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="text-center">
                        <Lock className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                        <CardTitle>ยืนยันตัวตน</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        ผู้ขายทุกคนต้องผ่านการยืนยันตัวตน เพื่อความโปร่งใสและตรวจสอบได้
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                        <CardTitle>แจ้งปัญหาได้ 24 ชม.</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        ทีมงานพร้อมช่วยเหลือหากเกิดปัญหาการโกง หรือสินค้าไม่ตรงปก
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="text-center">
                        <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                        <CardTitle>หลักฐานการแชท</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        ควรพูดคุยผ่านระบบแชทของ ThaiPlay เท่านั้น เพื่อใช้เป็นหลักฐานหากเกิดข้อพิพาท
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-12 max-w-4xl mx-auto">
                <section>
                    <h2 className="text-2xl font-bold mb-4">วิธีซื้อขายให้ปลอดภัย</h2>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li><strong>ห้ามโอนเงินตรงเข้าบัญชีผู้ขาย:</strong> ต้องชำระผ่านระบบ ThaiPlay เท่านั้น</li>
                        <li><strong>ตรวจสอบเครดิตผู้ขาย:</strong> ดูดาว, รีวิว, และจำนวนงานที่ขายสำเร็จ</li>
                        <li><strong>อย่าให้รหัสผ่านโดยไม่จำเป็น:</strong> หากเป็นบริการเติมเงิน ควรเปลี่ยนรหัสผ่านทันทีหลังจบงาน</li>
                        <li><strong>บันทึกวิดีโอ/ภาพ:</strong> ขณะรับของหรือส่งของ เพื่อใช้เป็นหลักฐาน</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-4">ขั้นตอนการทำงานของระบบ</h2>
                    <div className="grid gap-4 md:grid-cols-4 text-center">
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="text-2xl font-bold text-gray-300 mb-2">1</div>
                            <div className="font-semibold">ชำระเงิน</div>
                            <div className="text-xs text-muted-foreground mt-1">ผู้ซื้อโอนเงินเข้าระบบกลาง</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="text-2xl font-bold text-gray-300 mb-2">2</div>
                            <div className="font-semibold">ส่งของ/บริการ</div>
                            <div className="text-xs text-muted-foreground mt-1">ผู้ขายเริ่มทำงานหรือส่งมอบไอดี</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="text-2xl font-bold text-gray-300 mb-2">3</div>
                            <div className="font-semibold">ตรวจสอบ</div>
                            <div className="text-xs text-muted-foreground mt-1">ผู้ซื้อเช็คของและกดยืนยัน</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="text-2xl font-bold text-gray-300 mb-2">4</div>
                            <div className="font-semibold">สำเร็จ</div>
                            <div className="text-xs text-muted-foreground mt-1">ระบบโอนเงินให้ผู้ขาย</div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
