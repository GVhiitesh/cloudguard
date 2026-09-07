import axios, { AxiosError } from 'axios';
import type { ApiError } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

client.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    // An expired or revoked token should drop us straight back to login rather
    // than letting every subsequent query fail one by one.
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

/** Pulls the backend's `{ error, details }` body out of an axios failure. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const body = err.response?.data;
    if (body?.details?.length) {
      return body.details.map((d) => `${d.field}: ${d.message}`).join(', ');
    }
    if (body?.error) return body.error;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the API. Is the backend running?';
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

/** Drops undefined/empty values so they never become `?type=undefined`. */
export function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}
