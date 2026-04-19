import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Project, SixWeekPlan, PlanActivity, WeeklyPlan, DailyPlan, Contractor, Ticket } from '@/types/planner';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (val: string | undefined | null): string | null => {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
};

// Helper to convert DB row to app type
const toProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  createdAt: row.created_at,
  sixWeekPlans: [],
});

const toContractor = (row: any): Contractor => ({
  id: row.id,
  name: row.name,
  contact: row.contact || '',
  specialization: row.specialization || '',
});

const toActivity = (row: any): PlanActivity => ({
  id: row.id,
  category: row.category,
  contractorId: row.contractor_id || '',
  trade: row.trade,
  tradeActivity: row.trade_activity,
  unit: row.unit,
  estimatedQuantity: Number(row.estimated_quantity),
  floorUnits: row.floor_units || [],
  remainingQuantity: Number(row.remaining_quantity),
  completedQuantity: row.completed_quantity != null ? Number(row.completed_quantity) : undefined,
  carryForwardQuantity: row.carry_forward_quantity != null ? Number(row.carry_forward_quantity) : undefined,
});

const toWeeklyPlan = (row: any, dailyPlans: DailyPlan[]): WeeklyPlan => ({
  id: row.id,
  sixWeekPlanId: row.six_week_plan_id,
  taskId: row.task_id || '',
  weekNumber: row.week_number,
  category: row.category,
  contractorId: row.contractor_id || '',
  tradeActivity: row.trade_activity,
  unit: row.unit,
  estimatedQuantity: Number(row.estimated_quantity),
  completedQuantity: row.completed_quantity != null ? Number(row.completed_quantity) : undefined,
  floorUnits: row.floor_units || [],
  constraint: row.constraint_text,
  status: row.status,
  assignedToEngineer: row.assigned_to_engineer,
  remainingQuantity: Number(row.remaining_quantity),
  dailyPlans,
  isCarryForwardWeek: !!row.is_carry_forward_week,
  sourceActivityId: row.source_activity_id || undefined,
  sourceWeekNumber: row.source_week_number != null ? Number(row.source_week_number) : undefined,
  constraintDate: row.constraint_date || undefined,
responsiblePerson: row.responsible_person || undefined,
});

const toDailyPlan = (row: any): DailyPlan => ({
  id: row.id,
  weeklyPlanId: row.weekly_plan_id,
  dayNumber: row.day_number,
  date: row.date,
  plannedQuantity: Number(row.planned_quantity),
  unit: row.unit,
  constraint: row.constraint_text,
  floorUnits: row.floor_units || [],
  engineerNote: row.engineer_note,
  rov: row.rov,
  completedQuantity: row.completed_quantity != null ? Number(row.completed_quantity) : undefined,
  remainingQuantity: row.remaining_quantity != null ? Number(row.remaining_quantity) : undefined,
  isDone: row.is_done,
  supervisorNote: row.supervisor_note,
  constraintLog: row.constraint_log,
  validatedByEngineer: row.validated_by_engineer,
  confirmedByAdmin: row.confirmed_by_admin,
  status: row.status,
  constraintDate: row.constraint_date || undefined,
responsiblePerson: row.responsible_person || undefined,
});

const toTicket = (row: any): Ticket => ({
  id: row.id,
  projectId: row.project_id,
  sixWeekPlanId: row.six_week_plan_id || '',
  weeklyPlanId: row.weekly_plan_id || '',
  dailyPlanId: row.daily_plan_id || '',
  tradeName: row.trade_name,
  taskId: row.task_id,
  constraint: row.constraint_text,
  rovComment: row.rov_comment || '',
  date: row.date,
  targetQuantity: Number(row.target_quantity),
  completedQuantity: Number(row.completed_quantity),
  shortfallQuantity: Number(row.shortfall_quantity),
  recoveryId: row.recovery_id,
  contractorName: row.contractor_name,
  unit: row.unit,
  rov: row.rov || '',
  recoveryDeadline: row.recovery_deadline,
  contractorStatement: row.contractor_statement,
  assignedTo: row.assigned_to,
  status: row.status,
});

export const useSupabaseData = () => {
  const fetchFullProject = useCallback(async (projectId: string): Promise<Project | null> => {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (!proj) return null;

    const project = toProject(proj);
    const { data: swps } = await supabase.from('six_week_plans').select('*').eq('project_id', projectId);

    for (const swp of (swps || [])) {
      const { data: acts } = await supabase.from('plan_activities').select('*').eq('six_week_plan_id', swp.id);
      const { data: wps } = await supabase.from('weekly_plans').select('*').eq('six_week_plan_id', swp.id);

      const weeklyPlans: WeeklyPlan[] = [];
      for (const wp of (wps || [])) {
        const { data: dps } = await supabase.from('daily_plans').select('*').eq('weekly_plan_id', wp.id);
        weeklyPlans.push(toWeeklyPlan(wp, (dps || []).map(toDailyPlan)));
      }

     project.sixWeekPlans.push({
  id: swp.id,
  projectId: swp.project_id,
  name: swp.name,
  buildingName: swp.building_name,
  baseDurationWeeks: swp.base_duration_weeks ?? 6,
  extendedWeeks: swp.extended_weeks ?? 0,
  totalDurationWeeks: swp.total_duration_weeks ?? 6,
  carryForwardAvailable: !!swp.carry_forward_available,
  carryForwardCreatedUntilWeek: swp.carry_forward_created_until_week ?? 6,
  activities: (acts || []).map(toActivity),
  startDate: swp.start_date,
  endDate: swp.end_date,
  createdAt: swp.created_at,
  weeklyPlans,
  planType: swp.plan_type ?? 'six-week',
});
    }
    return project;
  }, []);

  const fetchAllProjects = useCallback(async (): Promise<Project[]> => {
    const { data: projs } = await supabase.from('projects').select('*');
    if (!projs) return [];
    const results: Project[] = [];
    for (const p of projs) {
      const full = await fetchFullProject(p.id);
      if (full) results.push(full);
    }
    return results;
  }, [fetchFullProject]);

  const fetchContractors = useCallback(async (): Promise<Contractor[]> => {
    const { data } = await supabase.from('contractors').select('*');
    return (data || []).map(toContractor);
  }, []);

  const fetchTickets = useCallback(async (): Promise<Ticket[]> => {
    const { data } = await supabase.from('tickets').select('*');
    return (data || []).map(toTicket);
  }, []);

  // --- UPSERT helpers ---

  const upsertProject = useCallback(async (project: Project, userId: string) => {
    await supabase.from('projects').upsert({
      id: project.id,
      user_id: userId,
      name: project.name,
      description: project.description || '',
    });
  }, []);

  const upsertContractor = useCallback(async (contractor: Contractor, userId: string) => {
    await supabase.from('contractors').upsert({
      id: contractor.id,
      user_id: userId,
      name: contractor.name,
      contact: contractor.contact || '',
      specialization: contractor.specialization || '',
    });
  }, []);

 const upsertSixWeekPlan = useCallback(async (plan: SixWeekPlan) => {
  await supabase.from('six_week_plans').upsert({
    id: plan.id,
    project_id: plan.projectId,
    name: plan.name,
    building_name: plan.buildingName,
    start_date: plan.startDate,
    end_date: plan.endDate,
    base_duration_weeks: plan.baseDurationWeeks ?? 6,
    extended_weeks: plan.extendedWeeks ?? 0,
    total_duration_weeks: plan.totalDurationWeeks ?? 6,
    carry_forward_available: plan.carryForwardAvailable ?? false,
    carry_forward_created_until_week: plan.carryForwardCreatedUntilWeek ?? 6,
    plan_type: plan.planType ?? 'six-week',
  });
}, []);



 const upsertActivity = useCallback(async (activity: PlanActivity, sixWeekPlanId: string) => {
  await supabase.from('plan_activities').upsert({
    id: activity.id,
    six_week_plan_id: sixWeekPlanId,
    category: activity.category,
    contractor_id: toUuidOrNull(activity.contractorId),
    trade: activity.trade,
    trade_activity: activity.tradeActivity,
    unit: activity.unit,
    estimated_quantity: activity.estimatedQuantity,
    floor_units: activity.floorUnits,
    remaining_quantity: activity.remainingQuantity,
    completed_quantity: activity.completedQuantity ?? null,
    carry_forward_quantity: activity.carryForwardQuantity ?? null,
  });
}, []);

const upsertWeeklyPlan = useCallback(async (wp: WeeklyPlan) => {
  await supabase.from('weekly_plans').upsert({
    id: wp.id,
    six_week_plan_id: wp.sixWeekPlanId,
    task_id: toUuidOrNull(wp.taskId),
    week_number: wp.weekNumber,
    category: wp.category,
    contractor_id: toUuidOrNull(wp.contractorId),
    trade_activity: wp.tradeActivity,
    unit: wp.unit,
    estimated_quantity: wp.estimatedQuantity,
    completed_quantity: wp.completedQuantity ?? null,
    floor_units: wp.floorUnits,
    constraint_text: wp.constraint,
    status: wp.status,
    assigned_to_engineer: wp.assignedToEngineer,
    remaining_quantity: wp.remainingQuantity,
    is_carry_forward_week: wp.isCarryForwardWeek ?? false,
    source_activity_id: toUuidOrNull(wp.sourceActivityId),
    source_week_number: wp.sourceWeekNumber ?? null,
    constraint_date: wp.constraintDate ?? null,
responsible_person: wp.responsiblePerson ?? null,
  });
}, []);

  const upsertDailyPlan = useCallback(async (dp: DailyPlan) => {
    await supabase.from('daily_plans').upsert({
      id: dp.id,
      weekly_plan_id: dp.weeklyPlanId,
      day_number: dp.dayNumber,
      date: dp.date,
      planned_quantity: dp.plannedQuantity,
      unit: dp.unit,
      constraint_text: dp.constraint,
      floor_units: dp.floorUnits,
      engineer_note: dp.engineerNote,
      rov: dp.rov,
      completed_quantity: dp.completedQuantity,
      remaining_quantity: dp.remainingQuantity,
      is_done: dp.isDone,
      supervisor_note: dp.supervisorNote,
      constraint_log: dp.constraintLog,
      validated_by_engineer: dp.validatedByEngineer,
      confirmed_by_admin: dp.confirmedByAdmin,
      status: dp.status,
      constraint_date: dp.constraintDate ?? null,
responsible_person: dp.responsiblePerson ?? null,
    });
  }, []);

  const upsertTicket = useCallback(async (ticket: Ticket) => {
    await supabase.from('tickets').upsert({
      id: ticket.id,
      project_id: ticket.projectId,
      six_week_plan_id: ticket.sixWeekPlanId || null,
      weekly_plan_id: ticket.weeklyPlanId || null,
      daily_plan_id: ticket.dailyPlanId || null,
      trade_name: ticket.tradeName,
      task_id: ticket.taskId,
      constraint_text: ticket.constraint,
      rov_comment: ticket.rovComment,
      date: ticket.date,
      target_quantity: ticket.targetQuantity,
      completed_quantity: ticket.completedQuantity,
      shortfall_quantity: ticket.shortfallQuantity,
      recovery_id: ticket.recoveryId,
      contractor_name: ticket.contractorName,
      unit: ticket.unit,
      rov: ticket.rov,
      recovery_deadline: ticket.recoveryDeadline,
      contractor_statement: ticket.contractorStatement,
      assigned_to: ticket.assignedTo,
      status: ticket.status,
    });
  }, []);

  return {
    fetchAllProjects,
    fetchFullProject,
    fetchContractors,
    fetchTickets,
    upsertProject,
    upsertContractor,
    upsertSixWeekPlan,
    upsertActivity,
    upsertWeeklyPlan,
    upsertDailyPlan,
    upsertTicket,
  };
};
