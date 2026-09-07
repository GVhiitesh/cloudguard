import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, FieldError } from '@/components/ui/Input';
import { useCreateResource, useUpdateResource } from '@/hooks/useResources';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { RESOURCE_TYPES, ENVIRONMENTS } from '@/types/api';
import type { Resource } from '@/types/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['EC2', 'RDS', 'S3', 'LAMBDA', 'EBS', 'OTHER']),
  region: z.string().min(1, 'Region is required'),
  environment: z.enum(['DEV', 'STAGING', 'PROD']),
  status: z.enum(['RUNNING', 'STOPPED']),
  estCostPerDay: z.coerce.number().min(0),
  tags: z.string().optional(),
});
type Form = z.infer<typeof schema>;

/** Right-side drawer for create + edit, matching the "Add Resource" design. */
export function ResourceForm({
  open,
  onClose,
  resource,
}: {
  open: boolean;
  onClose: () => void;
  resource?: Resource;
}) {
  const create = useCreateResource();
  const update = useUpdateResource();
  const toast = useToast();
  const editing = Boolean(resource);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    values: resource
      ? {
          name: resource.name,
          type: resource.type,
          region: resource.region,
          environment: resource.environment,
          status: resource.status,
          estCostPerDay: resource.estCostPerDay,
          tags: resource.tags.map((t) => `${t.key}:${t.value}`).join(', '),
        }
      : {
          name: '',
          type: 'EC2',
          region: 'ap-south-1',
          environment: 'DEV',
          status: 'RUNNING',
          estCostPerDay: 0,
          tags: '',
        },
  });

  function parseTags(raw?: string) {
    if (!raw?.trim()) return undefined;
    return raw
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [key, ...rest] = chunk.split(':');
        return { key: key.trim(), value: (rest.join(':') || 'true').trim() };
      });
  }

  async function onSubmit(values: Form) {
    const payload = {
      name: values.name,
      type: values.type,
      region: values.region,
      environment: values.environment,
      status: values.status,
      estCostPerDay: values.estCostPerDay,
      tags: parseTags(values.tags),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: resource!.id, input: payload });
        toast.success('Resource updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Resource created');
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Resource' : 'Add Resource'}
      description={editing ? resource!.name : 'Register a new cloud resource for monitoring.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <Label>Name</Label>
            <Input {...register('name')} placeholder="api-gateway-prod-01" />
            <FieldError>{errors.name?.message}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select {...register('type')} className="w-full">
                {RESOURCE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Environment</Label>
              <Select {...register('environment')} className="w-full">
                {ENVIRONMENTS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Region</Label>
              <Input {...register('region')} placeholder="ap-south-1" />
              <FieldError>{errors.region?.message}</FieldError>
            </div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')} className="w-full">
                <option value="RUNNING">Running</option>
                <option value="STOPPED">Stopped</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Estimated cost per day (₹)</Label>
            <Input {...register('estCostPerDay')} type="number" step="0.01" min="0" />
            <FieldError>{errors.estCostPerDay?.message}</FieldError>
          </div>

          <div>
            <Label>Tags</Label>
            <Input {...register('tags')} placeholder="team:platform, env:prod" />
            <p className="mt-1 text-xs text-muted">Comma-separated key:value pairs.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="lime" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create resource'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
