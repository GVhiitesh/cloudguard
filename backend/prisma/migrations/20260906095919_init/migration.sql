-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('EC2', 'RDS', 'S3', 'LAMBDA', 'EBS', 'OTHER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('DEV', 'STAGING', 'PROD');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('RUNNING', 'STOPPED');

-- CreateEnum
CREATE TYPE "Lifecycle" AS ENUM ('ACTIVE', 'IDLE', 'FLAGGED', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnomalyKind" AS ENUM ('COST_SPIKE', 'USAGE_SPIKE', 'IDLE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BudgetScope" AS ENUM ('GLOBAL', 'ENVIRONMENT', 'OWNER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'AWS',
    "region" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'RUNNING',
    "lifecycle" "Lifecycle" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" TEXT NOT NULL,
    "estCostPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "idleSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "cpu" DOUBLE PRECISION NOT NULL,
    "memory" DOUBLE PRECISION NOT NULL,
    "networkIn" DOUBLE PRECISION NOT NULL,
    "networkOut" DOUBLE PRECISION NOT NULL,
    "storageUsed" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "kind" "AnomalyKind" NOT NULL,
    "severity" "Severity" NOT NULL,
    "expected" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "estSaving" DOUBLE PRECISION NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "scope" "BudgetScope" NOT NULL,
    "scopeValue" TEXT,
    "limitPerMonth" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ResourceTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Resource_environment_idx" ON "Resource"("environment");

-- CreateIndex
CREATE INDEX "Resource_lifecycle_idx" ON "Resource"("lifecycle");

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "UsageMetric_resourceId_timestamp_idx" ON "UsageMetric"("resourceId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMetric_resourceId_timestamp_key" ON "UsageMetric"("resourceId", "timestamp");

-- CreateIndex
CREATE INDEX "Anomaly_status_idx" ON "Anomaly"("status");

-- CreateIndex
CREATE INDEX "Anomaly_resourceId_kind_status_idx" ON "Anomaly"("resourceId", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Anomaly_resourceId_kind_detectedAt_key" ON "Anomaly"("resourceId", "kind", "detectedAt");

-- CreateIndex
CREATE INDEX "Recommendation_resourceId_applied_idx" ON "Recommendation"("resourceId", "applied");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_scope_scopeValue_key" ON "Budget"("scope", "scopeValue");

-- CreateIndex
CREATE INDEX "Alert_userId_read_idx" ON "Alert"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_key_value_key" ON "Tag"("key", "value");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "_ResourceTags_AB_unique" ON "_ResourceTags"("A", "B");

-- CreateIndex
CREATE INDEX "_ResourceTags_B_index" ON "_ResourceTags"("B");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceTags" ADD CONSTRAINT "_ResourceTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceTags" ADD CONSTRAINT "_ResourceTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
