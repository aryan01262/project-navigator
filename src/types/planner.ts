export type Role = 'admin' | 'supervisor' | 'engineer';

export interface Contractor {
  id: string;
  name: string;
  contact?: string;
  specialization?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  sixWeekPlans: SixWeekPlan[];
}

export interface SixWeekPlan {
  id: string;
  projectId: string;
  name: string;
  category: string;
  contractorId: string;
  tradeActivity: string;
  unit: string;
  estimatedQuantity: number;
  floorUnits: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  weeklyPlans: WeeklyPlan[];
}

export interface DailyPlan {
  id: string;
  weeklyPlanId: string;
  dayNumber: number; // 1-7 (Mon-Sun)
  date: string;
  plannedQuantity: number;
  unit: string;
  constraint: string;
  floorUnits: string;
  engineerNote?: string;
  // Supervisor fields
  completedQuantity?: number;
  isDone?: boolean;
  supervisorNote?: string;
  // Engineer validation
  constraintLog?: string;
  validatedByEngineer?: boolean;
  // Admin confirmation
  confirmedByAdmin?: boolean;
  status: 'pending' | 'assigned' | 'forwarded' | 'logged' | 'submitted' | 'validated' | 'confirmed';
}

export interface WeeklyPlan {
  id: string;
  sixWeekPlanId: string;
  weekNumber: number;
  taskId: string;
  category: string;
  contractorId: string;
  tradeActivity: string;
  unit: string;
  estimatedQuantity: number;
  floorUnits: string;
  constraint: string;
  status: 'pending' | 'assigned' | 'forwarded' | 'logged' | 'submitted' | 'validated' | 'confirmed';
  assignedToEngineer: boolean;
  dailyPlans: DailyPlan[];
}

// Dummy data for dropdowns
export const CATEGORIES = [
  'Structural', 'Finishing', 'MEP', 'Civil', 'Interior', 'Exterior', 'Landscaping', 'Waterproofing'
];

export const TRADE_ACTIVITIES = [
  'RCC (Shuttering, Reinforcement, Casting)',
  'Blockwork / Masonry',
  'Plastering (Internal & External)',
  'Plumbing & Drainage',
  'Electrical Wiring & Conduit',
  'HVAC Ducting & Installation',
  'Waterproofing & Insulation',
  'Tiling & Flooring',
  'Painting & Coating',
  'Glazing & Aluminium Works',
  'Fire Fighting Installation',
  'False Ceiling & Partitions',
];

export const UNITS = [
  'sq.m', 'cu.m', 'rmt', 'nos', 'kg', 'lots', 'sqft', 'bags', 'trips'
];

export const FLOOR_UNITS = [
  'Basement 2', 'Basement 1', 'Ground Floor', 'Podium',
  '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor',
  '6th Floor', '7th Floor', '8th Floor', '9th Floor', '10th Floor',
  '11th Floor', '12th Floor', '13th Floor', '14th Floor', '15th Floor',
  'Terrace', 'Roof',
];

export const CONSTRAINTS = [
  'Material Shortage', 'Manpower Shortage', 'Drawing Pending',
  'Approval Pending', 'Weather Delay', 'Access Issue',
  'Rework Required', 'Client Change', 'Safety Concern', 'No Constraint',
];

export const DEFAULT_CONTRACTORS: Contractor[] = [
  { id: '1', name: 'Adhiraj Construction', specialization: 'Structural' },
  { id: '2', name: 'Skyline Builders', specialization: 'MEP' },
  { id: '3', name: 'Prime Infrastructure', specialization: 'Civil' },
  { id: '4', name: 'Apex Engineering Co.', specialization: 'Structural' },
  { id: '5', name: 'Metro Constructions', specialization: 'Finishing' },
  { id: '6', name: 'Pinnacle Works Pvt Ltd', specialization: 'Interior' },
  { id: '7', name: 'Greenfield Projects', specialization: 'Landscaping' },
  { id: '8', name: 'United MEP Solutions', specialization: 'MEP' },
  { id: '9', name: 'Reliable Waterproofing Co.', specialization: 'Waterproofing' },
  { id: '10', name: 'Bharat Electrical Works', specialization: 'MEP' },
  { id: '11', name: 'Singh & Sons Civil', specialization: 'Civil' },
  { id: '12', name: 'Royal Interiors Group', specialization: 'Interior' },
];
