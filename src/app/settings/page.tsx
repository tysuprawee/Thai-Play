'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Globe, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function SettingsPage() {
    const router = useRouter()
    const { language, setLanguage, t } = useLanguage()

    const handleSave = () => {
        // language is already saved by context
        toast.success(t.settings.save_success)
        router.refresh()
    }

    return (
        <div className="container mx-auto max-w-2xl py-10 px-4">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <Globe className="w-8 h-8 text-indigo-500" />
                {t.settings.title}
            </h1>

            <Card className="bg-[#1e202e] border-white/5 text-white">
                <CardHeader>
                    <CardTitle className="text-lg">{t.settings.general}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Language Selection */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-base">{t.settings.language}</Label>
                            <p className="text-sm text-gray-400">{t.settings.language_desc}</p>
                        </div>
                        <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                            <SelectTrigger className="w-[180px] bg-[#13151f] border-white/10 text-white">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#13151f] border-white/10 text-white">
                                <SelectItem value="th">ไทย (Thai)</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Future: Theme Selection */}
                    {/* 
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-base">Theme</Label>
                            <p className="text-sm text-gray-400">Dark mode is default</p>
                        </div>
                        <Switch checked={true} disabled />
                    </div> 
                    */}

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500">
                            <Save className="w-4 h-4 mr-2" />
                            {t.common.save}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
