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

  // --- Original logic with sync calls ---

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
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sixWeekPlans: [...p.sixWeekPlans, plan] } : p));
    syncSixWeekPlan(plan);
    plan.activities.forEach(a => syncActivity(a, plan.id));
  }, [syncSixWeekPlan, syncActivity]);

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

  const updateWeeklyPlanField = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, patch: Partial<WeeklyPlan>) => {
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
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'confirmed', confirmedByAdmin: true }));
  }, [updateDailyPlan]);

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

  return (
    <AppContext.Provider value={{
      role, contractors, addContractor,
      projects, createProject, activeProjectId, setActiveProjectId,
      addSixWeekPlan, updateSixWeekPlanActivities, addWeeklyPlan, assignToEngineer,
      addDailyPlan, forwardDailyToSupervisor, logDailyTarget, submitDailyTarget, confirmDailyTarget,
      tickets, updateActivity2, updateWeeklyPlanField, updateTicket, syncing
    }}>
      {children}
    </AppContext.Provider>
  );
};
