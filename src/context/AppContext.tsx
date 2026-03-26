import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Role, Project, SixWeekPlan, WeeklyPlan, DailyPlan, Contractor, PlanActivity } from '@/types/planner';
import { DEFAULT_CONTRACTORS } from '@/types/planner';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  contractors: Contractor[];
  addContractor: (contractor: Contractor) => void;
  projects: Project[];
  createProject: (project: Project) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  addSixWeekPlan: (projectId: string, plan: SixWeekPlan) => void;
  updateSixWeekPlanActivities: (projectId: string, sixWeekPlanId: string, activities: PlanActivity[]) => void;
  addWeeklyPlan: (projectId: string, sixWeekPlanId: string, plan: WeeklyPlan) => void;
  assignToEngineer: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => void;
  addDailyPlan: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, daily: DailyPlan) => void;
  forwardDailyToSupervisor: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string) => void;
  logDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, completedQty: number, isDone: boolean, note: string) => void;
  submitDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, constraintLog: string) => void;
  confirmDailyTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const STORAGE_KEY = 'sixweek-planner-v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('admin');
  const [contractors, setContractors] = useState<Contractor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-contractors');
    return saved ? JSON.parse(saved) : DEFAULT_CONTRACTORS;
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-contractors', JSON.stringify(contractors)); }, [contractors]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-projects', JSON.stringify(projects)); }, [projects]);

  const addContractor = useCallback((c: Contractor) => setContractors(prev => [...prev, c]), []);
  const createProject = useCallback((p: Project) => { setProjects(prev => [...prev, p]); setActiveProjectId(p.id); }, []);

  const addSixWeekPlan = useCallback((projectId: string, plan: SixWeekPlan) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sixWeekPlans: [...p.sixWeekPlans, plan] } : p));
  }, []);

  const addWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, wp: WeeklyPlan) => {
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p, sixWeekPlans: p.sixWeekPlans.map(swp => swp.id === sixWeekPlanId ? { ...swp, weeklyPlans: [...swp.weeklyPlans, wp] } : swp)
    } : p));
  }, []);

  const updateWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, updater: (wp: WeeklyPlan) => WeeklyPlan) => {
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p, sixWeekPlans: p.sixWeekPlans.map(swp => swp.id === sixWeekPlanId ? {
        ...swp, weeklyPlans: swp.weeklyPlans.map(wp => wp.id === weeklyPlanId ? updater(wp) : wp)
      } : swp)
    } : p));
  }, []);

  const assignToEngineer = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, assignedToEngineer: true, status: 'assigned' }));
  }, [updateWeeklyPlan]);

  const addDailyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, daily: DailyPlan) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, dailyPlans: [...wp.dailyPlans, daily] }));
  }, [updateWeeklyPlan]);

  const updateDailyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, dailyPlanId: string, updater: (dp: DailyPlan) => DailyPlan) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({
      ...wp, dailyPlans: wp.dailyPlans.map(dp => dp.id === dailyPlanId ? updater(dp) : dp)
    }));
  }, [updateWeeklyPlan]);

  const forwardDailyToSupervisor = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'forwarded' }));
  }, [updateDailyPlan]);

  const logDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string, completedQuantity: number, isDone: boolean, supervisorNote: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'logged', completedQuantity, isDone, supervisorNote }));
  }, [updateDailyPlan]);

  const submitDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string, constraintLog: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'submitted', constraintLog, validatedByEngineer: true }));
  }, [updateDailyPlan]);

  const confirmDailyTarget = useCallback((pid: string, swpId: string, wpId: string, dpId: string) => {
    updateDailyPlan(pid, swpId, wpId, dpId, dp => ({ ...dp, status: 'confirmed', confirmedByAdmin: true }));
  }, [updateDailyPlan]);

  return (
    <AppContext.Provider value={{
      role, setRole, contractors, addContractor,
      projects, createProject, activeProjectId, setActiveProjectId,
      addSixWeekPlan, addWeeklyPlan, assignToEngineer,
      addDailyPlan, forwardDailyToSupervisor, logDailyTarget, submitDailyTarget, confirmDailyTarget,
    }}>
      {children}
    </AppContext.Provider>
  );
};
