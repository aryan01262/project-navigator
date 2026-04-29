import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Role,
  Project,
  SixWeekPlan,
  WeeklyPlan,
  DailyPlan,
  Contractor,
  PlanActivity,
  Ticket,
  BacklogItem
} from '@/types/planner';
import { DEFAULT_CONTRACTORS } from '@/types/planner';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';

interface AppContextType {
  role: Role;
  contractors: Contractor[];
  addContractor: (contractor: Contractor) => void;
  projects: Project[];
  tickets: Ticket[];
  backlogs: BacklogItem[];
  createProject: (project: Project) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  addSixWeekPlan: (projectId: string, plan: SixWeekPlan) => void;
  updateSixWeekPlanActivities: (projectId: string, sixWeekPlanId: string, activities: PlanActivity[]) => void;
  addWeeklyPlan: (projectId: string, sixWeekPlanId: string, plan: WeeklyPlan) => void;
  assignToEngineer: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => void;
  addDailyPlan: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, daily: DailyPlan) => void;
  forwardDailyToSupervisor: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string) => void;
  logDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, completedQty: number, isDone: boolean, rov: string) => void;
  submitDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, constraintLog: string) => void;
  confirmDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string) => void;
  updateActivity2: (projectId: string, sixWeekPlanId: string, activityId: string, patch: Partial<PlanActivity>) => void;
  updateWeeklyPlanField: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, patch: Partial<WeeklyPlan>) => void;
  updateTicket: (ticketId: string, patch: Partial<Ticket>) => void;

  updateDailyPlanByEngineer: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string,
    patch: Partial<DailyPlan>
  ) => void;

  deleteDailyPlanByEngineer: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string
  ) => void;

  updateWeeklyPlanByAdmin: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    patch: Partial<WeeklyPlan>
  ) => void;

  deleteWeeklyPlanByAdmin: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string
  ) => void;

  updateSupervisorLog: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string,
    completedQuantity: number,
    rov: string
  ) => void;

  deleteSupervisorLog: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string
  ) => void;

  generateWeeklyBacklog: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string
  ) => void;

  applyBacklogToNextWeek: (
    projectId: string,
    sixWeekPlanId: string,
    sourceWeeklyPlanId: string,
    targetWeekNumber: number
  ) => void;

  syncing: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const STORAGE_KEY = 'sixweek-planner-v2';

const toUuidOrNull = (value?: string | null) => {
  if (!value) return null;
  return value;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const sb = useSupabaseData();
  const [syncing, setSyncing] = useState(false);
  const initialLoadDone = useRef(false);

  const [contractors, setContractors] = useState<Contractor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-contractors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && parsed[0].id && !/^[0-9a-f]{8}-/.test(parsed[0].id)) {
          localStorage.removeItem(STORAGE_KEY + '-contractors');
          return DEFAULT_CONTRACTORS;
        }
        return parsed;
      } catch {
        return DEFAULT_CONTRACTORS;
      }
    }
    return DEFAULT_CONTRACTORS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-projects');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-tickets');
    return saved ? JSON.parse(saved) : [];
  });

  const [backlogs, setBacklogs] = useState<BacklogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-backlogs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-contractors', JSON.stringify(contractors));
  }, [contractors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-backlogs', JSON.stringify(backlogs));
  }, [backlogs]);

  useEffect(() => {
    if (!user || initialLoadDone.current) return;

    const load = async () => {
      setSyncing(true);

      try {
        const [sbProjects, sbContractors, sbTickets, sbBacklogs] = await Promise.all([
          sb.fetchAllProjects(),
          sb.fetchContractors(),
          sb.fetchTickets(),
          sb.fetchBacklogs(),
        ]);

        if (sbProjects.length > 0) setProjects(sbProjects);
        if (sbTickets.length > 0) setTickets(sbTickets);
        if (sbBacklogs.length > 0) setBacklogs(sbBacklogs);

        if (sbContractors.length > 0) {
          setContractors(sbContractors);
        } else {
          for (const c of contractors) {
            await sb.upsertContractor(c, user.id).catch(console.error);
          }
        }

        initialLoadDone.current = true;
      } catch (e) {
        console.error('Failed to load from Supabase, using localStorage:', e);
      }

      setSyncing(false);
    };

    load();
  }, [user, sb]);

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

  const normalizeActivity = (activity: PlanActivity): PlanActivity => {
    const rows = activity.quantityBreakdown || [];

    if (!rows.length) {
      return activity;
    }

    return {
      ...activity,
      estimatedQuantity: totalQty(rows),
      remainingQuantity: totalRemainingQty(rows),
      completedQuantity: totalCompletedQty(rows),
      floorUnits: getFloorsFromBreakdown(rows),
      units: getUnitsFromBreakdown(rows),
      unit: getUnitsFromBreakdown(rows)[0] || activity.unit,
    };
  };

  const normalizeWeeklyPlan = (wp: WeeklyPlan): WeeklyPlan => {
    const rows = wp.quantityBreakdown || [];

    if (!rows.length) {
      return wp;
    }

    return {
      ...wp,
      estimatedQuantity: totalQty(rows),
      remainingQuantity: totalRemainingQty(rows),
      completedQuantity: totalCompletedQty(rows),
      floorUnits: getFloorsFromBreakdown(rows),
      units: getUnitsFromBreakdown(rows),
      unit: getUnitsFromBreakdown(rows)[0] || wp.unit,
    };
  };

  const normalizeDailyPlan = (dp: DailyPlan): DailyPlan => {
    const rows = dp.quantityBreakdown || [];

    if (!rows.length) {
      return dp;
    }

    return {
      ...dp,
      plannedQuantity: totalQty(rows),
      completedQuantity: totalCompletedQty(rows),
      remainingQuantity: totalRemainingQty(rows),
      floorUnits: getFloorsFromBreakdown(rows),
      units: getUnitsFromBreakdown(rows),
      unit: getUnitsFromBreakdown(rows)[0] || dp.unit,
    };
  };

  const getDailyShortfallBreakdown = (dp: DailyPlan, wp: WeeklyPlan) => {
    const rows = dp.quantityBreakdown || [];

    if (rows.length > 0) {
      return rows
        .map(row => {
          const planned = Number(row.quantity || 0);
          const completed = Number(row.completedQuantity || 0);
          const shortfall = Math.max(0, planned - completed);

          return {
            floorUnit: row.floorUnit,
            unit: row.unit,
            plannedQuantity: planned,
            completedQuantity: completed,
            shortfallQuantity: shortfall,
          };
        })
        .filter(x => x.shortfallQuantity > 0);
    }

    const planned = Number(dp.plannedQuantity || 0);
    const completed = Number(dp.completedQuantity || 0);
    const shortfall = Math.max(0, planned - completed);

    if (shortfall <= 0) return [];

    const floors =
      dp.floorUnits?.length
        ? dp.floorUnits
        : wp.floorUnits?.length
          ? wp.floorUnits
          : ['Unspecified Floor'];

    const units =
      dp.units?.length
        ? dp.units
        : wp.units?.length
          ? wp.units
          : wp.unit
            ? [wp.unit]
            : [''];

    const combinations = floors.flatMap(floor =>
      units.map(unit => ({ floor, unit }))
    );

    if (!combinations.length) return [];

    const splitQty = shortfall / combinations.length;

    return combinations.map(item => ({
      floorUnit: item.floor,
      unit: item.unit,
      plannedQuantity: planned / combinations.length,
      completedQuantity: completed / combinations.length,
      shortfallQuantity: splitQty,
    }));
  };

  const syncProject = useCallback((project: Project) => {
    if (!user) return;
    sb.upsertProject(project, user.id).catch(console.error);
  }, [user, sb]);

  const syncSixWeekPlan = useCallback((plan: SixWeekPlan) => {
    if (!user) return;
    sb.upsertSixWeekPlan(plan).catch(console.error);
  }, [user, sb]);

  const syncActivity = useCallback((activity: PlanActivity, swpId: string) => {
    if (!user) return;
    sb.upsertActivity(normalizeActivity(activity), swpId).catch(console.error);
  }, [user, sb]);

  const syncWeeklyPlan = useCallback((wp: WeeklyPlan) => {
    if (!user) return;
    sb.upsertWeeklyPlan(normalizeWeeklyPlan(wp)).catch(console.error);
  }, [user, sb]);

  const syncDailyPlan = useCallback((dp: DailyPlan) => {
    if (!user) return;
    sb.upsertDailyPlan(normalizeDailyPlan(dp)).catch(console.error);
  }, [user, sb]);

  const syncTicket = useCallback((ticket: Ticket) => {
    if (!user) return;
    sb.upsertTicket(ticket).catch(console.error);
  }, [user, sb]);

  const syncBacklog = useCallback((backlog: BacklogItem) => {
    if (!user) return;
    sb.upsertBacklog(backlog).catch(console.error);
  }, [user, sb]);

  const getWeeklyPlanCompletedQuantity = (wp: WeeklyPlan) =>
    wp.dailyPlans.reduce((sum, dp) => {
      const rows = dp.quantityBreakdown || [];
      return sum + (rows.length ? totalCompletedQty(rows) : Number(dp.completedQuantity || 0));
    }, 0);

  const recalculatePlanActivities = (plan: SixWeekPlan): PlanActivity[] => {
    return plan.activities.map(activity => {
      const relatedWeeks = plan.weeklyPlans.filter(wp => wp.taskId === activity.id);

      const completedQuantity = relatedWeeks.reduce(
        (sum, wp) => sum + getWeeklyPlanCompletedQuantity(wp),
        0
      );

      const activityTotal = activity.quantityBreakdown?.length
        ? totalQty(activity.quantityBreakdown)
        : activity.estimatedQuantity || 0;

      const remainingQuantity = Math.max(0, activityTotal - completedQuantity);

      return {
        ...activity,
        estimatedQuantity: activityTotal,
        completedQuantity,
        remainingQuantity,
        carryForwardQuantity: remainingQuantity,
        floorUnits: activity.quantityBreakdown?.length
          ? getFloorsFromBreakdown(activity.quantityBreakdown)
          : activity.floorUnits,
        units: activity.quantityBreakdown?.length
          ? getUnitsFromBreakdown(activity.quantityBreakdown)
          : activity.units,
      } as PlanActivity;
    });
  };

  const buildCarryForwardWeeklyPlan = (
    plan: SixWeekPlan,
    activity: PlanActivity,
    nextWeekNumber: number
  ): WeeklyPlan => {
    const rows = activity.quantityBreakdown || [];
    const remaining = activity.remainingQuantity || totalRemainingQty(rows);

    return {
      id: crypto.randomUUID(),
      sixWeekPlanId: plan.id,
      weekNumber: nextWeekNumber,
      taskId: activity.id,
      category: activity.category,
      contractorId: activity.contractorId,
      tradeActivity: activity.tradeActivity,
      quantityBreakdown: rows,
      units: activity.units || (activity.unit ? [activity.unit] : getUnitsFromBreakdown(rows)),
      unit: activity.units?.[0] || activity.unit || getUnitsFromBreakdown(rows)[0],
      estimatedQuantity: remaining,
      completedQuantity: 0,
      floorUnits: activity.floorUnits || getFloorsFromBreakdown(rows),
      constraint: '',
      status: 'pending',
      assignedToEngineer: false,
      remainingQuantity: remaining,
      dailyPlans: [],
      isCarryForwardWeek: true,
      sourceActivityId: activity.id,
      sourceWeekNumber: nextWeekNumber - 1,
    } as WeeklyPlan;
  };

  const addContractor = useCallback((c: Contractor) => {
    setContractors(prev => [...prev, c]);
    if (user) sb.upsertContractor(c, user.id).catch(console.error);
  }, [user, sb]);

  const createProject = useCallback((p: Project) => {
    setProjects(prev => [...prev, p]);
    setActiveProjectId(p.id);
    syncProject(p);
  }, [syncProject]);

  const addSixWeekPlan = useCallback((projectId: string, plan: SixWeekPlan) => {
    const normalizedPlan: SixWeekPlan = {
      ...plan,
      baseDurationWeeks: plan.baseDurationWeeks ?? 6,
      extendedWeeks: plan.extendedWeeks ?? 0,
      totalDurationWeeks: plan.totalDurationWeeks ?? 6,
      activities: plan.activities.map(normalizeActivity),
    } as SixWeekPlan;

    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, sixWeekPlans: [...p.sixWeekPlans, normalizedPlan] }
          : p
      )
    );

    if (user) {
      sb.upsertSixWeekPlan(normalizedPlan)
        .then(() => Promise.all(normalizedPlan.activities.map(a => sb.upsertActivity(a, normalizedPlan.id))))
        .catch(console.error);
    }
  }, [user, sb]);

  const updateSixWeekPlanActivities = useCallback(
    (projectId: string, sixWeekPlanId: string, activities: PlanActivity[]) => {
      let activitiesToSync: PlanActivity[] = [];

      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;

          return {
            ...p,
            sixWeekPlans: p.sixWeekPlans.map(swp => {
              if (swp.id !== sixWeekPlanId) return swp;

              const updatedActivities = activities.map(activity => {
                const normalized = normalizeActivity(activity);

                const usedQuantity = swp.weeklyPlans
                  .filter(wp => wp.taskId === activity.id)
                  .reduce((sum, wp) => sum + (wp.estimatedQuantity || 0), 0);

                const activityTotal = normalized.estimatedQuantity || 0;

                return {
                  ...normalized,
                  remainingQuantity: Math.max(0, activityTotal - usedQuantity),
                };
              });

              activitiesToSync = updatedActivities;

              return { ...swp, activities: updatedActivities };
            })
          };
        })
      );

      activitiesToSync.forEach(a => syncActivity(a, sixWeekPlanId));
    },
    [syncActivity]
  );

  const addWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, wp: WeeklyPlan) => {
    const normalizedWp = normalizeWeeklyPlan(wp);

    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? {
              ...p,
              sixWeekPlans: p.sixWeekPlans.map(swp =>
                swp.id === sixWeekPlanId
                  ? { ...swp, weeklyPlans: [...swp.weeklyPlans, normalizedWp] }
                  : swp
              )
            }
          : p
      )
    );

    syncWeeklyPlan(normalizedWp);
  }, [syncWeeklyPlan]);

  const updateWeeklyPlan = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    updater: (wp: WeeklyPlan) => WeeklyPlan
  ) => {
    let updatedWP: WeeklyPlan | null = null;

    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? {
              ...p,
              sixWeekPlans: p.sixWeekPlans.map(swp =>
                swp.id === sixWeekPlanId
                  ? {
                      ...swp,
                      weeklyPlans: swp.weeklyPlans.map(wp => {
                        if (wp.id !== weeklyPlanId) return wp;
                        updatedWP = normalizeWeeklyPlan(updater(wp));
                        return updatedWP;
                      })
                    }
                  : swp
              )
            }
          : p
      )
    );

    if (updatedWP) syncWeeklyPlan(updatedWP);
  }, [syncWeeklyPlan]);

  const updateWeeklyPlanField = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    patch: Partial<WeeklyPlan>
  ) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, ...patch }));
  }, [updateWeeklyPlan]);

  const updateActivity2 = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    activityId: string,
    patch: Partial<PlanActivity>
  ) => {
    setProjects(prev =>
      prev.map(p =>
        p.id !== projectId
          ? p
          : {
              ...p,
              sixWeekPlans: p.sixWeekPlans.map(swp =>
                swp.id !== sixWeekPlanId
                  ? swp
                  : {
                      ...swp,
                      activities: swp.activities.map(a => {
                        if (a.id !== activityId) return a;
                        const updated = normalizeActivity({ ...a, ...patch });
                        syncActivity(updated, sixWeekPlanId);
                        return updated;
                      })
                    }
              )
            }
      )
    );
  }, [syncActivity]);

  const assignToEngineer = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({
      ...wp,
      assignedToEngineer: true,
      status: 'assigned'
    }));
  }, [updateWeeklyPlan]);

  const addDailyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, daily: DailyPlan) => {
    const normalizedDaily = normalizeDailyPlan(daily);

    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({
      ...wp,
      dailyPlans: [...wp.dailyPlans, normalizedDaily]
    }));

    syncDailyPlan(normalizedDaily);
  }, [updateWeeklyPlan, syncDailyPlan]);

  const updateDailyPlan = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string,
    updater: (dp: DailyPlan) => DailyPlan
  ) => {
    let updatedDP: DailyPlan | null = null;

    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({
      ...wp,
      dailyPlans: wp.dailyPlans.map(dp => {
        if (dp.id !== dailyPlanId) return dp;
        updatedDP = normalizeDailyPlan(updater(dp));
        return updatedDP;
      })
    }));

    if (updatedDP) syncDailyPlan(updatedDP);
  }, [updateWeeklyPlan, syncDailyPlan]);

  const forwardDailyToSupervisor = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'forwarded' }));
  }, [updateDailyPlan]);

  const createTicketFromShortfall = (
    project: Project,
    swpId: string,
    wpId: string,
    dp: DailyPlan,
    completedQuantity: number,
    rov: string,
    wp: WeeklyPlan
  ) => {
    const rows = dp.quantityBreakdown || [];
    const shortfall = rows.length
      ? totalRemainingQty(rows)
      : Number(dp.plannedQuantity || 0) - completedQuantity;

    if (shortfall <= 0) return;

    const units = rows.length
      ? getUnitsFromBreakdown(rows)
      : dp.units || (dp.unit ? [dp.unit] : wp.units || []);

    const ticket: Ticket = {
      id: crypto.randomUUID(),
      projectId: project.id,
      sixWeekPlanId: swpId,
      weeklyPlanId: wpId,
      dailyPlanId: dp.id,
      tradeName: wp.tradeActivity,
      taskId: dp.id,
      date: dp.date,
      constraint: dp.constraint,
      rovComment: dp.rov || '',
      targetQuantity: rows.length ? totalQty(rows) : dp.plannedQuantity,
      completedQuantity: rows.length ? totalCompletedQty(rows) : completedQuantity,
      shortfallQuantity: shortfall,
      recoveryId: `REC-${Date.now()}`,
      contractorName: wp.contractorId,
      units,
      unit: units[0] || dp.unit || wp.unit,
      rov,
      assignedTo: 'engineer',
      status: 'open'
    };

    setTickets(prev => [...prev, ticket]);
    syncTicket(ticket);
  };

  const logDailyTarget = useCallback((
    pid: string,
    swpId: string,
    wpId: string,
    dpId: string,
    completedQuantity: number,
    isDone: boolean,
    rov: string
  ) => {
    let targetDP: DailyPlan | null = null;
    let targetProject: Project | null = null;
    let targetWP: WeeklyPlan | null = null;

    projects.forEach(p => {
      if (p.id === pid) {
        targetProject = p;
        p.sixWeekPlans.forEach(swp => {
          if (swp.id === swpId) {
            swp.weeklyPlans.forEach(wp => {
              if (wp.id === wpId) {
                targetWP = wp;
                wp.dailyPlans.forEach(dp => {
                  if (dp.id === dpId) targetDP = dp;
                });
              }
            });
          }
        });
      }
    });

    let updatedForTicket: DailyPlan | null = null;

    updateDailyPlan(pid, swpId, wpId, dpId, dp => {
      const rows = dp.quantityBreakdown || [];

      const updatedRows = rows.length
        ? rows.map(row => ({
            ...row,
            completedQuantity:
              row.completedQuantity !== undefined
                ? row.completedQuantity
                : Number(row.quantity || 0),
          }))
        : rows;

      updatedForTicket = {
        ...dp,
        quantityBreakdown: updatedRows,
        status: 'logged',
        completedQuantity: rows.length ? totalCompletedQty(updatedRows) : completedQuantity,
        remainingQuantity: rows.length
          ? totalRemainingQty(updatedRows)
          : Math.max(0, Number(dp.plannedQuantity || 0) - completedQuantity),
        isDone,
        rov: rov === 'none' ? '' : rov,
      };

      return updatedForTicket;
    });

    const dpForTicket = updatedForTicket || targetDP;

    if (
      dpForTicket &&
      targetProject &&
      targetWP &&
      (
        dpForTicket.quantityBreakdown?.length
          ? totalRemainingQty(dpForTicket.quantityBreakdown) > 0
          : completedQuantity < Number(dpForTicket.plannedQuantity || 0)
      )
    ) {
      createTicketFromShortfall(
        targetProject,
        swpId,
        wpId,
        dpForTicket,
        completedQuantity,
        rov === 'none' ? '' : rov,
        targetWP
      );
    }
  }, [projects, updateDailyPlan]);

  const submitDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string, constraintLog: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({
      ...dp,
      status: 'submitted',
      constraintLog,
      validatedByEngineer: true
    }));
  }, [updateDailyPlan]);

  const confirmDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({
      ...dp,
      status: 'confirmed',
      confirmedByAdmin: true
    }));
  }, [updateDailyPlan]);

  const updateTicket = useCallback((ticketId: string, patch: Partial<Ticket>) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        const updated = { ...t, ...patch };
        syncTicket(updated);
        return updated;
      })
    );
  }, [syncTicket]);

  const updateSupervisorLog = useCallback((
    pid: string,
    swpId: string,
    wpId: string,
    dpId: string,
    completedQuantity: number,
    rov: string
  ) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => {
      if (dp.status !== 'logged') return dp;

      const rows = dp.quantityBreakdown || [];
      const updatedRows = rows.length
        ? rows.map(row => ({
            ...row,
            completedQuantity:
              row.completedQuantity !== undefined
                ? row.completedQuantity
                : Number(row.quantity || 0),
          }))
        : rows;

      return {
        ...dp,
        quantityBreakdown: updatedRows,
        completedQuantity: rows.length ? totalCompletedQty(updatedRows) : completedQuantity,
        remainingQuantity: rows.length
          ? totalRemainingQty(updatedRows)
          : Math.max(0, Number(dp.plannedQuantity || 0) - completedQuantity),
        rov: rov === 'none' ? '' : rov,
        status: 'logged',
      };
    });
  }, [updateDailyPlan]);

  const deleteSupervisorLog = useCallback((
    pid: string,
    swpId: string,
    wpId: string,
    dpId: string
  ) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => {
      if (dp.status !== 'logged') return dp;

      const rows = dp.quantityBreakdown || [];
      const resetRows = rows.map(row => ({
        ...row,
        completedQuantity: undefined,
      }));

      return {
        ...dp,
        quantityBreakdown: resetRows,
        completedQuantity: undefined,
        remainingQuantity: rows.length ? totalQty(rows) : dp.plannedQuantity,
        rov: undefined,
        isDone: false,
        status: 'forwarded',
      };
    });
  }, [updateDailyPlan]);

  const deleteDailyPlanByEngineer = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string
  ) => {
    let deletedDP: DailyPlan | null = null;
    let updatedWPForSync: WeeklyPlan | null = null;

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          sixWeekPlans: project.sixWeekPlans.map(plan => {
            if (plan.id !== sixWeekPlanId) return plan;

            return {
              ...plan,
              weeklyPlans: plan.weeklyPlans.map(wp => {
                if (wp.id !== weeklyPlanId) return wp;

                const target = wp.dailyPlans.find(dp => dp.id === dailyPlanId);
                if (!target) return wp;
                if (target.status !== 'pending') return wp;

                deletedDP = target;

                const restoredQuantity = target.quantityBreakdown?.length
                  ? totalQty(target.quantityBreakdown)
                  : target.plannedQuantity || 0;

                const updatedWP: WeeklyPlan = {
                  ...wp,
                  remainingQuantity: (wp.remainingQuantity ?? 0) + restoredQuantity,
                  dailyPlans: wp.dailyPlans.filter(dp => dp.id !== dailyPlanId),
                };

                updatedWPForSync = updatedWP;
                return updatedWP;
              })
            };
          })
        };
      })
    );

    setTickets(prev => prev.filter(t => t.dailyPlanId !== dailyPlanId));

    if (updatedWPForSync) syncWeeklyPlan(updatedWPForSync);

    if (deletedDP && user) {
      sb.deleteTicketsByDailyPlanId(dailyPlanId).catch(console.error);
      sb.deleteDailyPlan(dailyPlanId).catch(console.error);
    }
  }, [syncWeeklyPlan, sb, user]);

  const updateDailyPlanByEngineer = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    dailyPlanId: string,
    patch: Partial<DailyPlan>
  ) => {
    updateDailyPlan(projectId, sixWeekPlanId, weeklyPlanId, dailyPlanId, dp => ({
      ...dp,
      ...patch,
      id: dp.id,
      weeklyPlanId: dp.weeklyPlanId,
      status: 'pending',
      completedQuantity: undefined,
      confirmedByAdmin: false,
      validatedByEngineer: false,
    }));
  }, [updateDailyPlan]);

  const updateWeeklyPlanByAdmin = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    patch: Partial<WeeklyPlan>
  ) => {
    let originalWP: WeeklyPlan | null = null;

    projects.forEach(p => {
      if (p.id !== projectId) return;
      p.sixWeekPlans.forEach(swp => {
        if (swp.id !== sixWeekPlanId) return;
        swp.weeklyPlans.forEach(wp => {
          if (wp.id === weeklyPlanId) originalWP = wp;
        });
      });
    });

    if (!originalWP) return;

    const oldQty = Number(originalWP.estimatedQuantity || 0);
    const patchRows = patch.quantityBreakdown || originalWP.quantityBreakdown || [];
    const newQty =
      patchRows.length
        ? totalQty(patchRows)
        : patch.estimatedQuantity !== undefined
          ? Number(patch.estimatedQuantity)
          : oldQty;

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          sixWeekPlans: project.sixWeekPlans.map(plan => {
            if (plan.id !== sixWeekPlanId) return plan;

            const activity = plan.activities.find(a => a.id === originalWP!.taskId);
            const currentActivityRemaining = activity?.remainingQuantity ?? 0;
            const availableForEdit = currentActivityRemaining + oldQty;
            const safeQty = Math.max(0, Math.min(newQty, availableForEdit));

            const updatedWeeklyPlans = plan.weeklyPlans.map(wp => {
              if (wp.id !== weeklyPlanId) return wp;

              const merged = normalizeWeeklyPlan({
                ...wp,
                ...patch,
                estimatedQuantity: safeQty,
                remainingQuantity:
                  patch.remainingQuantity !== undefined
                    ? patch.remainingQuantity
                    : safeQty,
              });

              syncWeeklyPlan(merged);
              return merged;
            });

            const updatedActivities = plan.activities.map(a => {
              if (a.id !== originalWP!.taskId) return a;

              const updated = {
                ...a,
                remainingQuantity: availableForEdit - safeQty,
              };

              syncActivity(updated, sixWeekPlanId);
              return updated;
            });

            return {
              ...plan,
              weeklyPlans: updatedWeeklyPlans,
              activities: updatedActivities,
            };
          })
        };
      })
    );
  }, [projects, syncWeeklyPlan, syncActivity]);

  const deleteWeeklyPlanByAdmin = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string
  ) => {
    let targetWP: WeeklyPlan | null = null;

    projects.forEach(p => {
      if (p.id !== projectId) return;
      p.sixWeekPlans.forEach(swp => {
        if (swp.id !== sixWeekPlanId) return;
        swp.weeklyPlans.forEach(wp => {
          if (wp.id === weeklyPlanId) targetWP = wp;
        });
      });
    });

    if (!targetWP) return;

    const hasLockedDaily = targetWP.dailyPlans.some(dp => dp.status !== 'pending');
    if (hasLockedDaily) return;

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          sixWeekPlans: project.sixWeekPlans.map(plan => {
            if (plan.id !== sixWeekPlanId) return plan;

            const restoredQuantity = targetWP!.quantityBreakdown?.length
              ? totalQty(targetWP!.quantityBreakdown)
              : targetWP!.estimatedQuantity || 0;

            const updatedActivities = plan.activities.map(a => {
              if (a.id !== targetWP!.taskId) return a;

              const restored = {
                ...a,
                remainingQuantity: (a.remainingQuantity || 0) + restoredQuantity,
              };

              syncActivity(restored, sixWeekPlanId);
              return restored;
            });

            return {
              ...plan,
              activities: updatedActivities,
              weeklyPlans: plan.weeklyPlans.filter(wp => wp.id !== weeklyPlanId),
            };
          })
        };
      })
    );

    setTickets(prev => prev.filter(t => t.weeklyPlanId !== weeklyPlanId));
    setBacklogs(prev => prev.filter(b => b.sourceWeeklyPlanId !== weeklyPlanId && b.targetWeeklyPlanId !== weeklyPlanId));

    if (user) {
      sb.deleteTicketsByWeeklyPlanId(weeklyPlanId).catch(console.error);
      sb.deleteWeeklyPlan(weeklyPlanId).catch(console.error);
    }
  }, [projects, syncActivity, user, sb]);

  const generateWeeklyBacklog = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string
  ) => {
    const newBacklogs: BacklogItem[] = [];

    setProjects(prev => {
      prev.forEach(project => {
        if (project.id !== projectId) return;

        project.sixWeekPlans.forEach(swp => {
          if (swp.id !== sixWeekPlanId) return;

          const wp = swp.weeklyPlans.find(w => w.id === weeklyPlanId);
          if (!wp) return;

          wp.dailyPlans.forEach(dp => {
            if (!['confirmed', 'submitted', 'logged'].includes(dp.status)) return;

            const breakdown = getDailyShortfallBreakdown(dp, wp);
            if (!breakdown.length) return;

            breakdown.forEach(item => {
              newBacklogs.push({
                id: crypto.randomUUID(),
                projectId,
                sixWeekPlanId,
                sourceWeeklyPlanId: wp.id,
                sourceWeekNumber: wp.weekNumber,
                sourceDailyPlanId: dp.id,
                activityId: wp.taskId,
                tradeActivity: wp.tradeActivity,
                contractorId: wp.contractorId,
                floorUnit: item.floorUnit,
                unit: item.unit,
                plannedQuantity: item.plannedQuantity,
                completedQuantity: item.completedQuantity,
                shortfallQuantity: item.shortfallQuantity,
                quantityBreakdown: [{
                  id: crypto.randomUUID(),
                  floorUnit: item.floorUnit,
                  unit: item.unit,
                  quantity: item.shortfallQuantity,
                  completedQuantity: 0,
                  remainingQuantity: item.shortfallQuantity,
                }],
                status: 'open',
                createdAt: new Date().toISOString(),
              } as BacklogItem);
            });
          });
        });
      });

      return prev;
    });

    if (!newBacklogs.length) return;

    setBacklogs(prev => {
      const existingKeys = new Set(
        prev.map(b => `${b.sourceDailyPlanId}-${b.floorUnit}-${b.unit}`)
      );

      const deduped = newBacklogs.filter(
        b => !existingKeys.has(`${b.sourceDailyPlanId}-${b.floorUnit}-${b.unit}`)
      );

      deduped.forEach(syncBacklog);
      return [...prev, ...deduped];
    });
  }, [syncBacklog]);

  const applyBacklogToNextWeek = useCallback((
    projectId: string,
    sixWeekPlanId: string,
    sourceWeeklyPlanId: string,
    targetWeekNumber: number
  ) => {
    let updatedBacklogs: BacklogItem[] = [];
    let newOrUpdatedWeeklyPlans: WeeklyPlan[] = [];

    const openBacklogs = backlogs.filter(
      b =>
        b.projectId === projectId &&
        b.sixWeekPlanId === sixWeekPlanId &&
        b.sourceWeeklyPlanId === sourceWeeklyPlanId &&
        b.status === 'open'
    );

    if (!openBacklogs.length) return;

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== projectId) return project;

        return {
          ...project,
          sixWeekPlans: project.sixWeekPlans.map(swp => {
            if (swp.id !== sixWeekPlanId) return swp;

            let weeklyPlans = [...swp.weeklyPlans];

            const grouped = openBacklogs.reduce((acc, item) => {
              const key = `${item.activityId}-${item.floorUnit}-${item.unit}`;
              acc[key] = acc[key] || [];
              acc[key].push(item);
              return acc;
            }, {} as Record<string, BacklogItem[]>);

            Object.values(grouped).forEach(items => {
              const first = items[0];

              const backlogRows = items.map(item => ({
                id: crypto.randomUUID(),
                floorUnit: item.floorUnit,
                unit: item.unit,
                quantity: item.shortfallQuantity,
                completedQuantity: 0,
                remainingQuantity: item.shortfallQuantity,
              }));

              const existingTarget = weeklyPlans.find(
                wp =>
                  wp.weekNumber === targetWeekNumber &&
                  wp.taskId === first.activityId
              );

              if (existingTarget) {
                const mergedBreakdown = [
                  ...(existingTarget.quantityBreakdown || []),
                  ...backlogRows,
                ];

                const updated: WeeklyPlan = {
                  ...existingTarget,
                  quantityBreakdown: mergedBreakdown,
                  estimatedQuantity: totalQty(mergedBreakdown),
                  remainingQuantity: totalRemainingQty(mergedBreakdown),
                  floorUnits: getFloorsFromBreakdown(mergedBreakdown),
                  units: getUnitsFromBreakdown(mergedBreakdown),
                  unit: getUnitsFromBreakdown(mergedBreakdown)[0] || existingTarget.unit,
                  isCarryForwardWeek: true,
                };

                weeklyPlans = weeklyPlans.map(wp =>
                  wp.id === existingTarget.id ? updated : wp
                );

                newOrUpdatedWeeklyPlans.push(updated);

                updatedBacklogs.push(
                  ...items.map(b => ({
                    ...b,
                    status: 'carried_forward' as const,
                    targetWeeklyPlanId: updated.id,
                    targetWeekNumber,
                    carriedForwardAt: new Date().toISOString(),
                  }))
                );
              } else {
                const activity = swp.activities.find(a => a.id === first.activityId);
                if (!activity) return;

                const qty = totalQty(backlogRows);

                const newWp: WeeklyPlan = {
                  id: crypto.randomUUID(),
                  sixWeekPlanId: swp.id,
                  weekNumber: targetWeekNumber,
                  taskId: activity.id,
                  category: activity.category,
                  contractorId: activity.contractorId,
                  tradeActivity: activity.tradeActivity,
                  quantityBreakdown: backlogRows,
                  units: getUnitsFromBreakdown(backlogRows),
                  unit: getUnitsFromBreakdown(backlogRows)[0] || first.unit,
                  estimatedQuantity: qty,
                  remainingQuantity: totalRemainingQty(backlogRows),
                  floorUnits: getFloorsFromBreakdown(backlogRows),
                  constraint: 'Carry forward from previous week',
                  status: 'pending',
                  assignedToEngineer: false,
                  dailyPlans: [],
                  isCarryForwardWeek: true,
                  sourceWeekNumber: first.sourceWeekNumber,
                  sourceActivityId: first.activityId,
                } as WeeklyPlan;

                weeklyPlans.push(newWp);
                newOrUpdatedWeeklyPlans.push(newWp);

                updatedBacklogs.push(
                  ...items.map(b => ({
                    ...b,
                    status: 'carried_forward' as const,
                    targetWeeklyPlanId: newWp.id,
                    targetWeekNumber,
                    carriedForwardAt: new Date().toISOString(),
                  }))
                );
              }
            });

            return {
              ...swp,
              weeklyPlans,
            };
          })
        };
      })
    );

    newOrUpdatedWeeklyPlans.forEach(syncWeeklyPlan);

    setBacklogs(prev =>
      prev.map(b => {
        const updated = updatedBacklogs.find(x => x.id === b.id);
        if (!updated) return b;
        syncBacklog(updated);
        return updated;
      })
    );
  }, [backlogs, syncWeeklyPlan, syncBacklog]);

  return (
    <AppContext.Provider value={{
      role,
      contractors,
      addContractor,
      projects,
      createProject,
      activeProjectId,
      setActiveProjectId,

      addSixWeekPlan,
      updateSixWeekPlanActivities,
      addWeeklyPlan,
      assignToEngineer,
      addDailyPlan,

      updateDailyPlanByEngineer,
      deleteDailyPlanByEngineer,

      forwardDailyToSupervisor,
      logDailyTarget,
      submitDailyTarget,
      confirmDailyTarget,

      tickets,
      updateTicket,

      updateActivity2,
      updateWeeklyPlanField,
      updateWeeklyPlanByAdmin,
      deleteWeeklyPlanByAdmin,

      updateSupervisorLog,
      deleteSupervisorLog,

      backlogs,
      generateWeeklyBacklog,
      applyBacklogToNextWeek,

      syncing
    }}>
      {children}
    </AppContext.Provider>
  );
};