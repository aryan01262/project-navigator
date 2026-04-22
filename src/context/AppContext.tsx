import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Role, Project, SixWeekPlan, WeeklyPlan, DailyPlan, Contractor, PlanActivity, Ticket } from '@/types/planner';
import { DEFAULT_CONTRACTORS } from '@/types/planner';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';

interface AppContextType {
  role: Role;
  contractors: Contractor[];
  addContractor: (contractor: Contractor) => void;
  projects: Project[];
  tickets: Ticket[];
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

  // NEW
  evaluateCarryForward: (projectId: string, sixWeekPlanId: string) => void;
  createNextCarryForwardWeek: (projectId: string, sixWeekPlanId: string) => void;
  updateCarryForwardWeek: (
    projectId: string,
    sixWeekPlanId: string,
    weeklyPlanId: string,
    patch: Partial<WeeklyPlan>
  ) => void;
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

  syncing: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const STORAGE_KEY = 'sixweek-planner-v2';

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
        // If stored contractors have non-UUID ids (legacy), use defaults instead
        if (parsed.length > 0 && parsed[0].id && !/^[0-9a-f]{8}-/.test(parsed[0].id)) {
          localStorage.removeItem(STORAGE_KEY + '-contractors');
          return DEFAULT_CONTRACTORS;
        }
        return parsed;
      } catch { return DEFAULT_CONTRACTORS; }
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

  // Save to localStorage as fallback
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-contractors', JSON.stringify(contractors)); }, [contractors]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-tickets', JSON.stringify(tickets)); }, [tickets]);

  // Load from Supabase on auth + seed default contractors
  useEffect(() => {
    if (!user || initialLoadDone.current) return;
    const load = async () => {
      setSyncing(true);
      try {
        const [sbProjects, sbContractors, sbTickets] = await Promise.all([
          sb.fetchAllProjects(),
          sb.fetchContractors(),
          sb.fetchTickets(),
        ]);
        if (sbProjects.length > 0) setProjects(sbProjects);
        if (sbTickets.length > 0) setTickets(sbTickets);

        // Seed default contractors to Supabase if none exist
        if (sbContractors.length > 0) {
          setContractors(sbContractors);
        } else {
          // Upload default contractors to Supabase
          const contractorsToSeed = contractors;
          for (const c of contractorsToSeed) {
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

  // --- Sync helpers (fire-and-forget to Supabase) ---
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
    sb.upsertActivity(activity, swpId).catch(console.error);
  }, [user, sb]);

  const syncWeeklyPlan = useCallback((wp: WeeklyPlan) => {
    if (!user) return;
    sb.upsertWeeklyPlan(wp).catch(console.error);
  }, [user, sb]);

  const syncDailyPlan = useCallback((dp: DailyPlan) => {
    if (!user) return;
    sb.upsertDailyPlan(dp).catch(console.error);
  }, [user, sb]);

  const syncTicket = useCallback((ticket: Ticket) => {
    if (!user) return;
    sb.upsertTicket(ticket).catch(console.error);
  }, [user, sb]);

  const getWeeklyPlanCompletedQuantity = (wp: WeeklyPlan) =>
  wp.dailyPlans.reduce((sum, dp) => sum + (dp.completedQuantity || 0), 0);

const isOriginalSixWeekCycleComplete = (plan: SixWeekPlan) => {
  const originalWeeks = plan.weeklyPlans.filter(w => w.weekNumber <= 6);
  if (originalWeeks.length === 0) return false;

  return originalWeeks.every(wp =>
    wp.dailyPlans.length > 0 &&
    wp.dailyPlans.every(dp => dp.status === 'confirmed')
  );
};

const recalculatePlanActivities = (plan: SixWeekPlan): PlanActivity[] => {
  return plan.activities.map(activity => {
    const relatedWeeks = plan.weeklyPlans.filter(wp => wp.taskId === activity.id);

    const completedQuantity = relatedWeeks.reduce(
      (sum, wp) => sum + getWeeklyPlanCompletedQuantity(wp),
      0
    );

    const remainingQuantity = Math.max(0, activity.estimatedQuantity - completedQuantity);

    return {
      ...activity,
      completedQuantity,
      remainingQuantity,
      carryForwardQuantity: remainingQuantity,
    } as PlanActivity;
  });
};



const buildCarryForwardWeeklyPlan = (
  plan: SixWeekPlan,
  activity: PlanActivity,
  nextWeekNumber: number
): WeeklyPlan => ({
  id: crypto.randomUUID(),
  sixWeekPlanId: plan.id,
  weekNumber: nextWeekNumber,
  taskId: activity.id,
  category: activity.category,
  contractorId: activity.contractorId,
  tradeActivity: activity.tradeActivity,
  unit: activity.unit,
  estimatedQuantity: activity.remainingQuantity || 0,
  completedQuantity: 0,
  floorUnits: activity.floorUnits,
  constraint: '',
  status: 'pending',
  assignedToEngineer: false,
  remainingQuantity: activity.remainingQuantity || 0,
  dailyPlans: [],
  isCarryForwardWeek: true,
  sourceActivityId: activity.id,
  sourceWeekNumber: nextWeekNumber - 1,
} as WeeklyPlan);

const evaluateCarryForward = useCallback((projectId: string, sixWeekPlanId: string) => {
  let updatedPlanForSync: SixWeekPlan | null = null;
  let updatedActivitiesForSync: PlanActivity[] = [];

  setProjects(prev =>
    prev.map(project => {
      if (project.id !== projectId) return project;

      return {
        ...project,
        sixWeekPlans: project.sixWeekPlans.map(plan => {
          if (plan.id !== sixWeekPlanId) return plan;

          const totalWeeks = plan.totalDurationWeeks || 6;
          const currentCycleWeeks =
            totalWeeks <= 6
              ? plan.weeklyPlans.filter(w => w.weekNumber <= 6)
              : plan.weeklyPlans.filter(w => w.weekNumber === totalWeeks);

          if (currentCycleWeeks.length === 0) return plan;

          const cycleComplete = currentCycleWeeks.every(wp =>
            wp.dailyPlans.length > 0 &&
            wp.dailyPlans.every(dp => dp.status === 'confirmed')
          );

          if (!cycleComplete) return plan;

          const recalculatedActivities = recalculatePlanActivities(plan);
          const hasCarryForward = recalculatedActivities.some(
            a => (a.remainingQuantity || 0) > 0
          );

          const updatedPlan = {
            ...plan,
            activities: recalculatedActivities,
            carryForwardAvailable: hasCarryForward && totalWeeks < 9,
          } as SixWeekPlan;

          updatedPlanForSync = updatedPlan;
          updatedActivitiesForSync = recalculatedActivities;

          return updatedPlan;
        })
      };
    })
  );

  if (updatedPlanForSync) {
    syncSixWeekPlan(updatedPlanForSync);
    updatedActivitiesForSync.forEach(a => syncActivity(a, sixWeekPlanId));
  }
}, [syncSixWeekPlan, syncActivity]);

  const updateCarryForwardWeek = useCallback((
  projectId: string,
  sixWeekPlanId: string,
  weeklyPlanId: string,
  patch: Partial<WeeklyPlan>
) => {
  setProjects(prev => prev.map(project => {
    if (project.id !== projectId) return project;

    return {
      ...project,
      sixWeekPlans: project.sixWeekPlans.map(plan => {
        if (plan.id !== sixWeekPlanId) return plan;

        const updatedWeeklyPlans = plan.weeklyPlans.map(wp => {
          if (wp.id !== weeklyPlanId) return wp;
          if (!wp.isCarryForwardWeek) return wp;

          const updated: WeeklyPlan = {
            ...wp,
            ...patch,
            weekNumber: wp.weekNumber, // protect
          };

          syncWeeklyPlan(updated);
          return updated;
        });

        return {
          ...plan,
          weeklyPlans: updatedWeeklyPlans
        };
      })
    };
  }));
}, [syncWeeklyPlan]);
const recalculateActivityFromWeeks = (
  activity: PlanActivity,
  weeklyPlans: WeeklyPlan[]
): PlanActivity => {
  const totalPlannedAcrossWeeks = weeklyPlans
    .filter(w => w.taskId === activity.id)
    .reduce((sum, w) => sum + (w.estimatedQuantity || 0), 0);

  const totalCompletedAcrossWeeks = weeklyPlans
    .filter(w => w.taskId === activity.id)
    .reduce((sum, w) => sum + (w.completedQuantity || 0), 0);

  return {
    ...activity,
    completedQuantity: totalCompletedAcrossWeeks,
    remainingQuantity: Math.max(0, activity.estimatedQuantity - totalCompletedAcrossWeeks),
    carryForwardQuantity: Math.max(0, totalPlannedAcrossWeeks - totalCompletedAcrossWeeks),
  };
};
function getUnallocatedCarryForward(
  activity: PlanActivity,
  weeklyPlans: WeeklyPlan[]
) {
  const carryForwardWeeks = weeklyPlans.filter(
    w => w.taskId === activity.id && w.isCarryForwardWeek
  );

  const allocated = carryForwardWeeks.reduce(
    (sum, w) => sum + (w.estimatedQuantity || 0),
    0
  );

  const completed = weeklyPlans
    .filter(w => w.taskId === activity.id)
    .reduce((sum, w) => sum + (w.completedQuantity || 0), 0);

  const actualRemaining = Math.max(0, activity.estimatedQuantity - completed);

  return Math.max(0, actualRemaining - allocated);
}
  // --- Original logic with sync calls ---
const createNextCarryForwardWeek = useCallback((projectId: string, sixWeekPlanId: string) => {
  let updatedPlanForSync: SixWeekPlan | null = null;
  let newWeeklyPlansForSync: WeeklyPlan[] = [];

  setProjects(prev =>
    prev.map(project => {
      if (project.id !== projectId) return project;

      return {
        ...project,
        sixWeekPlans: project.sixWeekPlans.map(plan => {
          if (plan.id !== sixWeekPlanId) return plan;
          if (!plan.carryForwardAvailable) return plan;

          const currentTotalWeeks = plan.totalDurationWeeks || 6;
          if (currentTotalWeeks >= 9) return plan;

          const nextWeekNumber = currentTotalWeeks + 1;
          const recalculatedActivities = recalculatePlanActivities(plan);

          const carryForwardActivities = recalculatedActivities.filter(
            a => (a.remainingQuantity || 0) > 0
          );

          if (carryForwardActivities.length === 0) {
            const noCarryForwardPlan = {
              ...plan,
              activities: recalculatedActivities,
              carryForwardAvailable: false,
            } as SixWeekPlan;

            updatedPlanForSync = noCarryForwardPlan;
            return noCarryForwardPlan;
          }

          const newWeeklyPlans = carryForwardActivities.map(activity =>
            buildCarryForwardWeeklyPlan(plan, activity, nextWeekNumber)
          );

          const updatedPlan = {
            ...plan,
            activities: recalculatedActivities,
            weeklyPlans: [...plan.weeklyPlans, ...newWeeklyPlans],
            extendedWeeks: nextWeekNumber - 6,
            totalDurationWeeks: nextWeekNumber,
            carryForwardAvailable: false,
            carryForwardCreatedUntilWeek: nextWeekNumber,
          } as SixWeekPlan;

          updatedPlanForSync = updatedPlan;
          newWeeklyPlansForSync = newWeeklyPlans;

          return updatedPlan;
        })
      };
    })
  );

  if (updatedPlanForSync) syncSixWeekPlan(updatedPlanForSync);
  newWeeklyPlansForSync.forEach(wp => syncWeeklyPlan(wp));
}, [syncSixWeekPlan, syncWeeklyPlan]);

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
    carryForwardAvailable: false,
    carryForwardCreatedUntilWeek: 6,
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
      setProjects(prev =>
        prev.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            sixWeekPlans: p.sixWeekPlans.map(swp => {
              if (swp.id !== sixWeekPlanId) return swp;
              const updatedActivities = activities.map(activity => {
                const usedQuantity = swp.weeklyPlans
                  .filter(wp => wp.taskId === activity.id)
                  .reduce((sum, wp) => sum + (wp.estimatedQuantity || 0), 0);
                return { ...activity, remainingQuantity: (activity.estimatedQuantity || 0) - usedQuantity };
              });
              return { ...swp, activities: updatedActivities };
            })
          };
        })
      );
      activities.forEach(a => syncActivity(a, sixWeekPlanId));
    }, [syncActivity]
  );

  const addWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, wp: WeeklyPlan) => {
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p, sixWeekPlans: p.sixWeekPlans.map(swp => swp.id === sixWeekPlanId ? { ...swp, weeklyPlans: [...swp.weeklyPlans, wp] } : swp)
    } : p));
    syncWeeklyPlan(wp);
  }, [syncWeeklyPlan]);

  const updateWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, updater: (wp: WeeklyPlan) => WeeklyPlan) => {
    let updatedWP: WeeklyPlan | null = null;
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p, sixWeekPlans: p.sixWeekPlans.map(swp => swp.id === sixWeekPlanId ? {
        ...swp, weeklyPlans: swp.weeklyPlans.map(wp => {
          if (wp.id !== weeklyPlanId) return wp;
          updatedWP = updater(wp);
          return updatedWP;
        })
      } : swp)
    } : p));
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

  const updateActivity2 = useCallback((projectId: string, sixWeekPlanId: string, activityId: string, patch: Partial<PlanActivity>) => {
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p,
      sixWeekPlans: p.sixWeekPlans.map(swp => swp.id !== sixWeekPlanId ? swp : {
        ...swp,
        activities: swp.activities.map(a => {
          if (a.id !== activityId) return a;
          const updated = { ...a, ...patch };
          syncActivity(updated, sixWeekPlanId);
          return updated;
        })
      })
    }));
  }, [syncActivity]);

  const assignToEngineer = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, assignedToEngineer: true, status: 'assigned' }));
  }, [updateWeeklyPlan]);

  const addDailyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, daily: DailyPlan) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, dailyPlans: [...wp.dailyPlans, daily] }));
    syncDailyPlan(daily);
  }, [updateWeeklyPlan, syncDailyPlan]);

  const updateDailyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, updater: (dp: DailyPlan) => DailyPlan) => {
    let updatedDP: DailyPlan | null = null;
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({
      ...wp, dailyPlans: wp.dailyPlans.map(dp => {
        if (dp.id !== dailyPlanId) return dp;
        updatedDP = updater(dp);
        return updatedDP;
      })
    }));
    if (updatedDP) syncDailyPlan(updatedDP);
  }, [updateWeeklyPlan, syncDailyPlan]);

  const forwardDailyToSupervisor = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'forwarded' }));
  }, [updateDailyPlan]);

  const logDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string, completedQuantity: number, isDone: boolean, rov: string) => {
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

    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'logged', completedQuantity, isDone, rov }));

    if (targetDP && targetProject && targetWP && completedQuantity < (targetDP as DailyPlan).plannedQuantity) {
      createTicketFromShortfall(targetProject, swpId, wpId, targetDP, completedQuantity, rov, targetWP);
    }
  }, [projects, updateDailyPlan]);

  const submitDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string, constraintLog: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'submitted', constraintLog, validatedByEngineer: true }));
  }, [updateDailyPlan]);

const confirmDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
  updateDailyPlan(pid, swpId, wpId, dpId, dp => ({
    ...dp,
    status: 'confirmed',
    confirmedByAdmin: true
  }));

  setTimeout(() => {
    evaluateCarryForward(pid, swpId);
  }, 0);
}, [updateDailyPlan, evaluateCarryForward]);

  const createTicketFromShortfall = (project: Project, swpId: string, wpId: string, dp: DailyPlan, completedQuantity: number, rov: string, wp: WeeklyPlan) => {
    const shortfall = dp.plannedQuantity - completedQuantity;
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
      targetQuantity: dp.plannedQuantity,
      completedQuantity,
      shortfallQuantity: shortfall,
      recoveryId: `REC-${Date.now()}`,
      contractorName: wp.contractorId,
      unit: dp.unit,
      rov,
      assignedTo: 'engineer',
      status: 'open'
    };
    setTickets(prev => [...prev, ticket]);
    syncTicket(ticket);
  };

  const updateTicket = useCallback((ticketId: string, patch: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const updated = { ...t, ...patch };
      syncTicket(updated);
      return updated;
    }));
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

    return {
      ...dp,
      completedQuantity,
      rov,
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

    return {
      ...dp,
      completedQuantity: undefined,
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

  setProjects(prev => prev.map(project => {
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

            const restoredRemaining =
              (wp.remainingQuantity ?? 0) + (target.plannedQuantity || 0);

            const updatedWP: WeeklyPlan = {
              ...wp,
              remainingQuantity: restoredRemaining,
              dailyPlans: wp.dailyPlans.filter(dp => dp.id !== dailyPlanId),
            };

            updatedWPForSync = updatedWP;
            return updatedWP;
          })
        };
      })
    };
  }));

  // remove related tickets from local state
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
  updateDailyPlan(projectId, sixWeekPlanId, weeklyPlanId, dailyPlanId, dp => {

    return {
      ...dp,
      ...patch,
      id: dp.id,
      weeklyPlanId: dp.weeklyPlanId,
      status: 'pending',
      completedQuantity: undefined,
      confirmedByAdmin: false,
      validatedByEngineer: false,
    };
  });
}, [updateDailyPlan]);

const updateWeeklyPlanByAdmin = useCallback((
  projectId: string,
  sixWeekPlanId: string,
  weeklyPlanId: string,
  patch: Partial<WeeklyPlan>
) => {
  let originalWP: WeeklyPlan | null = null;
  console.log('check')
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

  // optional safety: don't edit after confirmed execution
  // const hasLockedDaily = originalWP.dailyPlans.some(dp =>
  //   dp.status === 'submitted' || dp.status === 'confirmed'
  // );
  // if (hasLockedDaily) return;

  const oldQty = Number(originalWP.estimatedQuantity || 0);
  const newQty =
    patch.estimatedQuantity !== undefined
      ? Number(patch.estimatedQuantity)
      : oldQty;

  setProjects(prev => prev.map(project => {
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

          const updated: WeeklyPlan = {
            ...wp,
            ...patch,
            estimatedQuantity: safeQty,
            remainingQuantity:
              patch.remainingQuantity !== undefined
                ? patch.remainingQuantity
                : safeQty,
          };

          syncWeeklyPlan(updated);
          return updated;
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
  }));
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

  const hasLockedDaily = targetWP.dailyPlans.some(dp =>
    dp.status !== 'pending'
  );
  if (hasLockedDaily) return;

  setProjects(prev => prev.map(project => {
    if (project.id !== projectId) return project;

    return {
      ...project,
      sixWeekPlans: project.sixWeekPlans.map(plan => {
        if (plan.id !== sixWeekPlanId) return plan;

        const updatedActivities = plan.activities.map(a => {
          if (a.id !== targetWP!.taskId) return a;

          const restored = {
            ...a,
            remainingQuantity: (a.remainingQuantity || 0) + (targetWP!.estimatedQuantity || 0),
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
  }));

  // remove related tickets from local state
  setTickets(prev => prev.filter(t => t.weeklyPlanId !== weeklyPlanId));

  if (user) {
    sb.deleteTicketsByWeeklyPlanId(weeklyPlanId).catch(console.error);
    sb.deleteWeeklyPlan(weeklyPlanId).catch(console.error);
  }
}, [projects, syncActivity, user, sb]);

  return (
<AppContext.Provider value={{
  role, contractors, addContractor,
  projects, createProject, activeProjectId, setActiveProjectId,
  addSixWeekPlan, updateSixWeekPlanActivities, addWeeklyPlan, assignToEngineer,
  addDailyPlan, updateDailyPlanByEngineer, deleteDailyPlanByEngineer,
  forwardDailyToSupervisor, logDailyTarget, submitDailyTarget, confirmDailyTarget,
  tickets, updateActivity2, updateWeeklyPlanField, updateWeeklyPlanByAdmin, deleteWeeklyPlanByAdmin, updateTicket,
  evaluateCarryForward, createNextCarryForwardWeek, updateCarryForwardWeek,deleteSupervisorLog,
  syncing
}}>
      {children}
    </AppContext.Provider>
  );
};
