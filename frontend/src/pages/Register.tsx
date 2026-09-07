import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/Input';
import { register as registerApi } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type Form = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setServerError(null);
    try {
      const { token, user } = await registerApi(values.name, values.email, values.password);
      setAuth(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  }

  const field = (
    icon: typeof User,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    error?: string,
    label?: string,
  ) => {
    const Icon = icon;
    return (
      <div>
        {label && <label className="eyebrow mb-1.5 block">{label}</label>}
        <div className="relative">
          <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            {...props}
            className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <FieldError>{error}</FieldError>
      </div>
    );
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="font-display text-4xl font-bold text-ink">Create account</h2>
        <p className="mt-2 text-muted">
          The first account on a fresh install becomes the Admin.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {field(User, { ...register('name'), placeholder: 'Your name' }, errors.name?.message, 'Name')}
        {field(
          Mail,
          { ...register('email'), type: 'email', placeholder: 'you@company.com' },
          errors.email?.message,
          'Email',
        )}
        {field(
          Lock,
          { ...register('password'), type: 'password', placeholder: 'At least 8 characters' },
          errors.password?.message,
          'Password',
        )}

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
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ink underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
