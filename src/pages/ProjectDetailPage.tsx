import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays, nextSunday } from 'date-fns';
import { ArrowLeft, Plus, CalendarIcon, Send, Check, CalendarDays, ChevronDown, ChevronRight, BarChart3, Trash2, Pencil } from 'lucide-react';
import { CATEGORIES, TRADE_ACTIVITIES, UNITS, FLOOR_UNITS, CONSTRAINTS } from '@/types/planner';
import type {
  SixWeekPlan,
  WeeklyPlan,
  DailyPlan,
  PlanActivity,
  QuantityBreakdown
} from '@/types/planner';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from 'react-i18next';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyActivity = (): PlanActivity => ({
  id: crypto.randomUUID(),
  category: '',
  contractorId: '',
  trade: '',
  tradeActivity: '',
  quantityBreakdown: [],
  units: [],
  estimatedQuantity: 0,
  floorUnits: [],
  remainingQuantity: 0,
});
type QuantityBreakdownEditorProps = {
  value: QuantityBreakdown[];
  onChange: (rows: QuantityBreakdown[]) => void;
  mode?: 'planned' | 'actual';
  allowedRows?: QuantityBreakdown[];
  allowedFloors?: string[];
  allowedUnits?: string[];
};


const totalQty = (rows: QuantityBreakdown[] = []) =>
  rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

const totalCompletedQty = (rows: QuantityBreakdown[] = []) =>
  rows.reduce((sum, r) => sum + Number(r.completedQuantity || 0), 0);

const totalRemainingQty = (rows: QuantityBreakdown[] = []) =>
  rows.reduce((sum, r) => {
    const planned = Number(r.quantity || 0);
    const completed = Number(r.completedQuantity || 0);
    return sum + Math.max(0, planned - completed);
  }, 0);

const getFloorsFromBreakdown = (rows: QuantityBreakdown[] = []) =>
  Array.from(new Set(rows.map(r => r.floorUnit).filter(Boolean)));

const getUnitsFromBreakdown = (rows: QuantityBreakdown[] = []) =>
  Array.from(new Set(rows.map(r => r.unit).filter(Boolean)));

const normalizeBreakdown = <T extends {
  quantityBreakdown?: QuantityBreakdown[];
  estimatedQuantity?: number;
  plannedQuantity?: number;
  remainingQuantity?: number;
  completedQuantity?: number;
  floorUnits?: string[];
  units?: string[];
  unit?: string;
}>(item: T): T => {
  const rows = item.quantityBreakdown || [];
  if (!rows.length) return item;

  const floors = getFloorsFromBreakdown(rows);
  const units = getUnitsFromBreakdown(rows);

  return {
    ...item,
    estimatedQuantity: 'estimatedQuantity' in item ? totalQty(rows) : item.estimatedQuantity,
    plannedQuantity: 'plannedQuantity' in item ? totalQty(rows) : item.plannedQuantity,
    completedQuantity: totalCompletedQty(rows) || item.completedQuantity,
    remainingQuantity: totalRemainingQty(rows),
    floorUnits: floors,
    units,
    unit: units[0] || item.unit,
  };
};

const getUnitWiseTotals = (rows: QuantityBreakdown[] = []) => {
  return rows.reduce((acc, row) => {
    const unit = row.unit || '—';
    acc[unit] = (acc[unit] || 0) + Number(row.quantity || 0);
    return acc;
  }, {} as Record<string, number>);
};

const UnitWiseTotalView = ({ rows }: { rows?: QuantityBreakdown[] }) => {
  const totals = getUnitWiseTotals(rows || []);
  const entries = Object.entries(totals);

  if (!entries.length) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-1 text-xs font-semibold">
      {entries.map(([unit, qty]) => (
        <div key={unit}>
          {qty} {unit}
        </div>
      ))}
    </div>
  );
};

const QuantityBreakdownEditor = ({
  value,
  onChange,
  mode = 'planned',
  allowedRows,
  allowedFloors = FLOOR_UNITS,
  allowedUnits = UNITS,
}: QuantityBreakdownEditorProps) => {
  const addRow = () => {
    const base = allowedRows?.[0];

    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        floorUnit: base?.floorUnit || '',
        unit: base?.unit || '',
        quantity: 0,
        completedQuantity: mode === 'actual' ? 0 : undefined,
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<QuantityBreakdown>) => {
    onChange(value.map(row => row.id === id ? { ...row, ...patch } : row));
  };

  const removeRow = (id: string) => {
    onChange(value.filter(row => row.id !== id));
  };

  const rowOptions = allowedRows?.length
    ? allowedRows
    : [];

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Floor</TableHead>
              <TableHead className="text-xs">Unit</TableHead>
              <TableHead className="text-xs">Planned Qty</TableHead>
              {mode === 'actual' && <TableHead className="text-xs">Actual Qty</TableHead>}
              <TableHead className="text-xs w-20">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {value.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  {rowOptions.length ? (
                    <Select
                      value={`${row.floorUnit}|${row.unit}`}
                      onValueChange={(v) => {
                        const [floorUnit, unit] = v.split('|');
                        updateRow(row.id, { floorUnit, unit });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select floor/unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {rowOptions.map(r => (
                          <SelectItem key={`${r.floorUnit}|${r.unit}`} value={`${r.floorUnit}|${r.unit}`}>
                            {r.floorUnit} - {r.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={row.floorUnit}
                      onValueChange={v => updateRow(row.id, { floorUnit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedFloors.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell>
                  {rowOptions.length ? (
                    <span className="text-sm">{row.unit || '—'}</span>
                  ) : (
                    <Select
                      value={row.unit}
                      onValueChange={v => updateRow(row.id, { unit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedUnits.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    value={row.quantity || ''}
                    onChange={e => updateRow(row.id, { quantity: Number(e.target.value) })}
                  />
                </TableCell>

                {mode === 'actual' && (
                  <TableCell>
                    <Input
                      type="number"
                      step="any"
                      value={row.completedQuantity ?? ''}
                      onChange={e => updateRow(row.id, { completedQuantity: Number(e.target.value) })}
                    />
                  </TableCell>
                )}

                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="w-3 h-3" /> Add Floor Qty
        </Button>

        <span className="text-xs text-muted-foreground">
          Planned: {totalQty(value)}
          {mode === 'actual' && ` · Actual: ${totalCompletedQty(value)} · Remaining: ${totalRemainingQty(value)}`}
        </span>
      </div>
    </div>
  );
};


const QtyBreakdownView = ({ rows }: { rows?: QuantityBreakdown[] }) => {
  if (!rows?.length) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="min-w-[260px] space-y-1">
      {rows.map(row => (
        <div
          key={row.id}
          className="grid grid-cols-[1fr_70px_70px] gap-2 rounded border bg-muted/20 px-2 py-1 text-xs"
        >
          <span className="font-medium truncate" title={row.floorUnit}>
            {row.floorUnit || '—'}
          </span>

          <span className="text-right">
            {row.quantity || 0}
          </span>

          <span className="text-muted-foreground">
            {row.unit || '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

const ActualBreakdownView = ({ rows }: { rows?: QuantityBreakdown[] }) => {
  if (!rows?.length) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="min-w-[320px] space-y-1">
      {rows.map(row => {
        const planned = Number(row.quantity || 0);
        const actual = Number(row.completedQuantity || 0);
        const remaining = Math.max(0, planned - actual);

        return (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_60px_60px_70px_60px] gap-2 rounded border bg-muted/20 px-2 py-1 text-xs"
          >
            <span className="font-medium truncate" title={row.floorUnit}>
              {row.floorUnit || '—'}
            </span>

            <span className="text-right">{planned}</span>
            <span className="text-right text-green-700">{actual}</span>
            <span className="text-right text-destructive">{remaining}</span>
            <span className="text-muted-foreground">{row.unit || '—'}</span>
          </div>
        );
      })}
    </div>
  );
};

const getSubWeekDateRange = (planStartDate: string, weekNumber: number) => {
  const start = addDays(new Date(planStartDate), (weekNumber - 1) * 7);
  const end = addDays(start, 5); // 6 working days: Mon-Sat

  return {
    weekStartDate: format(start, 'yyyy-MM-dd'),
    weekEndDate: format(end, 'yyyy-MM-dd'),
    displayStartDate: format(start, 'dd-MM-yyyy'),
    displayEndDate: format(end, 'dd-MM-yyyy'),
  };
};

const ProjectDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
const {
  projects, contractors, role,
  addSixWeekPlan, updateSixWeekPlanActivities, addWeeklyPlan, assignToEngineer,
  addDailyPlan, updateDailyPlanByEngineer, deleteDailyPlanByEngineer,
  forwardDailyToSupervisor, logDailyTarget, submitDailyTarget, confirmDailyTarget,
  updateActivity2, updateWeeklyPlanField, updateWeeklyPlanByAdmin, deleteWeeklyPlanByAdmin,
  tickets, updateTicket, deleteSupervisorLog, updateSupervisorLog,  backlogs,
  generateWeeklyBacklog,
  applyBacklogToNextWeek
} = useAppContext();

  const project = projects.find(p => p.id === projectId);

  // UI state
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateWeekly, setShowCreateWeekly] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedWeekly, setExpandedWeekly] = useState<string | null>(null);
  const [showCreateDaily, setShowCreateDaily] = useState<{ swpId: string; wpId: string } | null>(null);

  // 6-week plan form
  const [planName, setPlanName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [planStartDate, setPlanStartDate] = useState<Date>();
  const [planActivities, setPlanActivities] = useState<PlanActivity[]>([emptyActivity()]);
  const [editingActivityIdx, setEditingActivityIdx] = useState<number | null>(0);

  // Weekly plan form - now activity-driven
  const [wpActivityId, setWpActivityId] = useState('');
  const [wpUnits, setWpUnits] = useState<string[]>([]);
  const [wpEstQty, setWpEstQty] = useState('');
  const [wpFloor, setWpFloor] = useState<string[]>([]);
  const [wpWeek, setWpWeek] = useState('1');
  const [wpConstraint, setWpConstraint] = useState('');
const [showNewPlanBlock, setShowNewPlanBlock] = useState(false);
const [planDialogMode, setPlanDialogMode] = useState<'six-week' | 'new-plan'>('six-week');
const [wpConstraintDate, setWpConstraintDate] = useState('');
const [wpResponsiblePerson, setWpResponsiblePerson] = useState('');
  // Daily plan form
  const [dpDate, setDpDate] = useState('');
  const [dpDay, setDpDay] = useState('1');
  const [dpQty, setDpQty] = useState('');
  const [dpConstraint, setDpConstraint] = useState('');
  const [dpFloor, setDpFloor] = useState<string[]>([]);
  const [dpNote, setDpNote] = useState('');
  const [dpUnits, setDpUnits] = useState<string[]>([]);
  const [dpConstraintDate, setDpConstraintDate] = useState('');
const [dpResponsiblePerson, setDpResponsiblePerson] = useState('');
  // Supervisor log
  const [logQty, setLogQty] = useState('');
  const [logNote, setLogNote] = useState('');
  const [rovComment, setRovComment] = useState('');

  // Inline editing for activities table
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<PlanActivity | null>(null);
const [showTickets, setShowTickets] = useState(false);
const [ticketTab, setTicketTab] = useState<'open' | 'in-progress' | 'closed'>('open');
  // Engineer submit
  const [submitConstraint, setSubmitConstraint] = useState('');


  const [showEditDaily, setShowEditDaily] = useState<{ swpId: string; wpId: string; dpId: string } | null>(null);
const [editDpDate, setEditDpDate] = useState('');
const [editDpDay, setEditDpDay] = useState('1');
const [editDpQty, setEditDpQty] = useState('');
const [editDpConstraint, setEditDpConstraint] = useState('');
const [editDpFloor, setEditDpFloor] = useState<string[]>([]);
const [editDpNote, setEditDpNote] = useState('');
const [editDpUnits, setEditDpUnits] = useState<string[]>([]);

const [showEditWeekly, setShowEditWeekly] = useState<{ swpId: string; wpId: string } | null>(null);
const [editWpQty, setEditWpQty] = useState('');
const [editWpConstraint, setEditWpConstraint] = useState('');
const [editWpFloor, setEditWpFloor] = useState<string[]>([]);
const [editWpUnits, setEditWpUnits] = useState<string[]>([]);
const [editWpContractorId, setEditWpContractorId] = useState('');
const [planTab, setPlanTab] = useState<'six-week' | 'new-plan'>('six-week');
const [showSupervisorLogDialog, setShowSupervisorLogDialog] = useState<{
  sixWeekPlanId: string;
  weeklyPlanId: string;
  dailyPlanId: string;
} | null>(null);
const [supervisorDialogMode, setSupervisorDialogMode] = useState<'create' | 'edit'>('create');
const [supervisorLogQty, setSupervisorLogQty] = useState('');
const [supervisorRovComment, setSupervisorRovComment] = useState('');
const [wpBreakdown, setWpBreakdown] = useState<QuantityBreakdown[]>([]);
const [dpBreakdown, setDpBreakdown] = useState<QuantityBreakdown[]>([]);
const [editWpBreakdown, setEditWpBreakdown] = useState<QuantityBreakdown[]>([]);
const [editDpBreakdown, setEditDpBreakdown] = useState<QuantityBreakdown[]>([]);
const [supervisorBreakdown, setSupervisorBreakdown] = useState<QuantityBreakdown[]>([]);

const openSupervisorLogDialog = (
  sixWeekPlanId: string,
  weeklyPlanId: string,
  dp: DailyPlan,
  mode: 'create' | 'edit' = 'create'
) => {
  setShowSupervisorLogDialog({ sixWeekPlanId, weeklyPlanId, dailyPlanId: dp.id });
  setSupervisorDialogMode(mode);
  setSupervisorBreakdown((dp.quantityBreakdown || []).map(r => ({
    ...r,
    completedQuantity: r.completedQuantity ?? 0,
  })));
  setSupervisorLogQty(dp.completedQuantity ? String(dp.completedQuantity) : '');
  setSupervisorRovComment(dp.rov || 'none');
};
const handleSupervisorLogSubmit = () => {
  if (!showSupervisorLogDialog || !project) return;

  const { sixWeekPlanId, weeklyPlanId, dailyPlanId } = showSupervisorLogDialog;
  const qty = supervisorBreakdown.length
  ? totalCompletedQty(supervisorBreakdown)
  : Number(supervisorLogQty || 0);

  if (qty <= 0) {
    alert('Done quantity must be greater than 0');
    return;
  }

  if (supervisorDialogMode === 'edit') {
    updateSupervisorLog(
      project.id,
      sixWeekPlanId,
      weeklyPlanId,
      dailyPlanId,
      qty,
      supervisorRovComment
    );
  } else {
    logDailyTarget(
      project.id,
      sixWeekPlanId,
      weeklyPlanId,
      dailyPlanId,
      qty,
      true,
      supervisorRovComment
    );
  }

  setShowSupervisorLogDialog(null);
  setSupervisorDialogMode('create');
  setSupervisorLogQty('');
  setSupervisorRovComment('');
};
const openEditWeeklyDialog = (swpId: string, wp: WeeklyPlan) => {
  setShowEditWeekly({ swpId, wpId: wp.id });
  setEditWpQty(String(wp.estimatedQuantity || 0));
  setEditWpConstraint(wp.constraint || '');
  setEditWpFloor(Array.isArray(wp.floorUnits) ? wp.floorUnits : []);
  setEditWpUnits(wp.units || (wp.unit ? [wp.unit] : []));
  setEditWpContractorId(wp.contractorId || '');
  setEditWpBreakdown(wp.quantityBreakdown || []);
};

const handleUpdateWeekly = () => {
  if (!showEditWeekly || !project) return;
  
  const swp = project.sixWeekPlans.find(s => s.id === showEditWeekly.swpId);
  const wp = swp?.weeklyPlans.find(w => w.id === showEditWeekly.wpId);
  if (!swp || !wp) return;
console.log("here", swp, wp)
 const qty = editWpBreakdown.length ? totalQty(editWpBreakdown) : Number(editWpQty || 0);
  if (qty <= 0) {
    alert('Quantity must be greater than 0');
    return;
  }

  updateWeeklyPlanByAdmin(project.id, swp.id, wp.id, {
    contractorId: editWpContractorId,

    constraint: editWpConstraint,
    quantityBreakdown: editWpBreakdown,
estimatedQuantity: qty,
remainingQuantity: totalRemainingQty(editWpBreakdown),
floorUnits: getFloorsFromBreakdown(editWpBreakdown),
units: getUnitsFromBreakdown(editWpBreakdown),
unit: getUnitsFromBreakdown(editWpBreakdown)[0],
  });

  setShowEditWeekly(null);
  setEditWpQty('');
  setEditWpConstraint('');
  setEditWpFloor([]);
  setEditWpUnits([]);
  setEditWpContractorId('');
};

const openEditDailyDialog = (swpId: string, wpId: string, dp: DailyPlan) => {
  setShowEditDaily({ swpId, wpId, dpId: dp.id });
  setEditDpDate(dp.date || '');
  setEditDpDay(String(dp.dayNumber || 1));
  setEditDpQty(String(dp.plannedQuantity || ''));
  setEditDpConstraint(dp.constraint || '');
  setEditDpFloor(Array.isArray(dp.floorUnits) ? dp.floorUnits : []);
  setEditDpNote(dp.engineerNote || '');
  setEditDpUnits(dp.units || (dp.unit ? [dp.unit] : []));
  setEditDpBreakdown(dp.quantityBreakdown || []);
};

const handleUpdateDaily = () => {
  if (!showEditDaily || !editDpDate || !editDpQty) return;

  const swp = project.sixWeekPlans.find(s => s.id === showEditDaily.swpId);
  const wp = swp?.weeklyPlans.find(w => w.id === showEditDaily.wpId);
  const dp = wp?.dailyPlans.find(d => d.id === showEditDaily.dpId);
  if (!swp || !wp || !dp) return;

const oldQty = dp.quantityBreakdown?.length ? totalQty(dp.quantityBreakdown) : Number(dp.plannedQuantity || 0);
const newQty = editDpBreakdown.length ? totalQty(editDpBreakdown) : Number(editDpQty || 0);
  if (newQty <= 0) {
    alert('Quantity must be greater than 0');
    return;
  }

  const availableQty = (wp.remainingQuantity ?? 0) + oldQty;
  if (newQty > availableQty) {
    alert(`Max allowed quantity is ${availableQty}`);
    return;
  }

  // restore old qty first, then apply new
  updateWeeklyPlanField(project.id, swp.id, wp.id, {
    remainingQuantity: availableQty - newQty,
  });

  updateDailyPlanByEngineer(project.id, swp.id, wp.id, dp.id, {
    date: editDpDate,
    dayNumber: Number(editDpDay),
    plannedQuantity: newQty,
    constraint: editDpConstraint,
    engineerNote: editDpNote,
    quantityBreakdown: editDpBreakdown,
  completedQuantity: totalCompletedQty(supervisorBreakdown),
  remainingQuantity: totalRemainingQty(supervisorBreakdown),
floorUnits: getFloorsFromBreakdown(editDpBreakdown),
units: getUnitsFromBreakdown(editDpBreakdown),
unit: getUnitsFromBreakdown(editDpBreakdown)[0],
  });

  setShowEditDaily(null);
  setEditDpDate('');
  setEditDpDay('1');
  setEditDpQty('');
  setEditDpConstraint('');
  setEditDpFloor([]);
  setEditDpNote('');
  setEditDpUnits([]);
};

const engineerTickets = tickets.filter(t => t.assignedTo === 'engineer');
const adminTickets = tickets;
  const planEndDate = useMemo(() => {
    if (!planStartDate) return null;
    const sixWeeksOut = addDays(planStartDate, 41);
    return sixWeeksOut.getDay() === 0 ? sixWeeksOut : nextSunday(sixWeeksOut);
  }, [planStartDate]);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found. <Button variant="link" onClick={() => navigate('/')}>Go back</Button></div>;

  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.name || id;

  const allDailyPlans = project.sixWeekPlans.flatMap(swp =>
    swp.weeklyPlans.flatMap(wp =>
      wp.dailyPlans.map(dp => ({
        ...dp,
        weeklyPlanId: wp.id,
        sixWeekPlanId: swp.id,
        taskId: wp.taskId,
        tradeActivity: wp.tradeActivity,
        weekUnit: wp.unit,
        weekEstQty: wp.estimatedQuantity,
        planName: swp.name,
      }))
    )
  );

  // Activity CRUD helpers
  const updateActivity = (idx: number, field: keyof PlanActivity, value: string | number) => {
    setPlanActivities(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const removeActivity = (idx: number) => {
    setPlanActivities(prev => prev.filter((_, i) => i !== idx));
    if (editingActivityIdx === idx) setEditingActivityIdx(null);
    else if (editingActivityIdx !== null && editingActivityIdx > idx) setEditingActivityIdx(editingActivityIdx - 1);
  };

  const addActivity = () => {
    const newAct = emptyActivity();
    setPlanActivities(prev => [...prev, newAct]);
    setEditingActivityIdx(planActivities.length);
  };

  const handleCreatePlan = () => {
    if (!planName || !planStartDate || !planEndDate || planActivities.length === 0) return;
    
      const validActivities = planActivities
  .filter(a => a.category && a.contractorId && a.tradeActivity)
.map(a => {
  const normalized = normalizeBreakdown(a);
  return {
    ...normalized,
    remainingQuantity: normalized.quantityBreakdown?.length
      ? totalQty(normalized.quantityBreakdown)
      : normalized.estimatedQuantity
  };
});
      console.log(validActivities)
    if (validActivities.length === 0) return;
const plan: SixWeekPlan = {
  id: crypto.randomUUID(),
  projectId: project.id,
  name: planName,
  buildingName: buildingName,
  baseDurationWeeks: 6,
  extendedWeeks: 0,
  totalDurationWeeks: 6,
  planType: planDialogMode,
  activities: validActivities,
  startDate: format(planStartDate, 'yyyy-MM-dd'),
  endDate: format(planEndDate, 'yyyy-MM-dd'),
  createdAt: new Date().toISOString(),
  weeklyPlans: [],
};
    addSixWeekPlan(project.id, plan);
    setShowCreatePlan(false);
    setPlanName(''); setPlanStartDate(undefined); setPlanActivities([emptyActivity()]); setEditingActivityIdx(0);
  };

  const getPlanAssignedActivityStats = (swp: SixWeekPlan) => {
  const assignedTaskIds = new Set(
    swp.weeklyPlans
      .filter(wp => wp.assignedToEngineer)
      .map(wp => wp.taskId)
  );

  const totalActivities = swp.activities.length;
  const assignedActivities = swp.activities.filter(a => assignedTaskIds.has(a.id)).length;
  const unassignedActivities = totalActivities - assignedActivities;

  return {
    assignedActivities,
    unassignedActivities,
    totalActivities,
  };
};

const getWeekCycleLabel = (wp: WeeklyPlan, swp: SixWeekPlan) => {
  const totalWeeks = swp.totalDurationWeeks || 6;
  return `Week ${wp.weekNumber} of ${totalWeeks}`;
};

const getSubWeekActivityStats = (wp: WeeklyPlan, swp: SixWeekPlan) => {
  const totalActivitiesCreatedInPlan = swp.activities.length;

  const assignedActivitiesInThisSubWeek = swp.weeklyPlans.filter(
    item => item.weekNumber === wp.weekNumber && item.assignedToEngineer
  ).length;

  const totalActivitiesCreatedInThisSubWeek = swp.weeklyPlans.filter(
    item => item.weekNumber === wp.weekNumber
  ).length;

  return {
    assignedActivitiesInThisSubWeek,
    totalActivitiesCreatedInThisSubWeek,
    totalActivitiesCreatedInPlan,
  };
};


  const supervisorPlans = project.sixWeekPlans
  .map(swp => ({
    ...swp,
    weeklyPlans: swp.weeklyPlans
      .map(wp => ({
        ...wp,
        dailyPlans: wp.dailyPlans.filter(
          dp => dp.status === 'forwarded' || dp.status === 'logged'
        ),
      }))
      .filter(wp => wp.dailyPlans.length > 0),
  }))
  .filter(swp => swp.weeklyPlans.length > 0);



const handleCreateWeekly = (sixWeekPlanId: string) => {
  const swp = project.sixWeekPlans.find(s => s.id === sixWeekPlanId);
  if (!swp || !wpActivityId) return;

  const activity = swp.activities.find(a => a.id === wpActivityId);
  if (!activity) return;
const weekNumber = Number(wpWeek);
const weekRange = getSubWeekDateRange(swp.startDate, weekNumber);
const weeklyRows = wpBreakdown;
const qtyToAssign = totalQty(weeklyRows);


  // Use persisted remainingQuantity, fallback to estimatedQuantity for old data
  const currentRemaining = activity.remainingQuantity ?? totalQty(activity.quantityBreakdown || []);

if (qtyToAssign <= 0) {
  alert('Quantity must be greater than 0');
  return;
}

if (qtyToAssign > currentRemaining) {
  alert(`Max allowed quantity is ${currentRemaining}. Remaining: ${currentRemaining}`);
  return;
}

  const existingCount = swp.weeklyPlans.length;

const wp: WeeklyPlan = {
  id: crypto.randomUUID(),
  sixWeekPlanId,
  weekNumber: weekNumber,
weekStartDate: weekRange.weekStartDate,
weekEndDate: weekRange.weekEndDate,
  taskId: wpActivityId,
  category: activity.category,
  contractorId: activity.contractorId,
  tradeActivity: activity.tradeActivity,

  quantityBreakdown: weeklyRows,

  units: getUnitsFromBreakdown(weeklyRows),
  unit: getUnitsFromBreakdown(weeklyRows)[0],
  estimatedQuantity: totalQty(weeklyRows),
  remainingQuantity: totalQty(weeklyRows),
  floorUnits: getFloorsFromBreakdown(weeklyRows),

  constraint: wpConstraint,
  status: 'pending',
  assignedToEngineer: false,
  dailyPlans: [],
  constraintDate: wpConstraintDate || undefined,
  responsiblePerson: wpResponsiblePerson || undefined,
};

  addWeeklyPlan(project.id, sixWeekPlanId, wp);

  // ✅ Persist the new remaining quantity back to the activity
updateActivity2(project.id, sixWeekPlanId, wpActivityId, {
    remainingQuantity: currentRemaining - qtyToAssign,
  });

 setShowCreateWeekly(null);
setWpActivityId('');
setWpUnits([]);
setWpEstQty('');
setWpFloor([]);
setWpConstraint('');
setWpWeek('1');
setWpConstraintDate('');
setWpResponsiblePerson('');
setWpBreakdown([]);
};
  
const handleCreateDaily = () => {
  console.log(showCreateDaily,dpDate,dpQty)
  if (!showCreateDaily || !dpDate ) return;

  const swp = project.sixWeekPlans.find(s => s.id === showCreateDaily.swpId);
  const wp = swp?.weeklyPlans.find(w => w.id === showCreateDaily.wpId);
  if (!wp) return;

const dailyRows = dpBreakdown;
const qtyToAssign = totalQty(dailyRows);

  // ✅ First-time fallback: if remainingQuantity not yet set, use estimatedQuantity
  const currentRemaining = wp.remainingQuantity ?? wp.estimatedQuantity;

  if (qtyToAssign <= 0) {
    alert('Quantity must be greater than 0');
    return;
  }

  if (qtyToAssign > currentRemaining) {
    alert(`Max allowed quantity is ${currentRemaining}`);
    return;
  }

const daily: DailyPlan = {
  id: crypto.randomUUID(),
  weeklyPlanId: showCreateDaily.wpId,
  dayNumber: Number(dpDay),
  date: dpDate,

  quantityBreakdown: dailyRows,

  plannedQuantity: totalQty(dailyRows),
  units: getUnitsFromBreakdown(dailyRows),
  unit: getUnitsFromBreakdown(dailyRows)[0],
  floorUnits: getFloorsFromBreakdown(dailyRows),

  constraint: dpConstraint,
  engineerNote: dpNote,
  status: 'pending',
  remainingQuantity: currentRemaining - qtyToAssign,
  constraintDate: dpConstraintDate || undefined,
  responsiblePerson: dpResponsiblePerson || undefined,
};

  addDailyPlan(project.id, showCreateDaily.swpId, showCreateDaily.wpId, daily);

  // ✅ Persist updated remaining quantity back to the weekly plan
  updateWeeklyPlanField(project.id, showCreateDaily.swpId, showCreateDaily.wpId, {
    remainingQuantity: currentRemaining - qtyToAssign,
  });

  // reset form
setDpDate('');
setDpQty('');
setDpConstraint('');
setDpFloor([]);
setDpNote('');
setDpDay('1');
setDpUnits([]);
setDpConstraintDate('');
setDpResponsiblePerson('');
  setShowCreateDaily(null);
  setDpBreakdown([]);
};

  // Get the current six-week plan for the sub-week dialog
  const currentSwpForWeekly = showCreateWeekly ? project.sixWeekPlans.find(s => s.id === showCreateWeekly) : null;
  const selectedActivity = currentSwpForWeekly?.activities.find(a => a.id === wpActivityId);
  console.log(selectedActivity, project.sixWeekPlans)
  const assignedWeeklyPlans = project.sixWeekPlans.flatMap(swp =>
    swp.weeklyPlans
      .filter(wp => wp.assignedToEngineer)
      .map(wp => ({
        ...wp,
        swpId: swp.id,
        planName: swp.name
      }))
  );




  const selectedWp = assignedWeeklyPlans.find(
    (wp) =>
      wp.id === showCreateDaily?.wpId &&
      wp.swpId === showCreateDaily?.swpId
  );
  console.log(selectedWp)
  const allowedFloors: string[] = Array.isArray(selectedWp?.floorUnits)
    ? selectedWp.floorUnits
    : [];


  const maxAllowedQty = selectedWp
  ? (selectedWp.remainingQuantity ?? selectedWp.estimatedQuantity)
  : 0;


  const handleLogClick = (projectId, sixWeekPlanId, weeklyPlanId, dailyPlanId) => {
  logDailyTarget(
    projectId,
    sixWeekPlanId,
    weeklyPlanId,
    dailyPlanId,
    Number(logQty),
    true,
    rovComment
  );

  setLogQty('');
  setRovComment('');
};

const assignedQty =
  currentSwpForWeekly?.weeklyPlans
    ?.filter(wp => wp.taskId === selectedActivity?.id)
    ?.reduce((sum, wp) => sum + Number(wp.estimatedQuantity || 0), 0) || 0;

const remainingQty = (selectedActivity?.estimatedQuantity || 0) - assignedQty;
console.log(selectedActivity)



const sixWeekPlansOnly = project.sixWeekPlans.filter(
  swp => !swp.planType || swp.planType === 'six-week'
);

const newPlansOnly = project.sixWeekPlans.filter(
  swp => swp.planType === 'new-plan'
);
const getDailyShortfallBreakdown = (dp: DailyPlan, wp: WeeklyPlan) => {
  const planned = Number(dp.plannedQuantity || 0);
  const completed = Number(dp.completedQuantity || 0);
  const shortfall = Math.max(0, planned - completed);

  if (shortfall <= 0) return [];

  const floors = dp.floorUnits?.length ? dp.floorUnits : wp.floorUnits;
  const units = dp.units?.length ? dp.units : wp.units?.length ? wp.units : wp.unit ? [wp.unit] : [];

  const combinations = floors.flatMap(floor =>
    units.map(unit => ({ floor, unit }))
  );

  if (combinations.length === 0) return [];

  const splitQty = shortfall / combinations.length;

  return combinations.map(x => ({
    floorUnit: x.floor,
    unit: x.unit,
    shortfallQuantity: splitQty,
  }));
};
const canCloseWeek = (wp: WeeklyPlan) => {
  return (
    wp.dailyPlans.length > 0 &&
    wp.dailyPlans.every(dp =>
      dp.status === 'confirmed' ||
      dp.status === 'submitted' ||
      dp.status === 'logged'
    )
  );
};

const getBacklogsForProject = () =>
  backlogs.filter(b => b.projectId === project.id);

const getOpenBacklogsForProject = () =>
  backlogs.filter(b => b.projectId === project.id && b.status === 'open');

const getBacklogsForWeek = (weeklyPlanId: string) =>
  backlogs.filter(b => b.sourceWeeklyPlanId === weeklyPlanId);

const hasOpenBacklogForWeek = (weeklyPlanId: string) =>
  backlogs.some(b => b.sourceWeeklyPlanId === weeklyPlanId && b.status === 'open');
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
           <ArrowLeft className="w-4 h-4" /> {t('back')}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
      
        {role === 'admin' && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate(`/projects/${projectId}/reports`)}>
            <BarChart3 className="w-4 h-4" /> {t('reports')}
          </Button>
        )}
          <Select value={i18n.language} onValueChange={(lng) => i18n.changeLanguage(lng)}>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Language" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="en">English</SelectItem>
    <SelectItem value="hi">हिन्दी</SelectItem>
    <SelectItem value="mr">मराठी</SelectItem>
  </SelectContent>
</Select>
      </div>

      {/* =================== ADMIN VIEW =================== */}
      {role === 'admin' && (
        <div className="space-y-4">
 <Tabs value={planTab} onValueChange={(v) => setPlanTab(v as 'six-week' | 'new-plan')} className="space-y-4">
  <div className="flex items-center justify-between">
    <TabsList>
      <TabsTrigger value="six-week">{t('sixWeekPlan')}</TabsTrigger>
      <TabsTrigger value="new-plan">{t('newPlan')}</TabsTrigger>
    </TabsList>

    <Button
      onClick={() => {
        setPlanDialogMode(planTab);
        setShowCreatePlan(true);
      }}
    >
      <Plus className="w-4 h-4" />
      {planTab === 'six-week' ? ' 6 Week Plan' : ' New Plan'}
    </Button>
  </div>

  <TabsContent value="six-week" className="space-y-4">
         {sixWeekPlansOnly.length === 0 ? (
    <p className="text-sm text-muted-foreground">No 6 week plans yet.</p>
  ) : (
    sixWeekPlansOnly.map(swp => (
      <Card key={swp.id}>
              <CardHeader className="cursor-pointer pb-2" onClick={() => setExpandedPlan(expandedPlan === swp.id ? null : swp.id)}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {expandedPlan === swp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {swp.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">{swp.startDate} → {swp.endDate}</span>
                </CardTitle>
               {(() => {
  const { assignedActivities, unassignedActivities, totalActivities } = getPlanAssignedActivityStats(swp);

  return (
    <p className="text-sm text-muted-foreground">
      {totalActivities} activit{totalActivities === 1 ? 'y' : 'ies'} ·
      {' '}Assigned: {assignedActivities} ·
      {' '}Unassigned: {unassignedActivities} ·
      {' '}Total Weeks: {swp.totalDurationWeeks || 6}
    </p>
  );
})()}
              </CardHeader>
              {expandedPlan === swp.id && (
                <CardContent className="space-y-3">
                  {/* Activities Table with CRUD */}
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Id</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">Contractor</TableHead>
                          <TableHead className="text-xs">Trade</TableHead>
                          <TableHead className="text-xs">Trade Activity</TableHead>
                          <TableHead className="text-xs min-w-[320px]">Floor / Qty / Unit</TableHead>
<TableHead className="text-xs text-right">Total</TableHead>
<TableHead className="text-xs text-right">Remaining</TableHead>
                          <TableHead className="text-xs w-20">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {swp.activities.map((act, idx) => (
                          <TableRow key={act.id} className={editingId === act.id ? 'bg-primary/5' : ''}>
                            <TableCell className="text-xs font-mono">{act.id}</TableCell>
                            <TableCell className="text-xs">{act.category}</TableCell>
                            <TableCell className="text-xs">{getContractorName(act.contractorId)}</TableCell>
                            <TableCell className="text-xs">{act.trade}</TableCell>
                            <TableCell className="text-xs">{act.tradeActivity}</TableCell>
                           <TableCell className="align-top">
  <QtyBreakdownView rows={act.quantityBreakdown} />
</TableCell>
<TableCell className="align-top">
  <UnitWiseTotalView rows={act.quantityBreakdown} />
</TableCell>

<TableCell className="align-top">
  <UnitWiseTotalView rows={act.quantityBreakdown} />
</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(act.id); setEditData({ ...act }); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                {swp.activities.length > 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                                    const updated = swp.activities.filter(a => a.id !== act.id);
                                    updateSixWeekPlanActivities(project.id, swp.id, updated);
                                  }}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Inline edit form for existing activity */}
                  {editingId && editData && swp.activities.some(a => a.id === editingId) && (
                    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground">Editing Activity</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select value={editData.category} onValueChange={v => setEditData({ ...editData, category: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Contractor</Label>
                          <Select value={editData.contractorId} onValueChange={v => setEditData({ ...editData, contractorId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Trade</Label>
                        <Select value={editData.trade} onValueChange={v => setEditData({ ...editData, trade: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Trade Activity</Label>
                        <Input
                      className="mt-1"
                      placeholder="Enter Trade Activity"
                      value={editData.tradeActivity || ""}
                      onChange={(e) => setEditData({...editData, tradeActivity : e.target.value})}
                    />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                      <div>
  <Label className="text-xs">Floor / Unit / Quantity Breakdown</Label>
  <QuantityBreakdownEditor
    value={editData.quantityBreakdown || []}
    onChange={(rows) => {
      const normalized = normalizeBreakdown({
        ...editData,
        quantityBreakdown: rows,
      });
      setEditData(normalized);
    }}
  />
</div>

                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }}>{t('cancel')}</Button>
                        <Button size="sm" onClick={() => {
                          const updated = swp.activities.map(a => a.id === editingId ? editData : a);
                          updateSixWeekPlanActivities(project.id, swp.id, updated);
                          setEditingId(null); setEditData(null);
                        }}>Save</Button>
                      </div>
                    </div>
                  )}

                 <div className="flex flex-wrap justify-between gap-2">
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const newAct = emptyActivity();
        updateSixWeekPlanActivities(project.id, swp.id, [...swp.activities, newAct]);
        setEditingId(newAct.id);
        setEditData({ ...newAct });
      }}
    >
      <Plus className="w-3 h-3" /> {t('addActivity')}
    </Button>

    <Button size="sm" onClick={() => setShowCreateWeekly(swp.id)}>
      <Plus className="w-4 h-4" /> {t('subWeekPlan')}
    </Button>
  </div>

</div>
                  {swp.weeklyPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sub-week plans yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {swp.weeklyPlans.map(wp => (
                        <div key={wp.id} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedWeekly(expandedWeekly === wp.id ? null : wp.id)}>
                            <div className="flex items-center gap-3">
                              {expandedWeekly === wp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className="font-mono text-xs text-muted-foreground">{wp.taskId}</span>
                          <span className="text-sm font-medium flex items-center gap-2">
  {getWeekCycleLabel(wp, swp)} · {wp.tradeActivity}
  <span className="text-xs text-muted-foreground">
  {wp.weekStartDate && wp.weekEndDate
    ? `${format(new Date(wp.weekStartDate), 'dd-MM-yyyy')} → ${format(new Date(wp.weekEndDate), 'dd-MM-yyyy')}`
    : ''}
</span>
</span>
                             {(() => {
  const {
    assignedActivitiesInThisSubWeek,
    totalActivitiesCreatedInThisSubWeek,
  } = getSubWeekActivityStats(wp, swp);

  return (
    <span className="text-xs text-muted-foreground">
     <UnitWiseTotalView rows={wp.quantityBreakdown} /> {(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'} ·
      {' '}Activities Assigned: {assignedActivitiesInThisSubWeek}/{totalActivitiesCreatedInThisSubWeek} ·
      {' '}Floor: {Array.isArray(wp.floorUnits) ? wp.floorUnits.join(', ') : wp.floorUnits}
    </span>
  );
})()}
                            </div>
<div className="flex items-center gap-2">
  <StatusBadge status={wp.status} />
{canCloseWeek(wp) && (
  <Button
    size="sm"
    variant="secondary"
    onClick={(e) => {
      e.stopPropagation();

      const ok = window.confirm(
        `Close Week ${wp.weekNumber} and generate backlog?`
      );

      if (!ok) return;

      generateWeeklyBacklog(project.id, swp.id, wp.id);
    }}
  >
    Close Week
  </Button>
)}

{hasOpenBacklogForWeek(wp.id) && (
  <Button
    size="sm"
    variant="default"
    onClick={(e) => {
      e.stopPropagation();

      applyBacklogToNextWeek(
        project.id,
        swp.id,
        wp.id,
        wp.weekNumber + 1
      );
    }}
  >
    Carry Forward to Week {wp.weekNumber + 1}
  </Button>
)}

  {/* General admin edit for any sub-week */}
  <Button
    size="sm"
    variant="outline"
    onClick={e => {
      e.stopPropagation();
      openEditWeeklyDialog(swp.id, wp);
    }}
  >
    <Pencil className="w-3 h-3" /> {t('edit')}
  </Button>

  {/* General admin delete for any sub-week */}
  <Button
    size="sm"
    variant="outline"
    className="text-destructive"
    onClick={e => {
      e.stopPropagation();
      const ok = window.confirm('Delete this sub-week plan?');
      if (!ok) return;
      deleteWeeklyPlanByAdmin(project.id, swp.id, wp.id);
    }}
  >
    <Trash2 className="w-3 h-3" /> {t('delete')}
  </Button>

  {!wp.assignedToEngineer && (
    <Button
      size="sm"
      variant="outline"
      onClick={e => {
        e.stopPropagation();
        assignToEngineer(project.id, swp.id, wp.id);
      }}
    >
      <Send className="w-3 h-3" /> {t('assign')}
    </Button>
  )}
</div>
                          </div>
                          {expandedWeekly === wp.id && wp.dailyPlans.length > 0 && (
                            <div className="px-3 pb-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">{t('day')}</TableHead>
                                    <TableHead className="text-xs">{t('date')}</TableHead>
                                    <TableHead className="text-xs min-w-[340px]">Floor / Planned / Actual / Remaining / Unit</TableHead>
                                    <TableHead className="text-xs">{t('constraint')}</TableHead>
                                    <TableHead className="text-xs">{t('status')}</TableHead>
                                    <TableHead className="text-xs">{t('actions')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {wp.dailyPlans.map(dp => (
                                    <TableRow key={dp.id}>
                                      <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                                      <TableCell className="text-xs">{dp.date}</TableCell>
                                     <TableCell className="align-top">
  <ActualBreakdownView rows={dp.quantityBreakdown} />
</TableCell>
                                     <TableCell className="text-xs">
  <div>{dp.constraintLog || dp.constraint || '—'}</div>
  {(dp.constraintDate || dp.responsiblePerson) && (
    <div className="text-[11px] text-muted-foreground mt-1">
      {dp.constraintDate && <div>{t('date')}: {dp.constraintDate}</div>}
      {dp.responsiblePerson && <div>Person: {dp.responsiblePerson}</div>}
    </div>
  )}
</TableCell>
                                      <TableCell><StatusBadge status={dp.status} /></TableCell>
                                      <TableCell>
                                        {dp.status === 'submitted' && (
                                          <Button size="sm" variant="default" onClick={() => confirmDailyTarget(project.id, swp.id, wp.id, dp.id)}>
                                            <Check className="w-3 h-3" /> Confirm
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        
)}
  </TabsContent>
<TabsContent value="new-plan" className="space-y-4">
{newPlansOnly.length === 0 ? (
    <p className="text-sm text-muted-foreground">No new plans yet.</p>
  ) : (
    newPlansOnly.map(swp => (
      <Card key={swp.id}>
              <CardHeader className="cursor-pointer pb-2" onClick={() => setExpandedPlan(expandedPlan === swp.id ? null : swp.id)}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {expandedPlan === swp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {swp.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">{swp.startDate} → {swp.endDate}</span>
                </CardTitle>
               <p className="text-sm text-muted-foreground">
  {swp.activities.length} activit{swp.activities.length === 1 ? 'y' : 'ies'} ·
  {' '}Total Weeks: {swp.totalDurationWeeks || 6}
  
</p>
              </CardHeader>
              {expandedPlan === swp.id && (
                <CardContent className="space-y-3">
                  {/* Activities Table with CRUD */}
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Id</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">Contractor</TableHead>
                          <TableHead className="text-xs">Trade</TableHead>
                          <TableHead className="text-xs">Trade Activity</TableHead>
                         <TableHead className="text-xs min-w-[320px]">Floor / Qty / Unit</TableHead>
<TableHead className="text-xs text-right">Total</TableHead>
<TableHead className="text-xs text-right">Remaining</TableHead>
                          <TableHead className="text-xs w-20">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {swp.activities.map((act, idx) => (
                          <TableRow key={act.id} className={editingId === act.id ? 'bg-primary/5' : ''}>
                            <TableCell className="text-xs font-mono">{act.id}</TableCell>
                            <TableCell className="text-xs">{act.category}</TableCell>
                            <TableCell className="text-xs">{getContractorName(act.contractorId)}</TableCell>
                            <TableCell className="text-xs">{act.trade}</TableCell>
                            <TableCell className="text-xs">{act.tradeActivity}</TableCell>
                           <TableCell className="align-top">
  <QtyBreakdownView rows={act.quantityBreakdown} />
</TableCell>
<TableCell className="text-xs text-right font-semibold">
  {act.estimatedQuantity}
</TableCell>
<TableCell className="text-xs text-right font-semibold">
  {act.remainingQuantity}
</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(act.id); setEditData({ ...act }); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                {swp.activities.length > 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                                    const updated = swp.activities.filter(a => a.id !== act.id);
                                    updateSixWeekPlanActivities(project.id, swp.id, updated);
                                  }}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Inline edit form for existing activity */}
                  {editingId && editData && swp.activities.some(a => a.id === editingId) && (
                    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground">Editing Activity</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select value={editData.category} onValueChange={v => setEditData({ ...editData, category: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Contractor</Label>
                          <Select value={editData.contractorId} onValueChange={v => setEditData({ ...editData, contractorId: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Trade</Label>
                        <Select value={editData.trade} onValueChange={v => setEditData({ ...editData, trade: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Trade Activity</Label>
                        <Input
                      className="mt-1"
                      placeholder="Enter Trade Activity"
                      value={editData.tradeActivity || ""}
                      onChange={(e) => setEditData({...editData, tradeActivity : e.target.value})}
                    />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Unit</Label>
                       <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="w-full mt-1 justify-between">
      {editData.units?.length ? editData.units.join(", ") : "Select Units"}
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
    {UNITS.map((u) => {
      const selected = editData.units || [];
      const checked = selected.includes(u);

      return (
        <div key={u} className="flex items-center gap-2 px-2 py-1">
          <Checkbox
            checked={checked}
            onCheckedChange={(isChecked) => {
              const updated = isChecked
                ? [...selected, u]
                : selected.filter(item => item !== u);

              setEditData({
                ...editData,
                units: updated,
              });
            }}
          />
          <span className="text-sm">{u}</span>
        </div>
      );
    })}
  </DropdownMenuContent>
</DropdownMenu>
                        </div>
                        <div>
                          <Label className="text-xs">Est. Quantity</Label>
                          <Input type='number'   step="any"  className="mt-1" value={editData.estimatedQuantity} onChange={e => setEditData({ ...editData, estimatedQuantity: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label className="text-xs">Floor Units</Label>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full mt-1 justify-between">
                                {editData.floorUnits?.length
                                  ? editData.floorUnits.join(", ")
                                  : "Select Floor Units"}
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                              {FLOOR_UNITS.map((f) => {
                                const selected = editData.floorUnits || [];
                                const checked = selected.includes(f);

                                return (
                                  <div key={f} className="flex items-center gap-2 px-2 py-1">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(isChecked) => {
                                        let updated;

                                        if (isChecked) {
                                          updated = [...selected, f];
                                        } else {
                                          updated = selected.filter((item) => item !== f);
                                        }

                                        setEditData({
                                          ...editData,
                                          floorUnits: updated,
                                        });
                                      }}
                                    />
                                    <span className="text-sm">{f}</span>
                                  </div>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }}>{t('cancel')}</Button>
                        <Button size="sm" onClick={() => {
                          const updated = swp.activities.map(a => a.id === editingId ? editData : a);
                          updateSixWeekPlanActivities(project.id, swp.id, updated);
                          setEditingId(null); setEditData(null);
                        }}>Save</Button>
                      </div>
                    </div>
                  )}

                 <div className="flex flex-wrap justify-between gap-2">
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const newAct = emptyActivity();
        updateSixWeekPlanActivities(project.id, swp.id, [...swp.activities, newAct]);
        setEditingId(newAct.id);
        setEditData({ ...newAct });
      }}
    >
      <Plus className="w-3 h-3" /> Add Activity
    </Button>

    <Button size="sm" onClick={() => setShowCreateWeekly(swp.id)}>
      <Plus className="w-4 h-4" /> Sub-Week Plan
    </Button>
  </div>

 
</div>
                  {swp.weeklyPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sub-week plans yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {swp.weeklyPlans.map(wp => (
                        <div key={wp.id} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedWeekly(expandedWeekly === wp.id ? null : wp.id)}>
                            <div className="flex items-center gap-3">
                              {expandedWeekly === wp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className="font-mono text-xs text-muted-foreground">{wp.taskId}</span>
                            <span className="text-sm font-medium flex items-center gap-2">
  W{wp.weekNumber} · {wp.tradeActivity}
</span>
                              <span className="text-xs text-muted-foreground"><UnitWiseTotalView rows={wp.quantityBreakdown} />{(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'} · {wp.floorUnits}</span>
                            </div>
<div className="flex items-center gap-2">
  <StatusBadge status={wp.status} />
  {canCloseWeek(wp) && (
  <Button
    size="sm"
    variant="secondary"
    onClick={(e) => {
      e.stopPropagation();

      const ok = window.confirm(
        `Close Week ${wp.weekNumber} and generate backlog?`
      );

      if (!ok) return;

      generateWeeklyBacklog(project.id, swp.id, wp.id);
    }}
  >
    Close Week
  </Button>
)}

{hasOpenBacklogForWeek(wp.id) && (
  <Button
    size="sm"
    variant="default"
    onClick={(e) => {
      e.stopPropagation();

      applyBacklogToNextWeek(
        project.id,
        swp.id,
        wp.id,
        wp.weekNumber + 1
      );
    }}
  >
    Carry Forward to Week {wp.weekNumber + 1}
  </Button>
)}

  {/* General admin edit for any sub-week */}
  <Button
    size="sm"
    variant="outline"
    onClick={e => {
      e.stopPropagation();
      openEditWeeklyDialog(swp.id, wp);
    }}
  >
    <Pencil className="w-3 h-3" /> {t('edit')}
  </Button>

  {/* General admin delete for any sub-week */}
  <Button
    size="sm"
    variant="outline"
    className="text-destructive"
    onClick={e => {
      e.stopPropagation();
      const ok = window.confirm('Delete this sub-week plan?');
      if (!ok) return;
      deleteWeeklyPlanByAdmin(project.id, swp.id, wp.id);
    }}
  >
    <Trash2 className="w-3 h-3" /> {t('delete')}
  </Button>

  {!wp.assignedToEngineer && (
    <Button
      size="sm"
      variant="outline"
      onClick={e => {
        e.stopPropagation();
        assignToEngineer(project.id, swp.id, wp.id);
      }}
    >
      <Send className="w-3 h-3" /> {t('assign')}
    </Button>
  )}
</div>
                          </div>
                          {expandedWeekly === wp.id && wp.dailyPlans.length > 0 && (
                            <div className="px-3 pb-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">{t('day')}</TableHead>
                                    <TableHead className="text-xs">{t('date')}</TableHead>
                                    <TableHead className="text-xs">Planned</TableHead>
                                    <TableHead className="text-xs">Actual</TableHead>
                                    <TableHead className="text-xs">Floor</TableHead>
                                    <TableHead className="text-xs">{t('constraint')}</TableHead>
                                    <TableHead className="text-xs">{t('status')}</TableHead>
                                    <TableHead className="text-xs">{t('actions')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {wp.dailyPlans.map(dp => (
                                    <TableRow key={dp.id}>
                                      <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                                      <TableCell className="text-xs">{dp.date}</TableCell>
                                      <TableCell className="text-xs">{dp.plannedQuantity} {(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}</TableCell>
                                      <TableCell className="text-xs font-medium">{dp.completedQuantity !== undefined ? `${dp.completedQuantity} ${(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}` : '—'}</TableCell>
                                      <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                      <TableCell className="text-xs">
  <div>{dp.constraintLog || dp.constraint || '—'}</div>
  {(dp.constraintDate || dp.responsiblePerson) && (
    <div className="text-[11px] text-muted-foreground mt-1">
      {dp.constraintDate && <div>{t('date')}: {dp.constraintDate}</div>}
      {dp.responsiblePerson && <div>Person: {dp.responsiblePerson}</div>}
    </div>
  )}
</TableCell>
                                      <TableCell><StatusBadge status={dp.status} /></TableCell>
                                      <TableCell>
                                        {dp.status === 'submitted' && (
                                          <Button size="sm" variant="default" onClick={() => confirmDailyTarget(project.id, swp.id, wp.id, dp.id)}>
                                            <Check className="w-3 h-3" /> Confirm
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
    ))
  )}
 </TabsContent>
 </Tabs>

 <Card className="mt-6">
  <CardHeader>
    <CardTitle className="text-base flex items-center justify-between">
      <span>Weekly Backlog</span>
      <span className="text-xs text-muted-foreground font-normal">
        Open: {getOpenBacklogsForProject().length}
      </span>
    </CardTitle>
  </CardHeader>

  <CardContent>
    {getBacklogsForProject().length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No weekly backlog generated yet.
      </p>
    ) : (
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Source Week</TableHead>
              <TableHead className="text-xs">Target Week</TableHead>
              <TableHead className="text-xs">Trade Activity</TableHead>
              <TableHead className="text-xs">Floor</TableHead>
              <TableHead className="text-xs">Unit</TableHead>
              <TableHead className="text-xs">Planned</TableHead>
              <TableHead className="text-xs">Actual</TableHead>
              <TableHead className="text-xs">Shortfall</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {getBacklogsForProject().map(b => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">
                  Week {b.sourceWeekNumber}
                </TableCell>

                <TableCell className="text-xs">
                  {b.targetWeekNumber ? `Week ${b.targetWeekNumber}` : '—'}
                </TableCell>

                <TableCell className="text-xs">
                  {b.tradeActivity}
                </TableCell>

                <TableCell className="text-xs">
                  {b.floorUnit || '—'}
                </TableCell>

                <TableCell className="text-xs">
                  {b.unit || '—'}
                </TableCell>

                <TableCell className="text-xs">
                  {b.plannedQuantity}
                </TableCell>

                <TableCell className="text-xs">
                  {b.completedQuantity}
                </TableCell>

                <TableCell className="text-xs font-semibold text-destructive">
                  {b.shortfallQuantity}
                </TableCell>

                <TableCell className="text-xs">
                  {b.status === 'open' && (
                    <span className="text-amber-600 font-medium">Open</span>
                  )}

                  {b.status === 'carried_forward' && (
                    <span className="text-green-600 font-medium">
                      Carried Forward
                    </span>
                  )}

                  {b.status === 'closed' && (
                    <span className="text-muted-foreground">Closed</span>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
</Card>
 
          {/* Admin Tickets Table */}
          {adminTickets.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Recovery Tickets ({adminTickets.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Ticket ID</TableHead>
                        <TableHead className="text-xs">Recovery ID</TableHead>
                        <TableHead className="text-xs">Contractor</TableHead>
                        <TableHead className="text-xs">Trade</TableHead>
                        <TableHead className="text-xs">Shortfall</TableHead>
                        <TableHead className="text-xs">{t('constraint')}</TableHead>
                        <TableHead className="text-xs">ROV</TableHead>
                        <TableHead className="text-xs">Contractor Notes</TableHead>
                        <TableHead className="text-xs">Deadline</TableHead>
                        <TableHead className="text-xs">{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminTickets.map(ticket => (
                        <TableRow key={ticket.id}>
                          <TableCell className="text-xs font-mono">{ticket.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs font-mono">{ticket.recoveryId}</TableCell>
                          <TableCell className="text-xs">{getContractorName(ticket.contractorName)}</TableCell>
                          <TableCell className="text-xs">{ticket.tradeName}</TableCell>
                          <TableCell className="text-xs text-destructive font-semibold">{ticket.shortfallQuantity} {(ticket.units?.length ? ticket.units.join(', ') : ticket.unit) || ''}</TableCell>
                          <TableCell className="text-xs">{ticket.constraint}</TableCell>
                          <TableCell className="text-xs">{ticket.rov}</TableCell>
                          <TableCell className="text-xs max-w-[200px]">{ticket.contractorStatement || '—'}</TableCell>
                          <TableCell className="text-xs">{ticket.recoveryDeadline || '—'}</TableCell>
                          <TableCell><StatusBadge status={ticket.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* =================== ENGINEER VIEW =================== */}
      {role === 'engineer' && (
        <div className="space-y-4">
        <div className="flex justify-between items-center">
  <h2 className="font-semibold text-lg flex items-center gap-2">
    <CalendarDays className="w-5 h-5 text-primary" />
    {t('engineerTaskView')}
  </h2>

  <Button size="sm" variant="outline" onClick={() => setShowTickets(true)}>
    View Tickets ({engineerTickets.length})
  </Button>
</div>
          {project.sixWeekPlans.flatMap(swp => swp.weeklyPlans.filter(wp => wp.assignedToEngineer).map(wp => ({ ...wp, swpId: swp.id, planName: swp.name }))).length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {project.sixWeekPlans.flatMap(swp =>
                swp.weeklyPlans.filter(wp => wp.assignedToEngineer).map(wp => ({ ...wp, swpId: swp.id, planName: swp.name }))
              ).map(wp => (
                <Card key={wp.id}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedWeekly(expandedWeekly === wp.id ? null : wp.id)}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {expandedWeekly === wp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-mono text-xs text-muted-foreground">{wp.taskId}</span>
                        W{wp.weekNumber} · {wp.tradeActivity} · {wp.floorUnits}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground"><UnitWiseTotalView rows={wp.quantityBreakdown} />{(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}</span>
                        <StatusBadge status={wp.status} />
                      </div>
                    </CardTitle>
                  <p className="text-xs text-muted-foreground">
  {wp.planName} · {getContractorName(wp.contractorId)} · {t('constraint')}: {wp.constraint || 'None'}
  {wp.constraintDate ? ` · Date: ${wp.constraintDate}` : ''}
  {wp.responsiblePerson ? ` · Person: ${wp.responsiblePerson}` : ''}
</p>
                  </CardHeader>
                  {expandedWeekly === wp.id && (
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{wp.dailyPlans.length} daily plan(s) · Total planned: {wp.dailyPlans.reduce((s, d) => s + d.plannedQuantity, 0)} / {wp.estimatedQuantity} {wp.unit}</p>
                        <Button size="sm" onClick={() => setShowCreateDaily({ swpId: wp.swpId, wpId: wp.id })}>
                          <Plus className="w-3 h-3" /> Add {t('dailyPlan')}
                        </Button>
                      </div>
                      {wp.dailyPlans.length > 0 && (
                        <div className="bg-card rounded-lg border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-primary/5">
                                <TableHead className="text-xs font-semibold">{t('day')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t('date')}</TableHead>
                                <TableHead className="text-xs font-semibold">Planned Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Actual Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Remaining Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Floor</TableHead>
                                <TableHead className="text-xs font-semibold">{t('constraint')}</TableHead>
                                <TableHead className="text-xs font-semibold">Eng Comments</TableHead>
                                <TableHead className="text-xs font-semibold">ROV Comments</TableHead>
                                <TableHead className="text-xs font-semibold">{t('status')}</TableHead>
                                <TableHead className="text-xs font-semibold">{t('actions')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {wp.dailyPlans.map(dp => (
                                <TableRow key={dp.id}>
                                  <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                                  <TableCell className="text-xs">{dp.date}</TableCell>
                                  <TableCell className="text-xs font-medium">{dp.plannedQuantity} {(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.completedQuantity !== undefined ? `${dp.completedQuantity} ${(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}` : '—'}</TableCell>
                                  <TableHead className="text-xs font-semibold">{dp.remainingQuantity}</TableHead>
                                  <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                  <TableCell className="text-xs">{dp.constraint || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.engineerNote || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.rov || '—'}</TableCell>
                                  <TableCell><StatusBadge status={dp.status} /></TableCell>
                                  <TableCell className="space-x-1">
                                    {dp.status === 'pending' && (
  <div className="flex items-center gap-1">
    <Button
      size="sm"
      variant="outline"
      onClick={() => openEditDailyDialog(wp.swpId, wp.id, dp)}
    >
      <Pencil className="w-3 h-3" /> {t('edit')}
    </Button>

    <Button
      size="sm"
      variant="outline"
      className="text-destructive"
      onClick={() => {
        const ok = window.confirm('Delete this daily task?');
        if (!ok) return;
        deleteDailyPlanByEngineer(project.id, wp.swpId, wp.id, dp.id);
      }}
    >
      <Trash2 className="w-3 h-3" /> {t('delete')}
    </Button>

    <Button
      size="sm"
      variant="outline"
      onClick={() => forwardDailyToSupervisor(project.id, wp.swpId, wp.id, dp.id)}
    >
      <Send className="w-3 h-3" /> Forward
    </Button>
  </div>
)}
                                    {dp.status === 'logged' && (
                                      <div className="flex items-center gap-1">
                                        <Select value={submitConstraint} onValueChange={setSubmitConstraint}>
                                          <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Constraint" /></SelectTrigger>
                                          <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Button size="sm" onClick={() => { submitDailyTarget(project.id, wp.swpId, wp.id, dp.id, submitConstraint); setSubmitConstraint(''); }}>
                                          Submit
                                        </Button>
                                      </div>
                                    )}
                                    {dp.status === 'submitted' && <span className="text-xs text-muted-foreground">Awaiting admin confirmation</span>}
                                    {dp.status === 'confirmed' && <span className="text-xs text-accent">✓ Confirmed</span>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================== SUPERVISOR VIEW =================== */}
{role === 'supervisor' && (
  <div className="space-y-4">
    <h2 className="font-semibold text-lg">{t('supervisorTaskView')}</h2>

    {supervisorPlans.length === 0 ? (
      <p className="text-muted-foreground text-sm">No daily tasks forwarded yet.</p>
    ) : (
      <div className="space-y-4">
        {supervisorPlans.map(swp => (
          <Card key={swp.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{swp.name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {swp.startDate} → {swp.endDate}
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {swp.buildingName} · Total Weeks: {swp.totalDurationWeeks || 6}
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {swp.weeklyPlans.map(wp => (
                <div key={wp.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedWeekly(expandedWeekly === wp.id ? null : wp.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedWeekly === wp.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}

                      <span className="font-mono text-xs text-muted-foreground">
                        {wp.taskId}
                      </span>

                      <span className="text-sm font-medium">
                        {t('week')} {wp.weekNumber} · {wp.tradeActivity}
                      </span>

                      <div className="text-xs text-muted-foreground">
                        <UnitWiseTotalView rows={wp.quantityBreakdown} />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Contractor: {getContractorName(wp.contractorId)}
                    </div>
                  </div>

                  {expandedWeekly === wp.id && (
                    <div className="px-3 pb-3">
                      <div className="mb-2 text-xs text-muted-foreground">
                        Constraint: {wp.constraint || 'None'}
                        {wp.constraintDate ? ` · Date: ${wp.constraintDate}` : ''}
                        {wp.responsiblePerson ? ` · Person: ${wp.responsiblePerson}` : ''}
                      </div>

                      <div className="bg-card rounded-lg border overflow-x-auto">
                        <Table className="min-w-[1100px]">
                          <TableHeader>
                            <TableRow className="bg-primary/5">
                              <TableHead className="font-semibold w-[100px]">
                                {t('day')}
                              </TableHead>
                              <TableHead className="font-semibold w-[120px]">
                                {t('date')}
                              </TableHead>
                              <TableHead className="font-semibold min-w-[440px]">
                                Floor / Planned / Actual / Remaining / Unit
                              </TableHead>
                              <TableHead className="font-semibold min-w-[180px]">
                                {t('constraint')}
                              </TableHead>
                              <TableHead className="font-semibold min-w-[160px]">
                                {t('engineerComments')}
                              </TableHead>
                              <TableHead className="font-semibold min-w-[120px]">
                                {t('rov')}
                              </TableHead>
                              <TableHead className="font-semibold w-[120px]">
                                {t('status')}
                              </TableHead>
                              <TableHead className="font-semibold w-[220px]">
                                {t('actions')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {wp.dailyPlans.map(dp => (
                              <TableRow key={dp.id}>
                                <TableCell className="text-xs align-top">
                                  {DAY_NAMES[dp.dayNumber - 1]}
                                </TableCell>

                                <TableCell className="text-xs align-top">
                                  {dp.date}
                                </TableCell>

                                <TableCell className="align-top">
                                  <ActualBreakdownView rows={dp.quantityBreakdown} />
                                </TableCell>

                                <TableCell className="text-xs align-top">
                                  <div>{dp.constraint || '—'}</div>
                                  {(dp.constraintDate || dp.responsiblePerson) && (
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                      {dp.constraintDate && <div>Date: {dp.constraintDate}</div>}
                                      {dp.responsiblePerson && <div>Person: {dp.responsiblePerson}</div>}
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell className="text-xs align-top">
                                  {dp.engineerNote || '—'}
                                </TableCell>

                                <TableCell className="text-xs align-top">
                                  {dp.rov || 'None'}
                                </TableCell>

                                <TableCell className="align-top">
                                  <StatusBadge status={dp.status} />
                                </TableCell>

                                <TableCell className="align-top">
                                  {dp.status === 'forwarded' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openSupervisorLogDialog(
                                          swp.id,
                                          wp.id,
                                          dp,
                                          'create'
                                        )
                                      }
                                    >
                                      {t('logQtyRov')}
                                    </Button>
                                  )}

                                  {dp.status === 'logged' && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openSupervisorLogDialog(
                                            swp.id,
                                            wp.id,
                                            dp,
                                            'edit'
                                          )
                                        }
                                      >
                                        <Pencil className="w-3 h-3" /> {t('edit')}
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive"
                                        onClick={() => {
                                          const ok = window.confirm(
                                            'Delete supervisor log and move task back to forwarded state?'
                                          );
                                          if (!ok) return;
                                          deleteSupervisorLog(project.id, swp.id, wp.id, dp.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" /> {t('delete')}
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
)}

{showTickets && (
  <Dialog open={showTickets} onOpenChange={setShowTickets}>
    <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Tickets</DialogTitle></DialogHeader>
      <Tabs value={ticketTab} onValueChange={(v) => setTicketTab(v as 'open' | 'in-progress' | 'closed')}>
        <TabsList className="mb-4">
          <TabsTrigger value="open">Open ({engineerTickets.filter(t => t.status === 'open').length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({engineerTickets.filter(t => t.status === 'in-progress').length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({engineerTickets.filter(t => t.status === 'closed').length})</TabsTrigger>
        </TabsList>
        {(['open', 'in-progress', 'closed'] as const).map(status => (
          <TabsContent key={status} value={status}>
            {engineerTickets.filter(t => t.status === status).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No {status} tickets.</p>
            ) : (
              <div className="space-y-3">
                {engineerTickets.filter(t => t.status === status).map(ticket => (
                  <Card key={ticket.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold">{ticket.tradeName} · <span className="font-mono text-xs">{ticket.recoveryId}</span></p>
                          <p className="text-xs text-muted-foreground">Date: {ticket.date} · Contractor: {getContractorName(ticket.contractorName)}</p>
                        </div>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Target:</span> {ticket.targetQuantity} {ticket.unit}</div>
                        <div><span className="text-muted-foreground">Done:</span> {ticket.completedQuantity} {ticket.unit}</div>
                        <div className="text-destructive font-semibold">Shortfall: {ticket.shortfallQuantity} {(ticket.units?.length ? ticket.units.join(', ') : ticket.unit) || ''}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                       <div><span className="font-medium">ROV:</span> {ticket.rov || '—'} </div>
                        <div><span className="font-medium">{t('constraint')}:</span> {ticket.constraint || '—'}</div>
       </div>

                      {status !== 'closed' && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div>
                            <Label className="text-xs">Recovery Deadline</Label>
                            <Input type="date" value={ticket.recoveryDeadline || ''} onChange={e => updateTicket(ticket.id, { recoveryDeadline: e.target.value })} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Contractor Statement</Label>
                            <Textarea value={ticket.contractorStatement || ''} onChange={e => updateTicket(ticket.id, { contractorStatement: e.target.value })} placeholder="Enter contractor notes..." className="mt-1 text-xs" rows={2} />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        {status === 'open' && (
                          <Button size="sm" variant="outline" onClick={() => updateTicket(ticket.id, { status: 'in-progress' })}>
                            Mark In Progress
                          </Button>
                        )}
                        {status === 'in-progress' && (
                          <Button size="sm" onClick={() => updateTicket(ticket.id, { status: 'closed' })}>
                            <Check className="w-3 h-3" /> Submit & Close
                          </Button>
                        )}
                        {status === 'closed' && (
                          <span className="text-xs text-muted-foreground">Resolved — sent to Admin</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DialogContent>
  </Dialog>
)}
      {/* =================== DIALOGS =================== */}

      {/* Create 6-Week Plan with Multiple Activities */}
      <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto w-[800px]" >
          <DialogHeader>
  <DialogTitle>
    {planDialogMode === 'new-plan' ? 'Create New Plan' : 'Create 6-Week Plan'}
  </DialogTitle>
</DialogHeader>
          <div className="space-y-4">
            <div><Label>Building Name</Label><Input value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="e.g. Building 1" className="mt-1" /></div>
            <div><Label>Plan Name</Label><Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. RCC Phase 1" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal", !planStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {planStartDate ? format(planStartDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={planStartDate} onSelect={setPlanStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date (auto)</Label>
                <Input readOnly value={planEndDate ? format(planEndDate, 'PPP') : '—'} className="mt-1 bg-muted/50 cursor-not-allowed" />
              </div>
            </div>

            {/* Activities CRUD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Activities ({planActivities.length})</Label>
                <Button size="sm" variant="outline" onClick={addActivity}><Plus className="w-3 h-3" /> Add Activity</Button>
              </div>

              {planActivities.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Contractor</TableHead>
                        <TableHead className="text-xs">Trade</TableHead>
                        <TableHead className="text-xs">Trade Activity</TableHead>
                       <TableHead className="text-xs min-w-[300px]">Floor / Qty / Unit</TableHead>
                        <TableHead className="text-xs w-20">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planActivities.map((act, idx) => (
                        <TableRow key={act.id} className={editingActivityIdx === idx ? 'bg-primary/5' : ''}>
                          <TableCell className="text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="text-xs">{act.category || '—'}</TableCell>
                          <TableCell className="text-xs">{act.contractorId ? getContractorName(act.contractorId) : '—'}</TableCell>
                          <TableCell className="text-xs">{act.trade || '—'}</TableCell>
                          <TableCell className="text-xs">{act.tradeActivity || '—'}</TableCell>
                          <TableCell className="align-top">
  <QtyBreakdownView rows={act.quantityBreakdown} />
</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingActivityIdx(editingActivityIdx === idx ? null : idx)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              {planActivities.length > 1 && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeActivity(idx)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Edit form for selected activity */}
              {editingActivityIdx !== null && planActivities[editingActivityIdx] && (
                <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Editing Activity #{editingActivityIdx + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={planActivities[editingActivityIdx].category} onValueChange={v => updateActivity(editingActivityIdx, 'category', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Contractor</Label>
                      <Select value={planActivities[editingActivityIdx].contractorId} onValueChange={v => updateActivity(editingActivityIdx, 'contractorId', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Trade</Label>
                    <Select value={planActivities[editingActivityIdx].trade} onValueChange={v => updateActivity(editingActivityIdx, 'trade', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Trade Activity</Label>
                    <Input
                      className="mt-1"
                      placeholder="Enter Trade Activity"
                      value={planActivities[editingActivityIdx].tradeActivity || ""}
                      onChange={(e) => updateActivity(editingActivityIdx, "tradeActivity", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div>
  <Label className="text-xs">Floor / Unit / Quantity Breakdown</Label>
  <QuantityBreakdownEditor
    value={planActivities[editingActivityIdx].quantityBreakdown || []}
    onChange={(rows) => {
      const normalized = normalizeBreakdown({
        ...planActivities[editingActivityIdx],
        quantityBreakdown: rows,
      });

      setPlanActivities(prev =>
        prev.map((a, i) => i === editingActivityIdx ? normalized : a)
      );
    }}
  />
</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setEditingActivityIdx(null)}>Done Editing</Button>
                </div>
              )}
            </div>

            <Button onClick={handleCreatePlan} disabled={!planName || !planStartDate || planActivities.filter(a => a.category && a.contractorId && a.tradeActivity).length === 0} className="w-full">
              Initiate Planned Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
  open={!!showSupervisorLogDialog}
  onOpenChange={() => setShowSupervisorLogDialog(null)}
>
  <DialogContent className="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle>
  {supervisorDialogMode === 'edit' ? 'Edit Daily Progress' : 'Log Daily Progress'}
</DialogTitle>
    </DialogHeader>

    {showSupervisorLogDialog && (() => {
      const swp = project.sixWeekPlans.find(
        s => s.id === showSupervisorLogDialog.sixWeekPlanId
      );
      const wp = swp?.weeklyPlans.find(
        w => w.id === showSupervisorLogDialog.weeklyPlanId
      );
      const dp = wp?.dailyPlans.find(
        d => d.id === showSupervisorLogDialog.dailyPlanId
      );

      if (!swp || !wp || !dp) return null;

      return (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Plan Name:</span>
              <span>{swp.name}</span>

              <span className="text-muted-foreground">{t('week')}:</span>
              <span>{t('week')}{wp.weekNumber}</span>

              <span className="text-muted-foreground">Trade Activity:</span>
              <span>{wp.tradeActivity}</span>

              <span className="text-muted-foreground">Contractor:</span>
              <span>{getContractorName(wp.contractorId)}</span>

              <span className="text-muted-foreground">{t('day')}:</span>
              <span>{DAY_NAMES[dp.dayNumber - 1]}</span>

              <span className="text-muted-foreground">Date:</span>
              <span>{dp.date}</span>

              <span className="text-muted-foreground">Planned Quantity:</span>
              <span>
                {dp.plannedQuantity}{' '}
                {(wp.units && wp.units.length ? wp.units.join(', ') : wp.unit) || '—'}
              </span>

              <span className="text-muted-foreground">Floor Units:</span>
              <span>{Array.isArray(dp.floorUnits) ? dp.floorUnits.join(', ') : dp.floorUnits || '—'}</span>

              <span className="text-muted-foreground">{t('constraint')}:</span>
              <span>{dp.constraint || '—'}</span>

              <span className="text-muted-foreground">Engineer Note:</span>
              <span>{dp.engineerNote || '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
           <div>
  <Label>Actual Quantity by Floor / Unit</Label>
  <QuantityBreakdownEditor
    value={supervisorBreakdown}
    onChange={setSupervisorBreakdown}
    mode="actual"
  />
</div>

            <div>
              <Label>Select ROV</Label>
              <Select value={supervisorRovComment} onValueChange={setSupervisorRovComment}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select ROV Comment" />
                </SelectTrigger>
                <SelectContent>
  <SelectItem value="none">None</SelectItem>

  {CONSTRAINTS.map(c => (
    <SelectItem key={c} value={c}>
      {c}
    </SelectItem>
  ))}
</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSupervisorLogDialog(null)}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleSupervisorLogSubmit}>
  {supervisorDialogMode === 'edit' ? 'Update Progress' : 'Log Progress'}
</Button>
          </div>
        </div>
      );
    })()}
  </DialogContent>
</Dialog>

      <Dialog open={!!showEditWeekly} onOpenChange={() => setShowEditWeekly(null)}>
  <DialogContent className="sm:max-w-4xl">
    <DialogHeader>
      <DialogTitle>{t('edit')} {t('subWeekPlan')}</DialogTitle>
    </DialogHeader>

    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Contractor</Label>
          <Select value={editWpContractorId} onValueChange={setEditWpContractorId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select contractor" />
            </SelectTrigger>
            <SelectContent>
              {contractors.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estimated Quantity</Label>
          <Input
            type="number"
            step="any"
            value={editWpQty}
            onChange={e => setEditWpQty(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t('constraint')}</Label>
          <Select value={editWpConstraint} onValueChange={setEditWpConstraint}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select constraint" />
            </SelectTrigger>
            <SelectContent>
              {CONSTRAINTS.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
       <div>
  <Label>Weekly Floor / Unit / Quantity</Label>
  <QuantityBreakdownEditor
    value={editWpBreakdown}
    onChange={setEditWpBreakdown}
  />
</div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowEditWeekly(null)}>
          {t('cancel')}
        </Button>
        <Button onClick={handleUpdateWeekly}>
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

      <Dialog open={!!showEditDaily} onOpenChange={() => setShowEditDaily(null)}>
  <DialogContent className="sm:max-w-4xl">
    <DialogHeader>
      <DialogTitle>{t('edit')} {t('dailyPlan')}</DialogTitle>
    </DialogHeader>

    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('day')}</Label>
          <Select value={editDpDay} onValueChange={setEditDpDay}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((d, i) => (
                <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('date')}</Label>
          <Input type="date" value={editDpDate} onChange={e => setEditDpDate(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Planned Quantity</Label>
          <Input
            type="number"
            step="any"
            value={editDpQty}
            onChange={e => setEditDpQty(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
  <Label>Units</Label>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="w-full mt-1 justify-between">
        {editDpUnits?.length ? editDpUnits.join(", ") : "Select Units"}
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
      {(selectedWp?.units || (selectedWp?.unit ? [selectedWp.unit] : UNITS)).map((u) => {
        const checked = editDpUnits.includes(u);

        return (
          <div key={u} className="flex items-center gap-2 px-2 py-1">
            <Checkbox
              checked={checked}
              onCheckedChange={(isChecked) => {
                const updated = isChecked
                  ? [...editDpUnits, u]
                  : editDpUnits.filter(item => item !== u);

                setEditDpUnits(updated);
              }}
            />
            <span className="text-sm">{u}</span>
          </div>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
      </div>

      <div>
        <Label>{t('constraint')}</Label>
        <Select value={editDpConstraint} onValueChange={setEditDpConstraint}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger>
          <SelectContent>
            {CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Floor Units</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full mt-1 justify-between">
              {editDpFloor?.length ? editDpFloor.join(", ") : "Select Floor"}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
            {FLOOR_UNITS.map((f) => {
              const checked = editDpFloor.includes(f);

              return (
                <div key={f} className="flex items-center gap-2 px-2 py-1">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const updated = isChecked
                        ? [...editDpFloor, f]
                        : editDpFloor.filter(item => item !== f);

                      setEditDpFloor(updated);
                    }}
                  />
                  <span className="text-sm">{f}</span>
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <Label>Engineer Note</Label>
        <Input value={editDpNote} onChange={e => setEditDpNote(e.target.value)} className="mt-1" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowEditDaily(null)}>
          {t('cancel')}
        </Button>
        <Button onClick={handleUpdateDaily}>
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

      {/* Create Sub-Week Plan — Activity-driven */}
     <Dialog open={!!showCreateWeekly} onOpenChange={() => setShowCreateWeekly(null)}>
  <DialogContent className="sm:max-w-5xl">
    <DialogHeader>
      <DialogTitle>Create Sub-Week Plan</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
      <div>
        <Label>Select Activity</Label>
        <Select
          value={wpActivityId}
          onValueChange={(val) => {
            setWpActivityId(val);

            const act = currentSwpForWeekly?.activities.find(a => a.id === val);

            if (act) {
              setWpBreakdown([]);
              setWpEstQty('');
              setWpUnits(act.units || getUnitsFromBreakdown(act.quantityBreakdown || []));
              setWpFloor(act.floorUnits || getFloorsFromBreakdown(act.quantityBreakdown || []));
            }
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Choose an activity" />
          </SelectTrigger>
          <SelectContent>
            {currentSwpForWeekly?.activities.map(act => (
              <SelectItem key={act.id} value={act.id}>
                {act.trade} — {act.tradeActivity} ({getContractorName(act.contractorId)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedActivity && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Activity Details
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Activity ID</span>
              <span className="font-mono break-all">{selectedActivity.id}</span>
            </div>

            <div>
              <span className="text-muted-foreground block">Category</span>
              <span className="font-medium">{selectedActivity.category}</span>
            </div>

            <div>
              <span className="text-muted-foreground block">Contractor</span>
              <span className="font-medium">
                {getContractorName(selectedActivity.contractorId)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block">Trade</span>
              <span className="font-medium">{selectedActivity.trade}</span>
            </div>

            <div>
              <span className="text-muted-foreground block">Trade Activity</span>
              <span className="font-medium">{selectedActivity.tradeActivity}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Activity Quantity Breakdown
              </p>
              <QtyBreakdownView rows={selectedActivity.quantityBreakdown} />
            </div>

            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Unit-wise Total
              </p>
              <UnitWiseTotalView rows={selectedActivity.quantityBreakdown} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>{t('week')} Number</Label>
          <Select value={wpWeek} onValueChange={setWpWeek}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => (
                <SelectItem key={w} value={String(w)}>
                  {t('week')} {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentSwpForWeekly && wpWeek && (
  <div className="rounded-md border bg-muted/20 p-3 text-xs">
    <span className="font-semibold">Selected Week Date Range: </span>
    {(() => {
      const range = getSubWeekDateRange(currentSwpForWeekly.startDate, Number(wpWeek));
      return `${range.displayStartDate} → ${range.displayEndDate}`;
    })()}
  </div>
)}

        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Selected Week Quantity
          </p>
          <UnitWiseTotalView rows={wpBreakdown} />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Floor / Unit / Quantity for this Week</Label>
          <span className="text-xs text-muted-foreground">
            Select from activity floor/unit rows
          </span>
        </div>

        <QuantityBreakdownEditor
          value={wpBreakdown}
          onChange={setWpBreakdown}
          allowedRows={selectedActivity?.quantityBreakdown || []}
        />

        <div className="rounded-md bg-muted/20 p-2 text-xs">
          <span className="font-semibold">Week Total: </span>
          <UnitWiseTotalView rows={wpBreakdown} />
        </div>
      </div>

      <div>
        <Label>Constraint</Label>
        <Select value={wpConstraint} onValueChange={setWpConstraint}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select constraint" />
          </SelectTrigger>
          <SelectContent>
            {CONSTRAINTS.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>{t('constraintDate')}</Label>
          <Input
            type="date"
            value={wpConstraintDate}
            onChange={e => setWpConstraintDate(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t('responsiblePerson')}</Label>
          <Input
            value={wpResponsiblePerson}
            onChange={e => setWpResponsiblePerson(e.target.value)}
            placeholder="Enter name"
            className="mt-1"
          />
        </div>
      </div>

      <Button
        onClick={() => showCreateWeekly && handleCreateWeekly(showCreateWeekly)}
        disabled={!wpActivityId || wpBreakdown.length === 0 || totalQty(wpBreakdown) <= 0}
        className="w-full"
      >
        <Send className="w-4 h-4" /> Add & Assign to Engineer
      </Button>
    </div>
  </DialogContent>
</Dialog>

      {/* {project.sixWeekPlans.flatMap(swp =>
                swp.weeklyPlans.filter(wp => wp.assignedToEngineer).map(wp => ({ ...wp, swpId: swp.id, planName: swp.name }))
              ) */}


      {/* Create Daily Plan (Engineer) — 6 days only */}
      <Dialog open={!!showCreateDaily} onOpenChange={() => setShowCreateDaily(null)}>
  <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>Add {t('dailyPlan')} (Mon-Sat)</DialogTitle>
    </DialogHeader>

    <div className="overflow-y-auto pr-2 space-y-4">
      {selectedWp && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Assigned Weekly Plan
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Plan Name</span>
              <span className="font-medium">{selectedWp.planName}</span>
            </div>

            <div>
              <span className="text-muted-foreground block">Week</span>
              <span className="font-medium">{t('week')} {selectedWp.weekNumber}</span>
            </div>

            <div>
              <span className="text-muted-foreground block">Estimated</span>
              <UnitWiseTotalView rows={selectedWp.quantityBreakdown} />
            </div>

            <div>
              <span className="text-muted-foreground block">Remaining</span>
              <UnitWiseTotalView rows={selectedWp.quantityBreakdown} />
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Weekly Floor / Qty / Unit
            </p>
            <QtyBreakdownView rows={selectedWp.quantityBreakdown} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>{t('day')}</Label>
          <Select value={dpDay} onValueChange={setDpDay}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((d, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('date')}</Label>
          <Input
            type="date"
            value={dpDate}
            onChange={e => setDpDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Daily Floor / Unit / Quantity</Label>

          <div className="text-xs text-muted-foreground text-right">
            <div>Selected:</div>
            <UnitWiseTotalView rows={dpBreakdown} />
          </div>
        </div>

        <QuantityBreakdownEditor
          value={dpBreakdown}
          onChange={setDpBreakdown}
          allowedRows={selectedWp?.quantityBreakdown || []}
        />

        <div className="rounded-md bg-muted/20 p-2 text-xs">
          <span className="font-semibold">Daily Total: </span>
          <UnitWiseTotalView rows={dpBreakdown} />
        </div>

        {totalQty(dpBreakdown) > maxAllowedQty && (
          <p className="text-xs text-destructive">
            Daily quantity cannot exceed remaining quantity.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>{t('constraint')}</Label>
          <Select value={dpConstraint} onValueChange={setDpConstraint}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select constraint" />
            </SelectTrigger>
            <SelectContent>
              {CONSTRAINTS.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('constraint')} {t('date')}</Label>
          <Input
            type="date"
            value={dpConstraintDate}
            onChange={e => setDpConstraintDate(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{t('responsiblePerson')}</Label>
          <Input
            value={dpResponsiblePerson}
            onChange={e => setDpResponsiblePerson(e.target.value)}
            placeholder="Enter name"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Engineer Note (optional)</Label>
        <Input
          value={dpNote}
          onChange={e => setDpNote(e.target.value)}
          placeholder="Any remarks for this day"
          className="mt-1"
        />
      </div>

      <Button
        onClick={handleCreateDaily}
        disabled={
          !dpDate ||
          dpBreakdown.length === 0 ||
          totalQty(dpBreakdown) <= 0 ||
          totalQty(dpBreakdown) > maxAllowedQty
        }
        className="w-full"
      >
        <Plus className="w-4 h-4" /> Add {t('dailyPlan')}
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default ProjectDetailPage;