'use client'

import { useEffect, useState } from 'react'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface PromptPayQRProps {
    amount: number
    phoneNumber?: string // Defaults to a test number if not provided
}

export function PromptPayQR({ amount, phoneNumber }: PromptPayQRProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
    const ppId = phoneNumber || process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0812345678'
    const accountName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME

    useEffect(() => {
        const generateQR = async () => {
            try {
                const payload = generatePayload(ppId, { amount })
                const url = await QRCode.toDataURL(payload)
                setQrCodeUrl(url)
            } catch (err) {
                console.error(err)
            }
        }
        if (ppId) generateQR()
    }, [amount, ppId])

    if (!qrCodeUrl) return <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />

    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg">
            <div className="w-full text-center border-b border-gray-200 pb-2">
                <h3 className="font-bold text-gray-900">SCAN TO PAY</h3>
                {accountName && <div className="text-xs text-gray-500 mt-1">{accountName}</div>}
            </div>
            <div className="relative w-64 h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="PromptPay QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
                <div className="text-sm text-gray-500">PromptPay ID</div>
                <div className="font-mono font-bold text-gray-800 text-lg">{ppId}</div>
                <div className="text-xs text-gray-400 mt-1">ThaiPlay Official</div>
            </div>
        </div>
    )
}
