import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Role, Project, SixWeekPlan, WeeklyPlan, DailyPlan, Contractor } from '@/types/planner';
import { DEFAULT_CONTRACTORS } from '@/types/planner';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  // Contractors
  contractors: Contractor[];
  addContractor: (contractor: Contractor) => void;
  // Projects
  projects: Project[];
  createProject: (project: Project) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  // 6-week plans
  addSixWeekPlan: (projectId: string, plan: SixWeekPlan) => void;
  // Weekly plans
  addWeeklyPlan: (projectId: string, sixWeekPlanId: string, plan: WeeklyPlan) => void;
  assignToEngineer: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => void;
  // Engineer & Supervisor actions
  forwardToSupervisor: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => void;
  logTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, completedQty: number, isDone: boolean, note: string) => void;
  validateTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string, constraintLog: string) => void;
  confirmTarget: (projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => void;
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-contractors', JSON.stringify(contractors));
  }, [contractors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '-projects', JSON.stringify(projects));
  }, [projects]);

  const addContractor = useCallback((c: Contractor) => {
    setContractors(prev => [...prev, c]);
  }, []);

  const createProject = useCallback((p: Project) => {
    setProjects(prev => [...prev, p]);
    setActiveProjectId(p.id);
  }, []);

  const addSixWeekPlan = useCallback((projectId: string, plan: SixWeekPlan) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, sixWeekPlans: [...p.sixWeekPlans, plan] } : p
    ));
  }, []);

  const addWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, wp: WeeklyPlan) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        sixWeekPlans: p.sixWeekPlans.map(swp =>
          swp.id === sixWeekPlanId ? { ...swp, weeklyPlans: [...swp.weeklyPlans, wp] } : swp
        )
      } : p
    ));
  }, []);

  const updateWeeklyPlan = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, updater: (wp: WeeklyPlan) => WeeklyPlan) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        sixWeekPlans: p.sixWeekPlans.map(swp =>
          swp.id === sixWeekPlanId ? {
            ...swp,
            weeklyPlans: swp.weeklyPlans.map(wp => wp.id === weeklyPlanId ? updater(wp) : wp)
          } : swp
        )
      } : p
    ));
  }, []);

  const assignToEngineer = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, assignedToEngineer: true, status: 'assigned' }));
  }, [updateWeeklyPlan]);

  const forwardToSupervisor = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, status: 'forwarded' }));
  }, [updateWeeklyPlan]);

  const logTarget = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, completedQuantity: number, isDone: boolean, supervisorNote: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, status: 'logged', completedQuantity, isDone, supervisorNote }));
  }, [updateWeeklyPlan]);

  const validateTarget = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string, constraintLog: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, status: 'validated', constraintLog, validatedByEngineer: true }));
  }, [updateWeeklyPlan]);

  const confirmTarget = useCallback((projectId: string, sixWeekPlanId: string, weeklyPlanId: string) => {
    updateWeeklyPlan(projectId, sixWeekPlanId, weeklyPlanId, wp => ({ ...wp, status: 'confirmed', confirmedByAdmin: true }));
  }, [updateWeeklyPlan]);

  return (
    <AppContext.Provider value={{
      role, setRole,
      contractors, addContractor,
      projects, createProject,
      activeProjectId, setActiveProjectId,
      addSixWeekPlan,
      addWeeklyPlan, assignToEngineer,
      forwardToSupervisor, logTarget, validateTarget, confirmTarget,
    }}>
      {children}
    </AppContext.Provider>
  );
};
