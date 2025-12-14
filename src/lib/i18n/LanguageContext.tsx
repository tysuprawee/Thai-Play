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

    // While not mounted (SSR), default to Thai to match server render or prevent hydration mismatch?
    // Actually, to correctly handle hydration, we should render 'th' initially if we don't know, 
    // but that might cause flash. 
    // For this MVP, we will accept 'th' as default.

    const value = {
        language,
        setLanguage,
        t: translations[language]
    }

    if (!mounted) {
        // Return null or default to prevent hydration mismatch if local storage differs from server default?
        // Safest is to render children with default state, then useEffect updates it.
        // But that causes flicker.
        // Let's just return children. value will use default 'th'.
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
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
