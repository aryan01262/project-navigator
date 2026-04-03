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

export interface PlanActivity {
  id: string;
  category: string;
  contractorId: string;
  trade: string;
  tradeActivity: string;
  unit: string;
  estimatedQuantity: number;
  floorUnits: string[];
  remainingQuantity: number;
}

export interface SixWeekPlan {
  id: string;
  projectId: string;
  name: string;
  activities: PlanActivity[];
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
  floorUnits: string[];
  engineerNote?: string;
  // Supervisor fields
  completedQuantity?: number;
  remainingQuantity? : number;
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
  floorUnits: string[];
  constraint: string;
  status: 'pending' | 'assigned' | 'forwarded' | 'logged' | 'submitted' | 'validated' | 'confirmed';
  assignedToEngineer: boolean;
  remainingQuantity : number;
  dailyPlans: DailyPlan[];
  
}

// Dummy data for dropdowns
export const CATEGORIES = [
  'Detailed Design & Approvals','Site Preparation','Structural Works', 'Structural & Exterior Systems', 'MEP Core Installation', 'Interior Finishing', 'Interior Construction', 'Exterior development', 'Fixtures & Equipment', 'Testing & Commissioning', 'Handover & Closeout', 'General/Cross-Trade Activities'
];

export interface Ticket {
  id: string;
  projectId: string;
  sixWeekPlanId: string;
  weeklyPlanId: string;
  dailyPlanId: string;

  tradeName: string;
  taskId: string;

  date: string;

  targetQuantity: number;
  completedQuantity: number;
  shortfallQuantity: number;

  recoveryId: string;
  contractorName: string;
  unit: string;

  rov: string; // supervisor note

  // Engineer will fill these
  recoveryDeadline?: string;
  contractorStatement?: string;
   assignedTo: 'engineer';
  status: 'open' | 'in-progress' | 'closed';
}

export const TRADE_ACTIVITIES =[
  "Trade",
  "Surveying",
  "Earthwork",
  "Piling / Foundation",
  "RCC / Structural",
  "Structural Steel",
  "Rebar",
  "Formwork",
  "Masonry",
  "Plaster",
  "Waterproofing",
  "Flooring / Tiling",
  "Stone Works",
  "Painting",
  "Carpentry",
  "Doors / Windows",
  "Aluminium / Glazing",
  "Façade / Cladding",
  "False Ceiling",
  "Drywall / Partitions",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Firefighting",
  "ELV / ICT",
  "Lift / Escalator",
  "External Development",
  "Road / Paving",
  "Landscaping",
  "Testing & Commissioning",
  "Equipment / Machinery",
  "General Site Work"
];

export const UNITS = [
  'FLAT', 'SQM', 'MT', 'CUBIC'
];

export const FLOOR_UNITS = [
  'Basement 2', 'Basement 1', 'Ground Floor', 'Podium',
  '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor',
  '6th Floor', '7th Floor', '8th Floor', '9th Floor', '10th Floor',
  '11th Floor', '12th Floor', '13th Floor', '14th Floor', '15th Floor',
  'Terrace', 'Roof',
];

export const CONSTRAINTS = [
  'Material Shortage', 'Material Arrived Late', 'Faulty Material, wrong specs','Material Unavailability due to vendor/transporter',
  'Labour Shortage', 'Insufficient skill of workmen', 'Low Productivity', 'Execution Failure', 'Equipment Breakdown', 'Low output of equipment', 
  "Lack of sufficient drawings / specifications for work", "Design error found while executing", "Delay in decisions by Client / Consultant / Govt. Authorities",
   "Lack of Space Planning", "Failure in coordination of shared resources (equipment, storage, water, power, scaffolding) (available at project site, but not available for the work spot)",
  "Failure in coordination of different trades of workmen (improper hand-offs)", "Inspection / permission required",
  "Change in priority of work",
  "Excessive work planned",
  "Wrong sequencing of works","Pre-requisite work",
  "Consequential Delay - delay due to WIP or backlog",
  "Emergencies",
  "Accidents",
  "Weather Conditions (Rain, Extreme Heat or Cold)",
  "Visits (Management, Client, Government Officials, Outsiders)",
  "Power Breakdown",
  "Unforeseen Site Conditions (Underground services, structures, leakage from existing services, etc.)"
];

export const CONSTRAINTS_CATEGORY = [
  'Material','MAN', 'MACHINE', 'METHOD', 'ENVIORANMENT/SITE'
]

const constraintCategories = [
  { category: "MATERIAL", reason: "Material arrived late" },
  { category: "MATERIAL", reason: "Material shortage" },
  { category: "MATERIAL", reason: "Faulty material / wrong specifications" },
  { category: "MATERIAL", reason: "Material unavailable due to vendor / transporter" },

  { category: "MAN (LABOUR)", reason: "Labour shortage" },
  { category: "MAN (LABOUR)", reason: "Insufficient skill of workmen" },
  { category: "MAN (LABOUR)", reason: "Low productivity" },
  { category: "MAN (LABOUR)", reason: "Execution failures" },

  { category: "MACHINE", reason: "Equipment breakdown" },
  { category: "MACHINE", reason: "Low output of equipment" },

  { category: "METHOD", reason: "Lack of sufficient drawings / specifications" },
  { category: "METHOD", reason: "Design error found while executing" },
  { category: "METHOD", reason: "Delay in decisions by client / consultant / authorities" },
  { category: "METHOD", reason: "Lack of space planning" },
  { category: "METHOD", reason: "Failure in coordination of shared resources" },
  { category: "METHOD", reason: "Failure in coordination between trades" },
  { category: "METHOD", reason: "Inspection / permission required" },
  { category: "METHOD", reason: "Change in priority of work" },
  { category: "METHOD", reason: "Excessive work planned" },
  { category: "METHOD", reason: "Wrong sequencing of works" },
  { category: "METHOD", reason: "Consequential delay due to WIP / backlog" },
  { category: "METHOD", reason: "Pre-requisite work not completed" },

  { category: "ENVIRONMENT / SITE", reason: "Accidents" },
  { category: "ENVIRONMENT / SITE", reason: "Weather conditions" },
  { category: "ENVIRONMENT / SITE", reason: "Visits (management / client / officials)" },
  { category: "ENVIRONMENT / SITE", reason: "Power breakdown" },
  { category: "ENVIRONMENT / SITE", reason: "Unforeseen site conditions" },
  { category: "ENVIRONMENT / SITE", reason: "On-site conditions" }
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
