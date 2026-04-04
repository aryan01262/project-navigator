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
import type { SixWeekPlan, WeeklyPlan, DailyPlan, PlanActivity } from '@/types/planner';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyActivity = (): PlanActivity => ({
  id: crypto.randomUUID(),
  category: '',
  contractorId: '',
  trade: '',
  tradeActivity: '',
  unit: '',
  estimatedQuantity: 0,
  floorUnits: [] as string[],
  remainingQuantity: 0,
});

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projects, contractors, role,
    addSixWeekPlan, updateSixWeekPlanActivities, addWeeklyPlan, assignToEngineer,
    addDailyPlan, forwardDailyToSupervisor, logDailyTarget, submitDailyTarget, confirmDailyTarget, updateActivity2, updateWeeklyPlanField,
    tickets, updateTicket
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
  const [planStartDate, setPlanStartDate] = useState<Date>();
  const [planActivities, setPlanActivities] = useState<PlanActivity[]>([emptyActivity()]);
  const [editingActivityIdx, setEditingActivityIdx] = useState<number | null>(0);

  // Weekly plan form - now activity-driven
  const [wpActivityId, setWpActivityId] = useState('');
  const [wpUnit, setWpUnit] = useState('');
  const [wpEstQty, setWpEstQty] = useState('');
  const [wpFloor, setWpFloor] = useState<string[]>([]);
  const [wpWeek, setWpWeek] = useState('1');
  const [wpConstraint, setWpConstraint] = useState('');

  // Daily plan form
  const [dpDate, setDpDate] = useState('');
  const [dpDay, setDpDay] = useState('1');
  const [dpQty, setDpQty] = useState('');
  const [dpConstraint, setDpConstraint] = useState('');
  const [dpFloor, setDpFloor] = useState<string[]>([]);
  const [dpNote, setDpNote] = useState('');
  const [dpUnits, setDpUnits] = useState('');
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
  .map(a => ({
    ...a,
    remainingQuantity: a.estimatedQuantity
  }));
      console.log(validActivities)
    if (validActivities.length === 0) return;
    const plan: SixWeekPlan = {
      id: crypto.randomUUID(), projectId: project.id, name: planName,
      activities: validActivities,
      startDate: format(planStartDate, 'yyyy-MM-dd'), endDate: format(planEndDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(), weeklyPlans: [],
    };
    addSixWeekPlan(project.id, plan);
    setShowCreatePlan(false);
    setPlanName(''); setPlanStartDate(undefined); setPlanActivities([emptyActivity()]); setEditingActivityIdx(0);
  };

  // const handleCreateWeekly = (sixWeekPlanId: string) => {
  //   const swp = project.sixWeekPlans.find(s => s.id === sixWeekPlanId);
  //   if (!swp || !wpActivityId) return;
  //   const activity = swp.activities.find(a => a.id === wpActivityId);
  //   if (!activity) return;
  //   const existingCount = swp.weeklyPlans.length;
  //   const wp: WeeklyPlan = {
  //     id: crypto.randomUUID(), sixWeekPlanId, weekNumber: Number(wpWeek),
  //     taskId: `T-${String(existingCount + 1).padStart(3, '0')}`,
  //     category: activity.category, contractorId: activity.contractorId, tradeActivity: activity.tradeActivity,
  //     unit: wpUnit || activity.unit, estimatedQuantity: Number(wpEstQty) || 0, floorUnits: wpFloor || activity.floorUnits,
  //     constraint: wpConstraint, status: 'pending', assignedToEngineer: false, dailyPlans: [],
  //   };
  //   addWeeklyPlan(project.id, sixWeekPlanId, wp);
  //   setShowCreateWeekly(null);
  //   setWpActivityId(''); setWpUnit(''); setWpEstQty(''); setWpFloor([]); setWpConstraint(''); setWpWeek('1');
  // };

  

const handleCreateWeekly = (sixWeekPlanId: string) => {
  const swp = project.sixWeekPlans.find(s => s.id === sixWeekPlanId);
  if (!swp || !wpActivityId) return;

  const activity = swp.activities.find(a => a.id === wpActivityId);
  if (!activity) return;

  const qtyToAssign = Number(wpEstQty) || 0;


  // Use persisted remainingQuantity, fallback to estimatedQuantity for old data
  const currentRemaining = activity.remainingQuantity ?? activity.estimatedQuantity;

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
    weekNumber: Number(wpWeek),
    taskId: `T-${String(existingCount + 1).padStart(3, '0')}`,
    category: activity.category,
    contractorId: activity.contractorId,
    tradeActivity: activity.tradeActivity,
    unit: wpUnit || activity.unit,
    estimatedQuantity: qtyToAssign,
    remainingQuantity: qtyToAssign,
    floorUnits: wpFloor || activity.floorUnits,
    constraint: wpConstraint,
    status: 'pending',
    assignedToEngineer: false,
    dailyPlans: [],
  };

  addWeeklyPlan(project.id, sixWeekPlanId, wp);

  // ✅ Persist the new remaining quantity back to the activity
updateActivity2(project.id, sixWeekPlanId, wpActivityId, {
    remainingQuantity: currentRemaining - qtyToAssign,
  });

  setShowCreateWeekly(null);
  setWpActivityId(''); setWpUnit(''); setWpEstQty(''); setWpFloor([]); setWpConstraint(''); setWpWeek('1');
};
  
const handleCreateDaily = () => {
  if (!showCreateDaily || !dpDate || !dpQty) return;

  const swp = project.sixWeekPlans.find(s => s.id === showCreateDaily.swpId);
  const wp = swp?.weeklyPlans.find(w => w.id === showCreateDaily.wpId);
  if (!wp) return;

  const qtyToAssign = Number(dpQty);

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
    plannedQuantity: qtyToAssign,
    unit: dpUnits,
    constraint: dpConstraint,
    floorUnits: dpFloor,
    engineerNote: dpNote,
    status: 'pending',
    remainingQuantity: currentRemaining - qtyToAssign
  };

  addDailyPlan(project.id, showCreateDaily.swpId, showCreateDaily.wpId, daily);

  // ✅ Persist updated remaining quantity back to the weekly plan
  updateWeeklyPlanField(project.id, showCreateDaily.swpId, showCreateDaily.wpId, {
    remainingQuantity: currentRemaining - qtyToAssign,
  });

  // reset form
  setDpDate(''); setDpQty(''); setDpConstraint(''); setDpFloor([]); setDpNote(''); setDpDay('1'); setDpUnits('');
  setShowCreateDaily(null);
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

  const allowedUnit = selectedWp?.unit || "";

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
    ?.filter(wp => wp.id === selectedActivity?.id)
    ?.reduce((sum, wp) => sum + Number(wp.estimatedQuantity || 0), 0) || 0;

const remainingQty = (selectedActivity?.estimatedQuantity || 0) - assignedQty;
console.log(selectedActivity)
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
        {role === 'admin' && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate(`/projects/${projectId}/reports`)}>
            <BarChart3 className="w-4 h-4" /> Reports
          </Button>
        )}
      </div>

      {/* =================== ADMIN VIEW =================== */}
      {role === 'admin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">{project.sixWeekPlans.length} six-week plan(s)</p>
            <Button onClick={() => setShowCreatePlan(true)}><Plus className="w-4 h-4" /> 6 Week Plan</Button>
          </div>
          {project.sixWeekPlans.map(swp => (
            <Card key={swp.id}>
              <CardHeader className="cursor-pointer pb-2" onClick={() => setExpandedPlan(expandedPlan === swp.id ? null : swp.id)}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {expandedPlan === swp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {swp.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">{swp.startDate} → {swp.endDate}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{swp.activities.length} activit{swp.activities.length === 1 ? 'y' : 'ies'}</p>
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
                          <TableHead className="text-xs">Unit</TableHead>
                          <TableHead className="text-xs">Est. Qty</TableHead>
                          <TableHead className="text-xs">Rem. Qty</TableHead>
                          <TableHead className="text-xs">Floor</TableHead>
                          <TableHead className="text-xs w-20">Actions</TableHead>
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
                            <TableCell className="text-xs">{act.unit}</TableCell>
                            <TableCell className="text-xs">{act.estimatedQuantity}</TableCell>
                            <TableCell className="text-xs">{act.remainingQuantity}</TableCell>
                            <TableCell className="text-xs"> {act.floorUnits?.length ? act.floorUnits.join(", ") : "—"}</TableCell>
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
                          <Select value={editData.unit} onValueChange={v => setEditData({ ...editData, unit: v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Est. Quantity</Label>
                          <Input type="number" className="mt-1" value={editData.estimatedQuantity} onChange={e => setEditData({ ...editData, estimatedQuantity: Number(e.target.value) })} />
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
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }}>Cancel</Button>
                        <Button size="sm" onClick={() => {
                          const updated = swp.activities.map(a => a.id === editingId ? editData : a);
                          updateSixWeekPlanActivities(project.id, swp.id, updated);
                          setEditingId(null); setEditData(null);
                        }}>Save</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={() => {
                      const newAct = emptyActivity();
                      updateSixWeekPlanActivities(project.id, swp.id, [...swp.activities, newAct]);
                      setEditingId(newAct.id); setEditData({ ...newAct });
                    }}><Plus className="w-3 h-3" /> Add Activity</Button>
                    <Button size="sm" onClick={() => setShowCreateWeekly(swp.id)}><Plus className="w-4 h-4" /> Sub-Week Plan</Button>
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
                              <span className="text-sm font-medium">W{wp.weekNumber} · {wp.tradeActivity}</span>
                              <span className="text-xs text-muted-foreground">{wp.estimatedQuantity} {wp.unit} · {wp.floorUnits}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={wp.status} />
                              {!wp.assignedToEngineer && (
                                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); assignToEngineer(project.id, swp.id, wp.id); }}>
                                  <Send className="w-3 h-3" /> Assign
                                </Button>
                              )}
                            </div>
                          </div>
                          {expandedWeekly === wp.id && wp.dailyPlans.length > 0 && (
                            <div className="px-3 pb-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">Day</TableHead>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Planned</TableHead>
                                    <TableHead className="text-xs">Actual</TableHead>
                                    <TableHead className="text-xs">Floor</TableHead>
                                    <TableHead className="text-xs">Constraint</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-xs">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {wp.dailyPlans.map(dp => (
                                    <TableRow key={dp.id}>
                                      <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                                      <TableCell className="text-xs">{dp.date}</TableCell>
                                      <TableCell className="text-xs">{dp.plannedQuantity} {wp.unit}</TableCell>
                                      <TableCell className="text-xs font-medium">{dp.completedQuantity !== undefined ? `${dp.completedQuantity} ${wp.unit}` : '—'}</TableCell>
                                      <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                      <TableCell className="text-xs">{dp.constraintLog || dp.constraint || '—'}</TableCell>
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
          ))}
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
                        <TableHead className="text-xs">Constraint</TableHead>
                        <TableHead className="text-xs">ROV</TableHead>
                        <TableHead className="text-xs">Contractor Notes</TableHead>
                        <TableHead className="text-xs">Deadline</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminTickets.map(ticket => (
                        <TableRow key={ticket.id}>
                          <TableCell className="text-xs font-mono">{ticket.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs font-mono">{ticket.recoveryId}</TableCell>
                          <TableCell className="text-xs">{getContractorName(ticket.contractorName)}</TableCell>
                          <TableCell className="text-xs">{ticket.tradeName}</TableCell>
                          <TableCell className="text-xs text-destructive font-semibold">{ticket.shortfallQuantity} {ticket.unit}</TableCell>
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
    Assigned Weekly Plans
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
                        <span className="text-xs text-muted-foreground">{wp.estimatedQuantity} {wp.unit}</span>
                        <StatusBadge status={wp.status} />
                      </div>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{wp.planName} · {getContractorName(wp.contractorId)} · Constraint: {wp.constraint || 'None'}</p>
                  </CardHeader>
                  {expandedWeekly === wp.id && (
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{wp.dailyPlans.length} daily plan(s) · Total planned: {wp.dailyPlans.reduce((s, d) => s + d.plannedQuantity, 0)} / {wp.estimatedQuantity} {wp.unit}</p>
                        <Button size="sm" onClick={() => setShowCreateDaily({ swpId: wp.swpId, wpId: wp.id })}>
                          <Plus className="w-3 h-3" /> Add Daily Plan
                        </Button>
                      </div>
                      {wp.dailyPlans.length > 0 && (
                        <div className="bg-card rounded-lg border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-primary/5">
                                <TableHead className="text-xs font-semibold">Day</TableHead>
                                <TableHead className="text-xs font-semibold">Date</TableHead>
                                <TableHead className="text-xs font-semibold">Planned Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Actual Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Remaining Qty</TableHead>
                                <TableHead className="text-xs font-semibold">Floor</TableHead>
                                <TableHead className="text-xs font-semibold">Constraint</TableHead>
                                <TableHead className="text-xs font-semibold">Eng Comments</TableHead>
                                <TableHead className="text-xs font-semibold">ROV Comments</TableHead>
                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                <TableHead className="text-xs font-semibold">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {wp.dailyPlans.map(dp => (
                                <TableRow key={dp.id}>
                                  <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                                  <TableCell className="text-xs">{dp.date}</TableCell>
                                  <TableCell className="text-xs font-medium">{dp.plannedQuantity} {wp.unit}</TableCell>
                                  <TableCell className="text-xs">{dp.completedQuantity !== undefined ? `${dp.completedQuantity} ${wp.unit}` : '—'}</TableCell>
                                  <TableHead className="text-xs font-semibold">{dp.remainingQuantity}</TableHead>
                                  <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                  <TableCell className="text-xs">{dp.constraint || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.engineerNote || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.rov || '—'}</TableCell>
                                  <TableCell><StatusBadge status={dp.status} /></TableCell>
                                  <TableCell className="space-x-1">
                                    {dp.status === 'pending' && (
                                      <Button size="sm" variant="outline" onClick={() => forwardDailyToSupervisor(project.id, wp.swpId, wp.id, dp.id)}>
                                        <Send className="w-3 h-3" /> Forward
                                      </Button>
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
          <h2 className="font-semibold text-lg">Daily Task Logs</h2>
          {allDailyPlans.filter(dp => dp.status === 'forwarded' || dp.status === 'logged').length === 0 ? (
            <p className="text-muted-foreground text-sm">No daily tasks forwarded yet.</p>
          ) : (
            <div className="bg-card rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="font-semibold">Task</TableHead>
                    <TableHead className="font-semibold">Day</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Trade</TableHead>
                    <TableHead className="font-semibold">Target</TableHead>
                    <TableHead className="font-semibold">Floor</TableHead>
                    <TableHead className="font-semibold">Constraint</TableHead>
                     <TableHead className="font-semibold">Engineer Comments</TableHead>
                      <TableHead className="font-semibold">ROV</TableHead>
                    {/* <TableHead className="font-semibold">Status</TableHead> */}
                    <TableHead className="font-semibold w-[350px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDailyPlans.filter(dp => dp.status === 'forwarded' || dp.status === 'logged').map(dp => (
                    <TableRow key={dp.id}>
                      <TableCell className="font-mono text-xs">{dp.taskId}</TableCell>
                      <TableCell className="text-xs">{DAY_NAMES[dp.dayNumber - 1]}</TableCell>
                      <TableCell className="text-xs">{dp.date}</TableCell>
                      <TableCell className="text-sm font-medium">{dp.tradeActivity}</TableCell>
                      <TableCell className="text-sm">{dp.plannedQuantity} {dp.weekUnit}</TableCell>
                      <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                      <TableCell className="text-xs">{dp.constraint || '—'}</TableCell>
                      <TableCell className="text-xs">{dp.engineerNote || '—'}</TableCell>
                      <TableCell className="text-xs">{dp.rov || '—'}</TableCell>
                      {/* <TableCell><StatusBadge status={dp.status} /></TableCell> */}
                      <TableCell>
                        {dp.status === 'forwarded' && (
                          <div className="flex items-center gap-1 w-[350px] justify-between">
                            <Input type="number" placeholder="Done qty" value={logQty} onChange={e => setLogQty(e.target.value)} className="h-7 w-[100px] text-xs" />
                            {/* <Input placeholder="Note" value={logNote} onChange={e => setLogNote(e.target.value)} className="h-7 w-[200px] text-xs" /> */}
                            <div>
                              <Select value={rovComment} onValueChange={setRovComment}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select ROV Comment" /></SelectTrigger>
                                <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            {/* <Button size="sm" onClick={() => { logDailyTarget(project.id, dp.sixWeekPlanId, dp.weeklyPlanId, dp.id, Number(logQty), true, rovComment); setLogQty(''); setRovComment(''); }}>
                              Log
                            </Button> */}
                            <Button
                              size="sm"
                              onClick={() =>
                                handleLogClick(project.id, dp.sixWeekPlanId, dp.weeklyPlanId, dp.id)
                              }
                            >
                              Log
                            </Button>
                          </div>
                        )}
                        {dp.status === 'logged' && <span className="text-xs text-muted-foreground">Done: {dp.completedQuantity} — Sent to Engineer</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                        <div className="text-destructive font-semibold">Shortfall: {ticket.shortfallQuantity} {ticket.unit}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                       <div><span className="font-medium">ROV:</span> {ticket.rov || '—'} </div>
                        <div><span className="font-medium">Constraint:</span> {ticket.constraint || '—'}</div>
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
          <DialogHeader><DialogTitle>Create 6-Week Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
                        <TableHead className="text-xs">Unit</TableHead>
                        <TableHead className="text-xs">Qty</TableHead>
                        <TableHead className="text-xs">Floor</TableHead>
                        <TableHead className="text-xs w-20">Actions</TableHead>
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
                          <TableCell className="text-xs">{act.unit || '—'}</TableCell>
                          <TableCell className="text-xs">{act.estimatedQuantity || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {act.floorUnits?.length ? act.floorUnits.join(", ") : "—"}
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
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Unit</Label>
                      <Select value={planActivities[editingActivityIdx].unit} onValueChange={v => updateActivity(editingActivityIdx, 'unit', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Est. Quantity</Label>
                      <Input type="number" value={planActivities[editingActivityIdx].estimatedQuantity || ''} onChange={e => updateActivity(editingActivityIdx, 'estimatedQuantity', Number(e.target.value))} placeholder="500" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Floor Units</Label>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full mt-1 justify-between">
                            {planActivities[editingActivityIdx].floorUnits?.length
                              ? planActivities[editingActivityIdx].floorUnits.join(", ")
                              : "Select Floor Units"}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                          {FLOOR_UNITS.map((f) => {
                            const selectedUnits = planActivities[editingActivityIdx].floorUnits || [];
                            const checked = selectedUnits.includes(f);

                            return (
                              <div key={f} className="flex items-center gap-2 px-2 py-1">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    let updated;

                                    if (isChecked) {
                                      updated = [...selectedUnits, f];
                                    } else {
                                      updated = selectedUnits.filter((item) => item !== f);
                                    }

                                    updateActivity(editingActivityIdx, "floorUnits", updated);
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

      {/* Create Sub-Week Plan — Activity-driven */}
      <Dialog open={!!showCreateWeekly} onOpenChange={() => setShowCreateWeekly(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader><DialogTitle>Create Sub-Week Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {/* Step 1: Select Activity */}
            <div>
              <Label>Select Activity</Label>
              <Select
                value={wpActivityId}
                onValueChange={(val) => {
                  setWpActivityId(val);

                  const act = currentSwpForWeekly?.activities.find(a => a.id === val);

                  if (act) {
                    setWpUnit(act.unit);          // ✅ Prefill Unit
                    setWpFloor(act.floorUnits);  // ✅ Prefill Floor Units
                    setWpEstQty("");             // optional reset quantity
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose an activity" /></SelectTrigger>
                <SelectContent>
                  {currentSwpForWeekly?.activities.map(act => (
                    <SelectItem key={act.id} value={act.id}>
                      {act.trade} — {act.tradeActivity} ({getContractorName(act.contractorId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show selected activity info */}
            {selectedActivity && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Activity Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Activity ID:</span><span>{selectedActivity.id}</span>
                  <span className="text-muted-foreground">Category:</span><span>{selectedActivity.category}</span>
                  <span className="text-muted-foreground">Contractor:</span><span>{getContractorName(selectedActivity.contractorId)}</span>
                  <span className="text-muted-foreground">Trade:</span><span>{selectedActivity.trade}</span>
                  <span className="text-muted-foreground">Trade Activity:</span><span>{selectedActivity.tradeActivity}</span>
                  <span className="text-muted-foreground">Estimated Quantity:</span><span>{selectedActivity.estimatedQuantity}</span>
                  <span className="text-muted-foreground">Remaining Quantity:</span><span>{selectedActivity.remainingQuantity}</span>
                  <span className="text-muted-foreground">Units:</span><span>{selectedActivity.unit}</span>
                  <span className="text-muted-foreground">Floor Unit:</span><span>{selectedActivity.floorUnits?.length ? selectedActivity.floorUnits.join(", ") : "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Step 2: Week-specific inputs */}
            <div>
              <Label>Week Number</Label>
              <Select value={wpWeek} onValueChange={setWpWeek}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5, 6].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={wpUnit} disabled>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Quantity</Label>
             <Input
  type="number"
  value={wpEstQty}
  onChange={e => {
    const value = Number(e.target.value);
    const limit = selectedActivity?.remainingQuantity ?? selectedActivity?.estimatedQuantity ?? 0;

    if (value > limit) {
      alert(`Max allowed quantity is ${limit}`);
      return;
    }

    setWpEstQty(e.target.value);
  }}
  placeholder="100"
  className="mt-1"
  max={selectedActivity?.remainingQuantity ?? selectedActivity?.estimatedQuantity ?? undefined}
  min={0}
/>
              </div>
              <div>
                <Label>Floor Units</Label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-between">
                      {wpFloor?.length
                        ? wpFloor.join(", ")
                        : "Select Floor Units"}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                    {(selectedActivity?.floorUnits || []).map((f) => {
                      const checked = wpFloor?.includes(f);

                      return (
                        <div key={f} className="flex items-center gap-2 px-2 py-1">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              let updated;

                              if (isChecked) {
                                updated = [...(wpFloor || []), f];
                              } else {
                                updated = (wpFloor || []).filter((item) => item !== f);
                              }

                              setWpFloor(updated);
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
            <div>
              <Label>Constraint</Label>
              <Select value={wpConstraint} onValueChange={setWpConstraint}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger>
                <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => showCreateWeekly && handleCreateWeekly(showCreateWeekly)} disabled={!wpActivityId} className="w-full">
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader><DialogTitle>Add Daily Plan (Mon-Sat)</DialogTitle></DialogHeader>
          {selectedWp && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Assigned Weekly Plans
              </p>

              {selectedWp && (
                <div className="border rounded p-2 bg-background">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">

                    <span className="text-muted-foreground">Plan Name:</span>
                    <span>{selectedWp.planName}</span>

                    <span className="text-muted-foreground">SWP ID:</span>
                    <span>{selectedWp.swpId}</span>

                    <span className="text-muted-foreground">Activity ID:</span>
                    <span>{selectedWp.id}</span>

                    <span className="text-muted-foreground">Week:</span>
                    <span>Week {selectedWp.weekNumber}</span>

                    <span className="text-muted-foreground">Estimated Quantity:</span>
                    <span>{selectedWp.estimatedQuantity}</span>
                    <span className="text-muted-foreground">Remaining Quantity:</span>
                    <span>{selectedWp.remainingQuantity}</span>

                    <span className="text-muted-foreground">Unit:</span>
                    <span>{selectedWp.unit}</span>

                    <span className="text-muted-foreground">Floor Units:</span>
                    <span>
                      {Array.isArray(selectedWp.floorUnits)
                        ? selectedWp.floorUnits.join(", ")
                        : selectedWp.floorUnits || "—"}
                    </span>

                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day</Label>
                <Select value={dpDay} onValueChange={setDpDay}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={dpDate} onChange={e => setDpDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
             <div>
  <Label>Planned Quantity (units/day)</Label>

  <Input
    type="number"
    value={dpQty}
    min={1}
    max={maxAllowedQty}
    onChange={(e) => {
      const raw = e.target.value;
      const value = Number(raw);

      // Allow clearing the field
      if (raw === '') {
        setDpQty('');
        return;
      }

      if (value <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }

      if (value > maxAllowedQty) {
        alert(`Max allowed quantity is ${maxAllowedQty}`);
        return;
      }

      setDpQty(raw);
    }}
    placeholder="e.g. 50"
    className="mt-1"
  />

  {/* Inline error — cast dpQty to number for correct comparison */}
  {Number(dpQty) > maxAllowedQty && (
    <p className="text-red-500 text-xs mt-1">
      Cannot exceed {maxAllowedQty}
    </p>
  )}

  {/* Show remaining hint below input */}
  {maxAllowedQty > 0 && (
    <p className="text-muted-foreground text-xs mt-1">
      Remaining: {maxAllowedQty - (Number(dpQty) || 0)} {selectedWp?.unit}
    </p>
  )}

  {maxAllowedQty === 0 && (
    <p className="text-destructive text-xs mt-1 font-medium">
      No remaining quantity available for this week plan.
    </p>
  )}
</div>

              <div>
                <Label className="text-xs">Unit</Label>

                <Select value={dpUnits} onValueChange={(v) => setDpUnits(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>

                  <SelectContent>
                    {allowedUnit ? (
                      <SelectItem value={allowedUnit}>{allowedUnit}</SelectItem>
                    ) : (
                      UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Floor</Label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-between">
                      {dpFloor?.length
                        ? dpFloor.join(", ")
                        : "Select Floor"}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                    {allowedFloors.map((f) => {
                      const selected = dpFloor || [];
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

                              setDpFloor(updated);
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
                <Label>Constraint</Label>
                <Select value={dpConstraint} onValueChange={setDpConstraint}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger>
                  <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Engineer Note (optional)</Label>
              <Input value={dpNote} onChange={e => setDpNote(e.target.value)} placeholder="Any remarks for this day" className="mt-1" />
            </div>
            <Button onClick={handleCreateDaily} disabled={!dpDate || !dpQty} className="w-full">
              <Plus className="w-4 h-4" /> Add Daily Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetailPage;