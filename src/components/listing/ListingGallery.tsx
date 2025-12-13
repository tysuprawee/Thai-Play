'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListingGalleryProps {
    images: {
        id: string
        media_url: string
        sort_order: number,
        [key: string]: any
    }[]
    title: string
}

export function ListingGallery({ images, title }: ListingGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)

    if (!images || images.length === 0) {
        return (
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                <span className="text-lg">No Images Available</span>
            </div>
        )
    }

    const handlePrev = () => {
        setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }

    const handleNext = () => {
        setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }

    const mainImage = images[selectedIndex]

    return (
        <div className="space-y-4">
            {/* Main Image Display */}
            <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Image */}
                    <Image
                        src={mainImage.media_url}
                        alt={`${title} - Image ${selectedIndex + 1}`}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Arrows (Only if multiple) */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}

                {/* Enlarge Button */}
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogTrigger asChild>
                        <button className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] h-[90vh] bg-black/95 border-white/10 p-0 flex flex-col justify-center items-center shadow-2xl">
                        <DialogTitle className="sr-only">Image View</DialogTitle>

                        {/* Close Button Override */}
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-4 right-4 z-50 p-2 text-white/70 hover:text-white"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <div className="relative w-full h-full flex items-center justify-center">
                            <Image
                                src={mainImage.media_url}
                                alt="Full View"
                                fill
                                className="object-contain"
                            />

                            {/* Navigation in Lightbox */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/50 text-white hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/50 text-white hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnail Strip in Lightbox */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80%] p-2 bg-black/50 rounded-full backdrop-blur-sm">
                            {images.map((img, idx) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                                        selectedIndex === idx ? "border-indigo-500 scale-110" : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <Image src={img.media_url} alt="Thumb" fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Thumbnail Navigation (Page Level) */}
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {images.map((img, idx) => (
                        <button
                            key={img.id}
                            onClick={() => setSelectedIndex(idx)}
                            className={cn(
                                "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:opacity-100",
                                selectedIndex === idx ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-transparent opacity-70 hover:border-gray-500"
                            )}
                        >
                            <Image
                                src={img.media_url}
                                alt={`Thumbnail ${idx + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
