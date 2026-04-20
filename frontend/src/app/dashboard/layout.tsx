'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const navLinks = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/send', label: 'Send VEL' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/explorer', label: 'Explorer' }
]

export default function DashboardLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading || !user) return null

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const visibleLinks = [
    ...navLinks,
    ...(user.role === 'admin'
      ? [{ href: '/dashboard/admin', label: 'Admin' }]
      : [])
  ]

  return (
    <div className='min-h-screen bg-background'>
      <nav className='bg-card/80 backdrop-blur-md border-b border-card-border px-6 py-4 flex items-center justify-between sticky top-0 z-50'>
        <div className='flex items-center gap-8'>
          <Link href='/dashboard'>
            <h1 className='text-xl font-bold gradient-text'>Velen</h1>
          </Link>
          <div className='hidden md:flex items-center gap-1'>
            {visibleLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-white/10 text-white'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Dropdown Container */}
        <div className='relative'>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className='flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none'
          >
            <span className='text-sm text-muted hidden sm:block font-medium'>
              {user.username}
            </span> 
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                user.profilePictureUrl ||
                `https://ui-avatars.com/api/?name=${user.username}&background=random`
              }
              alt={`${user.username}'s profile`}
              className='w-9 h-9 rounded-full border border-card-border object-cover bg-card'
            />
          </button>

          {/* Modal / Dropdown Menu */}
          {isProfileOpen && (
            <>
              {/* Invisible backdrop to handle clicking outside to close */}
              <div
                className='fixed inset-0 z-40'
                onClick={() => setIsProfileOpen(false)}
              />
              <div className='absolute right-0 mt-3 w-56 bg-card border border-card-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2'>
                <div className='px-4 py-3 border-b border-card-border/50 mb-2'>
                  <p className='text-sm font-medium text-white truncate'>
                    {user.email}
                  </p>
                  <div className='flex items-center justify-between mt-1'>
                    <p className='text-xs text-muted capitalize'>{user.role}</p>
                    <span className='text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 capitalize'>
                      {user.status ?? 'verified'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className='w-full text-left px-4 py-2 text-sm text-danger hover:bg-white/5 transition-colors'
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </nav>
      <main className='max-w-5xl mx-auto px-6 py-8'>{children}</main>
    </div>
  )
}
