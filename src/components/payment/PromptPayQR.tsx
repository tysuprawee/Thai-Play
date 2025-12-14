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

export function PromptPayQR({ amount, phoneNumber = '0812345678' }: PromptPayQRProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

    useEffect(() => {
        const generateQR = async () => {
            try {
                const payload = generatePayload(phoneNumber, { amount })
                const url = await QRCode.toDataURL(payload)
                setQrCodeUrl(url)
            } catch (err) {
                console.error(err)
            }
        }
        generateQR()
    }, [amount, phoneNumber])

    if (!qrCodeUrl) return <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />

    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg">
            <h3 className="font-bold text-gray-900 border-b border-gray-200 w-full text-center pb-2">SCAN TO PAY</h3>
            <div className="relative w-64 h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="PromptPay QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
                <div className="text-sm text-gray-500">PromptPay ID</div>
                <div className="font-mono font-bold text-gray-800 text-lg">{phoneNumber}</div>
                <div className="text-xs text-gray-400 mt-1">ThaiPlay Official</div>
            </div>
        </div>
    )
}
