'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/supabase';
import { MdEmail, MdLock } from 'react-icons/md';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await authHelpers.signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to survey after successful login
        router.push('/survey');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ backgroundColor: 'var(--mint-bg)' }}>
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full" style={{ 
          background: 'radial-gradient(circle, rgba(74, 124, 89, 0.02) 0%, transparent 70%)'
        }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full" style={{ 
          background: 'radial-gradient(circle, rgba(74, 124, 89, 0.02) 0%, transparent 70%)'
        }} />
        
        {/* Seeding Illustration - Left Side */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.15 }}>
          <Image 
            src="/Seeding-pana.svg" 
            alt="Seeding illustration" 
            width={500} 
            height={500}
            priority
          />
        </div>
        
        {/* Gardening Illustration */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.15 }}>
          <Image 
            src="/Gardening-pana.svg" 
            alt="Gardening illustration" 
            width={500} 
            height={500}
            priority
          />
        </div>
      </div>

      {/* Login Card */}
      <div 
        className="relative w-full max-w-md rounded-2xl"
        style={{
          backgroundColor: 'var(--card-white)',
          padding: '48px',
          boxShadow: '0 8px 24px rgba(31, 58, 46, 0.12)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--forest-text)', fontWeight: 700 }}
          >
            Welcome Back
          </h1>
          <p 
            className="text-base"
            style={{ color: 'var(--sage-muted)', fontWeight: 400 }}
          >
            Sign in to continue your green journey
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 p-3 rounded-lg text-sm"
            style={{ 
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #FCA5A5'
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--forest-text)' }}
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdEmail style={{ color: 'var(--sage-muted)', fontSize: '20px' }} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl text-base transition-all duration-200 outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1.5px solid var(--input-border)',
                  color: 'var(--forest-text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--fresh-green)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74, 124, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--input-border)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--forest-text)' }}
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdLock style={{ color: 'var(--sage-muted)', fontSize: '20px' }} />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl text-base transition-all duration-200 outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1.5px solid var(--input-border)',
                  color: 'var(--forest-text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--fresh-green)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74, 124, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--input-border)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: 'var(--fresh-green)' }}
              />
              <span className="ml-2 text-sm" style={{ color: 'var(--sage-muted)' }}>
                Remember me
              </span>
            </label>
            <a 
              href="#" 
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--fresh-green)' }}
            >
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-base transition-all duration-200"
            style={{
              backgroundColor: loading ? 'var(--sage-muted)' : 'var(--button-green)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(46, 93, 63, 0.2)',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'var(--button-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(31, 58, 46, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'var(--button-green)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 93, 63, 0.2)';
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm">
          <span style={{ color: 'var(--sage-muted)' }}>Don't have an account?</span>{' '}
          <Link 
            href="/signup"
            className="font-semibold hover:underline"
            style={{ color: 'var(--fresh-green)', fontWeight: 600 }}
          >
            Sign Up
          </Link>
        </p>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-center" style={{ color: 'var(--sage-muted)' }}>
        <a 
          href="https://storyset.com/nature" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: 'var(--sage-muted)' }}
        >
          Nature illustrations by Storyset
        </a>
        {' • '}
        <a 
          href="https://storyset.com/work" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: 'var(--sage-muted)' }}
        >
          Work illustrations by Storyset
        </a>
      </div>
    </div>
  );
}
