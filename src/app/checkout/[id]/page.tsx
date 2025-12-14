'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShieldCheck, CreditCard, Wallet, QrCode } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import { toast } from 'sonner'
import { createOrder } from '@/app/actions/order'

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: listingId } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [listing, setListing] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('qrcode')
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push(`/login?next=/checkout/${listingId}`)
                return
            }
            setUser(user)

            const { data: listingData, error } = await supabase
                .from('listings')
                .select('*, profiles(display_name), listing_media(media_url)')
                .eq('id', listingId)
                .single()

            if (error || !listingData) {
                toast.error('Listing not found')
                router.push('/')
                return
            }
            setListing(listingData)
            setLoading(false)
        }
        fetchData()
    }, [listingId])

    const handleConfirmOrder = async () => {
        if (!user || !listing) return
        setSubmitting(true)

        try {
            // Server Action to Create Order
            const orderId = await createOrder(listing.id, paymentMethod)
            toast.success('Place order successfully!')
            router.push(`/orders/${orderId}`)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Failed to place order')
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
    }

    const mainImage = listing.listing_media?.[0]?.media_url || '/placeholder.png'

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4">
            <h1 className="text-3xl font-bold text-white mb-8">Confirm Order / ยืนยันคำสั่งซื้อ</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Order Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Item Details */}
                    <Card className="bg-[#1e202e] border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">รายการสินค้า</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="relative w-24 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image src={mainImage} alt={listing.title_th} fill className="object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{listing.title_th}</h3>
                                    <p className="text-gray-400 text-sm mb-2">{listing.profiles?.display_name}</p>
                                    <div className="text-indigo-400 font-bold">{formatPrice(listing.price_min)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <Card className="bg-[#1e202e] border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">วิธีการชำระเงิน</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                                <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${paymentMethod === 'qrcode' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-[#13151f]'}`}>
                                    <RadioGroupItem value="qrcode" id="qrcode" />
                                    <Label htmlFor="qrcode" className="flex-1 cursor-pointer flex items-center gap-3 text-white">
                                        <QrCode className="w-5 h-5 text-indigo-400" />
                                        <span>QR PromptPay (แนะนำ)</span>
                                    </Label>
                                </div>
                                <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${paymentMethod === 'wallet' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-[#13151f]'}`}>
                                    <RadioGroupItem value="wallet" id="wallet" />
                                    <Label htmlFor="wallet" className="flex-1 cursor-pointer flex items-center gap-3 text-white">
                                        <Wallet className="w-5 h-5 text-indigo-400" />
                                        <span>ThaiPlay Wallet (เร็วๆ นี้)</span>
                                    </Label>
                                </div>
                                <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${paymentMethod === 'credit' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-[#13151f]'}`}>
                                    <RadioGroupItem value="credit" id="credit" disabled />
                                    <Label htmlFor="credit" className="flex-1 cursor-not-allowed flex items-center gap-3 text-gray-500">
                                        <CreditCard className="w-5 h-5" />
                                        <span>บัตรเครดิต/เดบิต (ปิดปรับปรุง)</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summary */}
                <div className="md:col-span-1">
                    <Card className="bg-[#1e202e] border-white/5 sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-white">สรุปยอดชำระ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-gray-300">
                                <span>ราคาสินค้า</span>
                                <span>{formatPrice(listing.price_min)}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>ค่าธรรมเนียม</span>
                                <span>฿0.00</span>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex justify-between text-white font-bold text-lg">
                                <span>ยอดรวมสุทธิ</span>
                                <span className="text-indigo-400">{formatPrice(listing.price_min)}</span>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 text-lg"
                                    onClick={handleConfirmOrder}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        'ชำระเงินทันที'
                                    )}
                                </Button>
                                <div className="mt-3 flex items-center justify-center text-xs text-green-400 gap-1 opacity-80">
                                    <ShieldCheck className="w-3 h-3" />
                                    เงินของคุณจะถูกเก็บไว้ที่ระบบกลางจนกว่าคุณจะได้รับสินค้า
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
