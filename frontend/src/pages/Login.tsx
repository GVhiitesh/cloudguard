import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/Input';
import { login } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setServerError(null);
    try {
      const { token, user } = await login(values.email, values.password);
      setAuth(token, user);
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="font-display text-4xl font-bold text-ink">Welcome back</h2>
        <p className="mt-2 text-muted">Sign in to your CloudGuard workspace.</p>
      </div>

      {/* SSO — visual only; this backend authenticates with email + password */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="SSO is not wired to this backend"
          className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-medium opacity-60"
        >
          GitHub Enterprise
        </button>
        <button
          type="button"
          disabled
          title="SSO is not wired to this backend"
          className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-medium opacity-60"
        >
          Okta / SAML
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="eyebrow">or continue with work email</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="eyebrow mb-1.5 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              {...register('email')}
              type="email"
              placeholder="you@company.com"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="Your password"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-11 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-2 hover:text-ink"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        {serverError && (
          <div className="rounded-card bg-danger-bg px-4 py-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        <Button
          type="submit"
          variant="lime"
          size="lg"
          loading={isSubmitting}
          className="h-12 w-full"
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-ink underline">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}
