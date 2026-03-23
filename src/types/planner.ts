export type Role = 'admin' | 'supervisor' | 'engineer';

export interface DailyTarget {
  id: string;
  weekNumber: number;
  date: string;
  contractor: string;
  trade: string;
  zone: string;
  floor: string;
  description: string;
  targetQuantity: number;
  grandTarget: number;
  unit: string;
  status: 'pending' | 'forwarded' | 'logged' | 'validated' | 'confirmed';
  // Supervisor fields
  completedQuantity?: number;
  isDone?: boolean;
  supervisorNote?: string;
  // Engineer validation
  constraintLog?: string;
  validatedByEngineer?: boolean;
  // Admin confirmation
  confirmedByAdmin?: boolean;
}

export interface SixWeekPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  contractors: string[];
  tasks: DailyTarget[];
  createdAt: string;
}
