import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  Project,
  SixWeekPlan,
  PlanActivity,
  WeeklyPlan,
  DailyPlan,
  Contractor,
  Ticket,
  BacklogItem
} from '@/types/planner';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (val: string | undefined | null): string | null => {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
};

const totalQty = (rows: any[] = []) =>
  rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

const totalCompletedQty = (rows: any[] = []) =>
  rows.reduce((sum, r) => sum + Number(r.completedQuantity || 0), 0);

const totalRemainingQty = (rows: any[] = []) =>
  rows.reduce((sum, r) => {
    const planned = Number(r.quantity || 0);
    const completed = Number(r.completedQuantity || 0);
    return sum + Math.max(0, planned - completed);
  }, 0);

const getFloorsFromBreakdown = (rows: any[] = []) =>
  Array.from(new Set(rows.map(r => r.floorUnit).filter(Boolean)));

const getUnitsFromBreakdown = (rows: any[] = []) =>
  Array.from(new Set(rows.map(r => r.unit).filter(Boolean)));

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

const toActivity = (row: any): PlanActivity => {
  const quantityBreakdown = row.quantity_breakdown || [];

  return {
    id: row.id,
    category: row.category,
    contractorId: row.contractor_id || '',
    trade: row.trade,
    tradeActivity: row.trade_activity,

    quantityBreakdown,

    units: row.units || getUnitsFromBreakdown(quantityBreakdown) || (row.unit ? [row.unit] : []),
    unit: row.unit || getUnitsFromBreakdown(quantityBreakdown)[0] || undefined,

    estimatedQuantity: Number(row.estimated_quantity || totalQty(quantityBreakdown)),
    floorUnits: row.floor_units || getFloorsFromBreakdown(quantityBreakdown),
    remainingQuantity: Number(row.remaining_quantity || totalRemainingQty(quantityBreakdown)),

    completedQuantity: row.completed_quantity != null ? Number(row.completed_quantity) : undefined,
    carryForwardQuantity: row.carry_forward_quantity != null ? Number(row.carry_forward_quantity) : undefined,
  };
};

const toWeeklyPlan = (row: any, dailyPlans: DailyPlan[]): WeeklyPlan => {
  const quantityBreakdown = row.quantity_breakdown || [];

  return {
    id: row.id,
    sixWeekPlanId: row.six_week_plan_id,
    taskId: row.task_id || '',
    weekNumber: row.week_number,
    category: row.category,
    contractorId: row.contractor_id || '',
    tradeActivity: row.trade_activity,
weekStartDate: row.week_start_date || undefined,
weekEndDate: row.week_end_date || undefined,
    quantityBreakdown,

    units: row.units || getUnitsFromBreakdown(quantityBreakdown) || (row.unit ? [row.unit] : []),
    unit: row.unit || getUnitsFromBreakdown(quantityBreakdown)[0] || undefined,

    estimatedQuantity: Number(row.estimated_quantity || totalQty(quantityBreakdown)),
    completedQuantity: row.completed_quantity != null ? Number(row.completed_quantity) : undefined,
    floorUnits: row.floor_units || getFloorsFromBreakdown(quantityBreakdown),

    constraint: row.constraint_text,
    constraintDate: row.constraint_date || undefined,
    responsiblePerson: row.responsible_person || undefined,

    status: row.status,
    assignedToEngineer: row.assigned_to_engineer,
    remainingQuantity: Number(row.remaining_quantity || totalRemainingQty(quantityBreakdown)),
    dailyPlans,

    isCarryForwardWeek: !!row.is_carry_forward_week,
    sourceActivityId: row.source_activity_id || undefined,
    sourceWeekNumber: row.source_week_number != null ? Number(row.source_week_number) : undefined,
  };
};

const toDailyPlan = (row: any): DailyPlan => {
  const quantityBreakdown = row.quantity_breakdown || [];

  return {
    id: row.id,
    weeklyPlanId: row.weekly_plan_id,
    dayNumber: row.day_number,
    date: row.date,

    quantityBreakdown,

    plannedQuantity: Number(row.planned_quantity || totalQty(quantityBreakdown)),
    units: row.units || getUnitsFromBreakdown(quantityBreakdown) || (row.unit ? [row.unit] : []),
    unit: row.unit || getUnitsFromBreakdown(quantityBreakdown)[0] || undefined,

    constraint: row.constraint_text,
    constraintDate: row.constraint_date || undefined,
    responsiblePerson: row.responsible_person || undefined,

    floorUnits: row.floor_units || getFloorsFromBreakdown(quantityBreakdown),
    engineerNote: row.engineer_note,
    rov: row.rov,

    completedQuantity: row.completed_quantity != null
      ? Number(row.completed_quantity)
      : totalCompletedQty(quantityBreakdown) || undefined,

    remainingQuantity: row.remaining_quantity != null
      ? Number(row.remaining_quantity)
      : totalRemainingQty(quantityBreakdown),

    isDone: row.is_done,
    supervisorNote: row.supervisor_note,
    constraintLog: row.constraint_log,
    validatedByEngineer: row.validated_by_engineer,
    confirmedByAdmin: row.confirmed_by_admin,
    status: row.status,
  };
};

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
  units: row.units || (row.unit ? [row.unit] : []),
unit: row.unit || undefined,
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
    plan_type: plan.planType ?? 'six-week',
  });
}, []);



const upsertActivity = useCallback(async (activity: PlanActivity, sixWeekPlanId: string) => {
  const rows = activity.quantityBreakdown || [];
  const floors = getFloorsFromBreakdown(rows);
  const units = getUnitsFromBreakdown(rows);

  await supabase.from('plan_activities').upsert({
    id: activity.id,
    six_week_plan_id: sixWeekPlanId,
    category: activity.category,
    contractor_id: toUuidOrNull(activity.contractorId),
    trade: activity.trade,
    trade_activity: activity.tradeActivity,

    quantity_breakdown: rows,

    units: rows.length ? units : activity.units ?? [],
    unit: rows.length ? units[0] ?? null : activity.units?.[0] ?? activity.unit ?? null,

    estimated_quantity: rows.length ? totalQty(rows) : activity.estimatedQuantity,
    floor_units: rows.length ? floors : activity.floorUnits,
    remaining_quantity: rows.length ? totalRemainingQty(rows) : activity.remainingQuantity,

    completed_quantity: activity.completedQuantity ?? null,
    carry_forward_quantity: activity.carryForwardQuantity ?? null,
  });
}, []);

const upsertWeeklyPlan = useCallback(async (wp: WeeklyPlan) => {
  const rows = wp.quantityBreakdown || [];
  const floors = getFloorsFromBreakdown(rows);
  const units = getUnitsFromBreakdown(rows);

  await supabase.from('weekly_plans').upsert({
    id: wp.id,
    six_week_plan_id: wp.sixWeekPlanId,
    task_id: toUuidOrNull(wp.taskId),
    week_number: wp.weekNumber,
    category: wp.category,
    contractor_id: toUuidOrNull(wp.contractorId),
    trade_activity: wp.tradeActivity,
    week_start_date: wp.weekStartDate ?? null,
    week_end_date: wp.weekEndDate ?? null,
    quantity_breakdown: rows,

    units: rows.length ? units : wp.units ?? [],
    unit: rows.length ? units[0] ?? null : wp.units?.[0] ?? wp.unit ?? null,

    estimated_quantity: rows.length ? totalQty(rows) : wp.estimatedQuantity,
    completed_quantity: wp.completedQuantity ?? null,
    floor_units: rows.length ? floors : wp.floorUnits,

    constraint_text: wp.constraint,
    status: wp.status,
    assigned_to_engineer: wp.assignedToEngineer,
    remaining_quantity: rows.length ? totalRemainingQty(rows) : wp.remainingQuantity,

    constraint_date: wp.constraintDate ?? null,
    responsible_person: wp.responsiblePerson ?? null,

    is_carry_forward_week: wp.isCarryForwardWeek ?? false,
    source_activity_id: toUuidOrNull(wp.sourceActivityId),
    source_week_number: wp.sourceWeekNumber ?? null,
  });
}, []);

const upsertDailyPlan = useCallback(async (dp: DailyPlan) => {
  const rows = dp.quantityBreakdown || [];
  const floors = getFloorsFromBreakdown(rows);
  const units = getUnitsFromBreakdown(rows);

  await supabase.from('daily_plans').upsert({
    id: dp.id,
    weekly_plan_id: dp.weeklyPlanId,
    day_number: dp.dayNumber,
    date: dp.date,

    quantity_breakdown: rows,

    planned_quantity: rows.length ? totalQty(rows) : dp.plannedQuantity,
    units: rows.length ? units : dp.units ?? [],
    unit: rows.length ? units[0] ?? null : dp.units?.[0] ?? dp.unit ?? null,

    constraint_text: dp.constraint,
    floor_units: rows.length ? floors : dp.floorUnits,
    engineer_note: dp.engineerNote,
    rov: dp.rov,

    completed_quantity: rows.length ? totalCompletedQty(rows) : dp.completedQuantity ?? null,
    remaining_quantity: rows.length ? totalRemainingQty(rows) : dp.remainingQuantity ?? null,

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
      units: ticket.units ?? [],
unit: ticket.units?.[0] ?? ticket.unit ?? null,
      rov: ticket.rov,
      recovery_deadline: ticket.recoveryDeadline,
      contractor_statement: ticket.contractorStatement,
      assigned_to: ticket.assignedTo,
      status: ticket.status,
    });
  }, []);

  const deleteDailyPlan = useCallback(async (dailyPlanId: string) => {
  await supabase.from('daily_plans').delete().eq('id', dailyPlanId);
}, []);

  const deleteWeeklyPlan = useCallback(async (weeklyPlanId: string) => {
  // delete children first if FK does not cascade
  await supabase.from('daily_plans').delete().eq('weekly_plan_id', weeklyPlanId);
  await supabase.from('weekly_plans').delete().eq('id', weeklyPlanId);
}, []);


const deleteTicketsByDailyPlanId = useCallback(async (dailyPlanId: string) => {
  await supabase.from('tickets').delete().eq('daily_plan_id', dailyPlanId);
}, []);

const deleteTicketsByWeeklyPlanId = useCallback(async (weeklyPlanId: string) => {
  await supabase.from('tickets').delete().eq('weekly_plan_id', weeklyPlanId);
}, []);


const fetchBacklogs = useCallback(async (): Promise<BacklogItem[]> => {
  const { data } = await supabase.from('weekly_backlogs').select('*');

  return (data || []).map(row => ({
    id: row.id,
    projectId: row.project_id,
    sixWeekPlanId: row.six_week_plan_id,
    sourceWeeklyPlanId: row.source_weekly_plan_id,
    sourceWeekNumber: row.source_week_number,
    sourceDailyPlanId: row.source_daily_plan_id || undefined,
    targetWeeklyPlanId: row.target_weekly_plan_id || undefined,
    targetWeekNumber: row.target_week_number || undefined,
    activityId: row.activity_id,
    tradeActivity: row.trade_activity,
    contractorId: row.contractor_id || '',
    floorUnit: row.floor_unit,
    unit: row.unit,
    plannedQuantity: Number(row.planned_quantity),
    completedQuantity: Number(row.completed_quantity),
    shortfallQuantity: Number(row.shortfall_quantity),
    quantityBreakdown: row.quantity_breakdown || [],
    status: row.status,
    createdAt: row.created_at,
    carriedForwardAt: row.carried_forward_at || undefined,
  }));
}, []);

const upsertBacklog = useCallback(async (b: BacklogItem) => {
  await supabase.from('weekly_backlogs').upsert({
    id: b.id,
    project_id: b.projectId,
    six_week_plan_id: b.sixWeekPlanId,
    source_weekly_plan_id: b.sourceWeeklyPlanId,
    source_week_number: b.sourceWeekNumber,
    source_daily_plan_id: b.sourceDailyPlanId || null,
    target_weekly_plan_id: b.targetWeeklyPlanId || null,
    target_week_number: b.targetWeekNumber || null,
    activity_id: b.activityId,
    trade_activity: b.tradeActivity,
    contractor_id: toUuidOrNull(b.contractorId),
    floor_unit: b.floorUnit,
    unit: b.unit,
    planned_quantity: b.plannedQuantity,
    completed_quantity: b.completedQuantity,
    shortfall_quantity: b.shortfallQuantity,
    quantity_breakdown: b.quantityBreakdown || [],
    status: b.status,
    created_at: b.createdAt,
    carried_forward_at: b.carriedForwardAt || null,
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
  deleteDailyPlan,
  deleteWeeklyPlan, // NEW
  upsertTicket,
    deleteTicketsByDailyPlanId,
  deleteTicketsByWeeklyPlanId,
  upsertBacklog,
  fetchBacklogs
};
};
