import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as analytics from '@/api/analytics';
import * as budgets from '@/api/budgets';
import * as alerts from '@/api/alerts';
import * as users from '@/api/users';
import * as simulator from '@/api/simulator';
import { qk } from './queryKeys';
import type { BudgetInput, InjectInput, Role } from '@/types/api';

// --- Analytics --------------------------------------------------------------

export function useSummary() {
  return useQuery({ queryKey: qk.analytics.summary, queryFn: analytics.getSummary });
}

export function useCostTrend(days = 30) {
  return useQuery({
    queryKey: qk.analytics.costTrend(days),
    queryFn: () => analytics.getCostTrend(days),
  });
}

export function useUtilization(days = 30) {
  return useQuery({
    queryKey: qk.analytics.utilization(days),
    queryFn: () => analytics.getUtilization(days),
  });
}

export function useCostForecast(days = 30) {
  return useQuery({
    queryKey: qk.analytics.costForecast(days),
    queryFn: () => analytics.getCostForecast(days),
  });
}

export function useByEnvironment(days = 30) {
  return useQuery({
    queryKey: qk.analytics.byEnvironment(days),
    queryFn: () => analytics.getByEnvironment(days),
  });
}

// --- Budgets ----------------------------------------------------------------

export function useBudgets() {
  return useQuery({ queryKey: qk.budgets.list, queryFn: budgets.listBudgets });
}

export function useBudgetStatus() {
  return useQuery({ queryKey: qk.budgets.status, queryFn: budgets.getBudgetStatus });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) => budgets.createBudget(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.budgets.all }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, limitPerMonth }: { id: string; limitPerMonth: number }) =>
      budgets.updateBudget(id, limitPerMonth),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.budgets.all }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgets.deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.budgets.all }),
  });
}

// --- Alerts -----------------------------------------------------------------

export function useAlerts(filters: { read?: boolean; kind?: string } = {}) {
  return useQuery({
    queryKey: qk.alerts.list(filters),
    queryFn: () => alerts.listAlerts(filters),
    // The detection jobs create alerts in the background, so poll for the badge.
    refetchInterval: 60_000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alerts.markAlertRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: alerts.markAllAlertsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

// --- Users (admin) ----------------------------------------------------------

export function useUsers(filters: { role?: Role; q?: string } = {}) {
  return useQuery({ queryKey: qk.users.list(filters), queryFn: () => users.listUsers(filters) });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; role?: Role } }) =>
      users.updateUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => users.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

// --- Simulator (admin, demo controls) ---------------------------------------

export function useInjectSpike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InjectInput) => simulator.injectSpike(input),
    onSuccess: () => {
      // Inject runs detection server-side, so fresh anomalies may already exist.
      qc.invalidateQueries({ queryKey: qk.anomalies.all });
      qc.invalidateQueries({ queryKey: qk.twin.all });
      qc.invalidateQueries({ queryKey: qk.alerts.all });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useRunDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: simulator.runDetection,
    onSuccess: () => qc.invalidateQueries(),
  });
}
