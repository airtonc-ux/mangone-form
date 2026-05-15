'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function SignInContent() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleSignIn = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/' })
  }

  const isDomainError = error === 'domain' || error === 'AccessDenied'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f1115' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.04) 40px, rgba(201,168,76,0.04) 41px)`
      }} />

      <div className="w-full max-w-md relative animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-12" style={{ background: 'var(--gold)' }} />
            <span style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>⚖</span>
            <div className="h-px w-12" style={{ background: 'var(--gold)' }} />
          </div>
          <h1 className="font-display text-4xl font-light tracking-wide text-white">Mangone Law Firm</h1>
          <p className="mt-2 text-sm tracking-widest uppercase" style={{ color: '#C9A84C', fontWeight: 500 }}>
            Recursos Humanos
          </p>
        </div>

        <div className="card p-8" style={{ background: '#1a1d23', border: '1px solid #2a2e37' }}>
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-medium text-white">Portal de Solicitudes</h2>
            <p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>
              Inicia sesión con tu cuenta corporativa para continuar
            </p>
          </div>

          {isDomainError && (
            <div className="mb-5 p-3 rounded-sm text-sm flex items-start gap-2"
              style={{ background: 'rgba(245, 108, 108, 0.1)', border: '1px solid #f56c6c', color: '#f56c6c' }}>
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="font-medium">Acceso denegado</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Solo se permiten cuentas con dominio <strong>@mangonelawfirmllc.com</strong>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: '#2a2e37' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Acceso seguro</span>
            <div className="flex-1 h-px" style={{ background: '#2a2e37' }} />
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-sm border transition-all duration-200"
            style={{
              borderColor: '#3f444d',
              background: loading ? '#2a2e37' : '#0f1115',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#f8f5ee'
            }}
          >
            {!loading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium" style={{ letterSpacing: '0.02em' }}>
                  Continuar con Google
                </span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                <span className="text-sm" style={{ color: '#94a3b8' }}>Redirigiendo...</span>
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs" style={{ color: '#94a3b8' }}>
            Solo accesible con cuentas <strong>@mangonelawfirmllc.com</strong>
          </p>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: '#A89B7A' }}>
          © {new Date().getFullYear()} Mangone Law Firm · Uso interno exclusivo
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
