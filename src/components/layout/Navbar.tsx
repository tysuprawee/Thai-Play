'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ShoppingBag, Menu, User, Bell } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'

export function Navbar() {
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center">
                <div className="mr-8 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                        <span className="hidden font-bold sm:inline-block">ThaiPlay</span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link href="/browse" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            หมวดหมู่
                        </Link>
                        <Link href="/trust" className="transition-colors hover:text-foreground/80 text-foreground/60">
                            ความปลอดภัย
                        </Link>
                    </nav>
                </div>

                {/* Mobile Menu */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="pr-0">
                        <div className="px-7">
                            <Link href="/" className="flex items-center">
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                <span className="font-bold">ThaiPlay</span>
                            </Link>
                        </div>
                        <div className="flex flex-col gap-4 py-4 px-7">
                            <Link href="/browse" className="text-sm font-medium">หมวดหมู่</Link>
                            <Link href="/trust" className="text-sm font-medium">ความปลอดภัย</Link>
                            <Link href="/sell" className="text-sm font-medium text-primary">ลงขายสินค้า</Link>
                        </div>
                    </SheetContent>
                </Sheet>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="ค้นหาเกม, ไอเท็ม, บริการ..."
                                className="pl-9 md:w-[300px] lg:w-[400px]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                                                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                                                <p className="text-xs leading-none text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild><Link href="/profile">โปรไฟล์ของฉัน</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href="/orders">รายการคำสั่งซื้อ</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href="/sell">ลงขายสินค้า</Link></DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
                                            ออกจากระบบ
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" asChild>
                                    <Link href="/login">เข้าสู่ระบบ</Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/register">สมัครสมาชิก</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
