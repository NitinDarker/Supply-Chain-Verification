'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage () {
  const router = useRouter()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(form.email, form.password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4'>
      <div className='w-full max-w-md text-left mb-4'>
        <Link
          href='/'
          className='group inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-all duration-200'
        >
          <ArrowLeft
            size={16}
            className='group-hover:-translate-x-1 transition-transform'
          />
          <span>Back to Home</span>
        </Link>
      </div>
      <div className='w-full max-w-md bg-card rounded-2xl p-8 card-glow animate-in'>
        <h1 className='text-2xl font-bold mb-1 gradient-text inline-block'>
          Welcome Back
        </h1>
        <p className='text-muted text-sm mb-6'>Login to your Velen account</p>

        {error && (
          <div className='bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-scale-in'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='animate-in-delay-1'>
            <label className='block text-sm text-muted mb-1.5'>Email</label>
            <input
              type='email'
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className='input-field'
              placeholder='john@example.com'
            />
          </div>

          <div className='animate-in-delay-1'>
            <label className='block text-sm text-muted mb-1.5'>Password</label>
            <input
              type='password'
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className='input-field'
              placeholder='Your password'
            />
          </div>

          <div className='text-right animate-in-delay-2'>
            <Link
              href='/forgot-password'
              className='text-sm text-primary hover:text-primary-hover transition-colors'
            >
              Forgot password?
            </Link>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full py-2.5 btn-gradient text-white rounded-lg font-medium animate-in-delay-2'
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className='text-muted text-sm text-center mt-6 animate-in-delay-3'>
          {"Don't have an account? "}
          <Link
            href='/register'
            className='text-primary hover:text-primary-hover transition-colors'
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
