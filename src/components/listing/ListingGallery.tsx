'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

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

                    <DialogContent className="max-w-[100vw] w-screen h-screen bg-black/95 border-none p-0 flex flex-col items-center justify-center shadow-none focus:outline-none z-[100]" showCloseButton={false}>
                        <DialogTitle className="sr-only">Image View</DialogTitle>

                        {/* Close Button */}
                        <div className="absolute top-4 right-4 z-50 flex gap-2">
                            <DialogClose className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
                                <X className="w-6 h-6" />
                            </DialogClose>
                        </div>

                        {/* Image Viewer Area */}
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                            <TransformWrapper
                                initialScale={1}
                                minScale={1}
                                maxScale={4}
                                centerOnInit
                            >
                                {({ zoomIn, zoomOut, resetTransform }) => (
                                    <>
                                        {/* Zoom Controls */}
                                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex gap-4 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/10">
                                            <button onClick={() => zoomIn()} className="p-2 text-white hover:text-indigo-400 transition-colors">
                                                <ZoomIn className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => zoomOut()} className="p-2 text-white hover:text-indigo-400 transition-colors">
                                                <ZoomOut className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => resetTransform()} className="p-2 text-white hover:text-indigo-400 transition-colors">
                                                <RotateCcw className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                            <div className="relative w-[90vw] h-[80vh]">
                                                <Image
                                                    src={mainImage.media_url}
                                                    alt="Full View"
                                                    fill
                                                    className="object-contain"
                                                    quality={100}
                                                />
                                            </div>
                                        </TransformComponent>
                                    </>
                                )}
                            </TransformWrapper>

                            {/* Navigation in Lightbox (Outside TransformWrapper so it doesn't move) */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-white/10 transition-colors border border-white/10 z-50"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-white/10 transition-colors border border-white/10 z-50"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnail Strip in Lightbox */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90%] p-2 bg-black/50 rounded-xl backdrop-blur-sm border border-white/10 z-50">
                            {images.map((img, idx) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
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
