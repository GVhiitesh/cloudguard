import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/common/states';
import { useResources } from '@/hooks/useResources';
import type { Resource } from '@/types/api';

const ENV_COLORS: Record<string, string> = {
  PROD: '#10B981',
  STAGING: '#6366F1',
  DEV: '#F59E0B',
  TEST: '#8B5CF6',
};

const TYPE_SHAPES: Record<string, string> = {
  VM: '●',
  RDS: '◆',
  S3: '■',
  LAMBDA: '▲',
  ECS: '⬟',
  EKS: '⬡',
};

function healthColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

interface Node {
  id: string;
  name: string;
  type: string;
  environment: string;
  status: string;
  healthScore: number;
  x: number;
  y: number;
  radius: number;
}

export function Topology() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data, isLoading, isError, error, refetch } = useResources({ pageSize: 200 });

  const nodes = useMemo(() => {
    if (!data?.data) return [];
    const resources = data.data;
    const envGroups = new Map<string, Resource[]>();
    for (const r of resources) {
      const list = envGroups.get(r.environment) || [];
      list.push(r);
      envGroups.set(r.environment, list);
    }

    const result: Node[] = [];
    const envKeys = [...envGroups.keys()].sort();
    const envCount = envKeys.length;

    envKeys.forEach((env, envIdx) => {
      const items = envGroups.get(env)!;
      const centerX = 200 + (envIdx * 500) / Math.max(envCount - 1, 1);
      const centerY = 250;
      const ringRadius = 80 + items.length * 8;

      items.forEach((r, i) => {
        const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
        result.push({
          id: r.id,
          name: r.name,
          type: r.type,
          environment: r.environment,
          status: r.status,
          healthScore: r.healthScore,
          x: centerX + Math.cos(angle) * ringRadius,
          y: centerY + Math.sin(angle) * ringRadius,
          radius: 18 + Math.min(r.healthScore / 20, 5),
        });
      });
    });
    return result;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue('--color-canvas').trim() || '#FAF9F5';
    const lineColor = style.getPropertyValue('--color-line').trim() || '#E5E3DA';
    const textColor = style.getPropertyValue('--color-ink').trim() || '#111315';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw connections within same environment
    const envGroups = new Map<string, Node[]>();
    for (const n of nodes) {
      const list = envGroups.get(n.environment) || [];
      list.push(n);
      envGroups.set(n.environment, list);
    }

    for (const [, group] of envGroups) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          ctx.beginPath();
          ctx.moveTo(group[i].x, group[i].y);
          ctx.lineTo(group[j].x, group[j].y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw nodes
    for (const n of nodes) {
      // Glow
      const gradient = ctx.createRadialGradient(n.x, n.y, n.radius * 0.5, n.x, n.y, n.radius * 2);
      gradient.addColorStop(0, healthColor(n.healthScore) + '30');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.fillStyle = healthColor(n.healthScore);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = ENV_COLORS[n.environment] || '#888';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Type icon
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TYPE_SHAPES[n.type] || '●', n.x, n.y);

      // Name label
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.name.length > 14 ? n.name.slice(0, 12) + '…' : n.name, n.x, n.y + n.radius + 14);
    }

    // Environment labels
    for (const [env, group] of envGroups) {
      const avgX = group.reduce((s, n) => s + n.x, 0) / group.length;
      const minY = Math.min(...group.map((n) => n.y - n.radius));
      ctx.fillStyle = ENV_COLORS[env] || '#888';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(env, avgX, minY - 30);
    }

    // Click handler
    function handleClick(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      for (const n of nodes) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < n.radius * n.radius) {
          navigate(`/resources/${n.id}`);
          break;
        }
      }
    }

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [nodes, navigate]);

  if (isLoading) return <LoadingState label="Loading topology…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2"><MapPin className="h-6 w-6" /> Topology Map</span>}
        subtitle="Interactive view of your resource connections grouped by environment."
      />

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Environment</span>
          {Object.entries(ENV_COLORS).map(([env, color]) => (
            <span key={env} className="flex items-center gap-1.5 text-xs font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {env}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Health</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-healthy" />Good</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-warning" />Warning</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-danger" />Critical</span>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-2">Type</span>
          {Object.entries(TYPE_SHAPES).map(([type, shape]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs font-medium">
              <span>{shape}</span> {type}
            </span>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <canvas
          ref={canvasRef}
          className="h-[500px] w-full cursor-pointer"
          style={{ display: 'block' }}
        />
      </Card>

      <p className="mt-3 text-xs text-muted">Click any node to view its Digital Twin details.</p>
    </div>
  );
}
