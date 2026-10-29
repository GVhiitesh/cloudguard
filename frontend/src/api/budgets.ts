import { client } from './client';
import type { Budget, BudgetInput, BudgetStatusResponse } from '@/types/api';

export async function listBudgets(): Promise<Budget[]> {
  const { data } = await client.get<Budget[]>('/budgets');
  return data;
}

export async function getBudgetStatus(): Promise<BudgetStatusResponse> {
  const { data } = await client.get<BudgetStatusResponse>('/budgets/status');
  return data;
}

export async function createBudget(input: BudgetInput): Promise<Budget> {
  const { data } = await client.post<Budget>('/budgets', input);
  return data;
}

export async function updateBudget(id: string, limitPerMonth: number): Promise<Budget> {
  const { data } = await client.patch<Budget>(`/budgets/${id}`, { limitPerMonth });
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  await client.delete(`/budgets/${id}`);
}
