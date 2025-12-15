'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { translations, Language } from './translations'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: typeof translations.th
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    console.log('LanguageProvider: Rendering')
    const [language, setLanguageState] = useState<Language>('th')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedLang = localStorage.getItem('app-language') as Language
        if (savedLang && (savedLang === 'th' || savedLang === 'en')) {
            setLanguageState(savedLang)
        }
        setMounted(true)
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('app-language', lang)
    }

    const value = {
        language,
        setLanguage,
        t: translations[language]
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        console.error('useLanguage: Context is undefined!')
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
