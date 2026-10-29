import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  label?: string;
}

export function ExportButton({ endpoint, filename, label = 'Export CSV' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  async function download() {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? '/api';
      const res = await fetch(`${baseUrl}/export/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-panel disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      {loading ? 'Exporting…' : label}
    </button>
  );
}
