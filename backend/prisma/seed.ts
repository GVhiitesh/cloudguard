import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds users, resources, budgets and tags.
 *
 * The `sim:` tags are what the simulator reads to decide each resource's
 * behaviour, so the demo always has a spike, an idle resource and a control.
 * Run `npm run seed:metrics` afterwards to generate the history.
 */

const USERS = [
  { name: 'Admin', email: 'admin@cloudguard.dev', password: 'admin1234', role: 'ADMIN' as const },
  { name: 'Editor', email: 'editor@cloudguard.dev', password: 'editor1234', role: 'EDITOR' as const },
  { name: 'Viewer', email: 'viewer@cloudguard.dev', password: 'viewer1234', role: 'VIEWER' as const },
];

interface SeedResource {
  name: string;
  type: 'EC2' | 'RDS' | 'S3' | 'LAMBDA' | 'EBS' | 'OTHER';
  region: string;
  environment: 'DEV' | 'STAGING' | 'PROD';
  status: 'RUNNING' | 'STOPPED';
  estCostPerDay: number;
  metadata: Prisma.InputJsonValue;
  ownerEmail: string;
  tags: Array<{ key: string; value: string }>;
}

const RESOURCES: SeedResource[] = [
  {
    name: 'api-gateway-prod-01',
    type: 'EC2',
    region: 'ap-south-1',
    environment: 'PROD',
    status: 'RUNNING',
    estCostPerDay: 210,
    metadata: { instanceType: 'm5.large', vcpu: 2, memoryGb: 8 },
    ownerEmail: 'admin@cloudguard.dev',
    // The cost-spike scenario: the Rs 80 -> Rs 250 story from the spec.
    tags: [
      { key: 'sim', value: 'spike' },
      { key: 'team', value: 'platform' },
    ],
  },
  {
    name: 'analytics-worker-dev-04',
    type: 'EC2',
    region: 'ap-south-1',
    environment: 'DEV',
    status: 'RUNNING',
    estCostPerDay: 145,
    metadata: { instanceType: 'm5.xlarge', vcpu: 4, memoryGb: 16 },
    ownerEmail: 'editor@cloudguard.dev',
    // The idle scenario: provisioned, running, doing nothing.
    tags: [
      { key: 'sim', value: 'idle' },
      { key: 'team', value: 'data' },
    ],
  },
  {
    name: 'orders-db-prod',
    type: 'RDS',
    region: 'ap-south-1',
    environment: 'PROD',
    status: 'RUNNING',
    estCostPerDay: 380,
    metadata: { engine: 'postgres', version: '16', instanceClass: 'db.r6g.large' },
    ownerEmail: 'admin@cloudguard.dev',
    // The control: healthy, steady, should never raise anything.
    tags: [
      { key: 'sim', value: 'healthy' },
      { key: 'team', value: 'orders' },
    ],
  },
  {
    name: 'legacy-reports-bucket',
    type: 'S3',
    region: 'ap-south-1',
    environment: 'STAGING',
    status: 'RUNNING',
    estCostPerDay: 88,
    metadata: { storageClass: 'STANDARD', objects: 412_338 },
    ownerEmail: 'editor@cloudguard.dev',
    // Second idle case, storage flavoured -> DELETE_UNUSED recommendation.
    tags: [
      { key: 'sim', value: 'idle' },
      { key: 'team', value: 'finance' },
    ],
  },
  {
    name: 'image-resize-fn',
    type: 'LAMBDA',
    region: 'ap-south-1',
    environment: 'PROD',
    status: 'RUNNING',
    estCostPerDay: 42,
    metadata: { runtime: 'nodejs20.x', memoryMb: 512 },
    ownerEmail: 'viewer@cloudguard.dev',
    tags: [{ key: 'team', value: 'media' }],
  },
  {
    name: 'detached-volume-vol-0a1b',
    type: 'EBS',
    region: 'ap-south-1',
    environment: 'DEV',
    status: 'RUNNING',
    estCostPerDay: 55,
    metadata: { sizeGb: 500, volumeType: 'gp3', attached: false },
    ownerEmail: 'editor@cloudguard.dev',
    tags: [
      { key: 'sim', value: 'idle' },
      { key: 'team', value: 'platform' },
    ],
  },
  {
    name: 'staging-web-02',
    type: 'EC2',
    region: 'ap-south-1',
    environment: 'STAGING',
    status: 'STOPPED',
    estCostPerDay: 95,
    metadata: { instanceType: 't3.medium', vcpu: 2, memoryGb: 4 },
    ownerEmail: 'viewer@cloudguard.dev',
    tags: [{ key: 'team', value: 'web' }],
  },
  {
    name: 'search-index-prod',
    type: 'OTHER',
    region: 'ap-south-1',
    environment: 'PROD',
    status: 'RUNNING',
    estCostPerDay: 130,
    metadata: { service: 'OpenSearch', nodes: 3 },
    ownerEmail: 'admin@cloudguard.dev',
    tags: [{ key: 'team', value: 'search' }],
  },
];

async function main() {
  console.log('Seeding users...');
  const users = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        name: u.name,
        email: u.email,
        password: await bcrypt.hash(u.password, 10),
        role: u.role,
      },
    });
    users.set(u.email, user.id);
    console.log(`  ${user.email} (${user.role})`);
  }

  console.log('Seeding resources...');
  for (const r of RESOURCES) {
    const tagIds = await Promise.all(
      r.tags.map(async (t) => {
        const tag = await prisma.tag.upsert({
          where: { key_value: { key: t.key, value: t.value } },
          update: {},
          create: t,
        });
        return { id: tag.id };
      }),
    );

    // Resources have no natural unique key, so match on (name, ownerId) to keep
    // re-running the seed from creating duplicates.
    const ownerId = users.get(r.ownerEmail)!;
    const existing = await prisma.resource.findFirst({ where: { name: r.name, ownerId } });

    const data = {
      name: r.name,
      type: r.type,
      region: r.region,
      environment: r.environment,
      status: r.status,
      estCostPerDay: r.estCostPerDay,
      metadata: r.metadata,
      ownerId,
      tags: { set: tagIds },
    };

    if (existing) {
      await prisma.resource.update({ where: { id: existing.id }, data });
    } else {
      await prisma.resource.create({ data: { ...data, tags: { connect: tagIds } } });
    }
    console.log(`  ${r.name} [${r.type}/${r.environment}]`);
  }

  console.log('Seeding budgets...');
  const budgets = [
    { scope: 'GLOBAL' as const, scopeValue: null, limitPerMonth: 40_000 },
    { scope: 'ENVIRONMENT' as const, scopeValue: 'PROD', limitPerMonth: 25_000 },
    { scope: 'ENVIRONMENT' as const, scopeValue: 'DEV', limitPerMonth: 6_000 },
    { scope: 'ENVIRONMENT' as const, scopeValue: 'STAGING', limitPerMonth: 8_000 },
  ];
  for (const b of budgets) {
    // Postgres treats NULLs as distinct, so the (scope, scopeValue) unique index
    // does not cover the GLOBAL row. Match it explicitly instead of upserting.
    const existing = await prisma.budget.findFirst({
      where: { scope: b.scope, scopeValue: b.scopeValue },
    });
    if (existing) {
      await prisma.budget.update({
        where: { id: existing.id },
        data: { limitPerMonth: b.limitPerMonth },
      });
    } else {
      await prisma.budget.create({ data: b });
    }
    console.log(`  ${b.scope}${b.scopeValue ? `:${b.scopeValue}` : ''} = Rs ${b.limitPerMonth}/mo`);
  }

  console.log('\nSeed complete. Next: npm run seed:metrics');
  console.log('Login: admin@cloudguard.dev / admin1234');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
