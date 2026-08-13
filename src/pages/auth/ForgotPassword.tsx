import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-primary-50 to-slate-100 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            We'll email you a secure link to reset it.
          </p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-600/10 dark:text-success-300">
            Check your inbox for a reset link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label required>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@irestore.com"
              />
            </div>
            {error && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-600/10 dark:text-danger-300">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
