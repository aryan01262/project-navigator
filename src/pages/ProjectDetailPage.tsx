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
import { ArrowLeft, Plus, CalendarIcon, Send, Check, CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORIES, TRADE_ACTIVITIES, UNITS, FLOOR_UNITS, CONSTRAINTS } from '@/types/planner';
import type { SixWeekPlan, WeeklyPlan, DailyPlan } from '@/types/planner';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projects, contractors, role,
    addSixWeekPlan, addWeeklyPlan, assignToEngineer,
    addDailyPlan, forwardDailyToSupervisor, logDailyTarget, validateDailyTarget, confirmDailyTarget,
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
  const [planCategory, setPlanCategory] = useState('');
  const [planContractor, setPlanContractor] = useState('');
  const [planTrade, setPlanTrade] = useState('');
  const [planUnit, setPlanUnit] = useState('');
  const [planEstQty, setPlanEstQty] = useState('');
  const [planFloor, setPlanFloor] = useState('');

  // Weekly plan form
  const [wpCategory, setWpCategory] = useState('');
  const [wpContractor, setWpContractor] = useState('');
  const [wpTrade, setWpTrade] = useState('');
  const [wpUnit, setWpUnit] = useState('');
  const [wpEstQty, setWpEstQty] = useState('');
  const [wpFloor, setWpFloor] = useState('');
  const [wpWeek, setWpWeek] = useState('1');
  const [wpConstraint, setWpConstraint] = useState('');

  // Daily plan form
  const [dpDate, setDpDate] = useState('');
  const [dpDay, setDpDay] = useState('1');
  const [dpQty, setDpQty] = useState('');
  const [dpConstraint, setDpConstraint] = useState('');
  const [dpFloor, setDpFloor] = useState('');
  const [dpNote, setDpNote] = useState('');

  // Supervisor log
  const [logQty, setLogQty] = useState('');
  const [logNote, setLogNote] = useState('');

  // Engineer validate
  const [valConstraint, setValConstraint] = useState('');

  const planEndDate = useMemo(() => {
    if (!planStartDate) return null;
    const sixWeeksOut = addDays(planStartDate, 41);
    return sixWeeksOut.getDay() === 0 ? sixWeeksOut : nextSunday(sixWeeksOut);
  }, [planStartDate]);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found. <Button variant="link" onClick={() => navigate('/')}>Go back</Button></div>;

  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.name || id;

  // Gather all daily plans across all weekly plans for supervisor/engineer views
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

  const handleCreatePlan = () => {
    if (!planName || !planStartDate || !planEndDate || !planCategory || !planContractor) return;
    const plan: SixWeekPlan = {
      id: crypto.randomUUID(), projectId: project.id, name: planName,
      category: planCategory, contractorId: planContractor, tradeActivity: planTrade,
      unit: planUnit, estimatedQuantity: Number(planEstQty) || 0, floorUnits: planFloor,
      startDate: format(planStartDate, 'yyyy-MM-dd'), endDate: format(planEndDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(), weeklyPlans: [],
    };
    addSixWeekPlan(project.id, plan);
    setShowCreatePlan(false);
    setPlanName(''); setPlanCategory(''); setPlanContractor(''); setPlanTrade('');
    setPlanUnit(''); setPlanEstQty(''); setPlanFloor(''); setPlanStartDate(undefined);
  };

  const handleCreateWeekly = (sixWeekPlanId: string) => {
    if (!wpCategory || !wpContractor || !wpTrade) return;
    const existingCount = project.sixWeekPlans.find(s => s.id === sixWeekPlanId)?.weeklyPlans.length || 0;
    const wp: WeeklyPlan = {
      id: crypto.randomUUID(), sixWeekPlanId, weekNumber: Number(wpWeek),
      taskId: `T-${String(existingCount + 1).padStart(3, '0')}`,
      category: wpCategory, contractorId: wpContractor, tradeActivity: wpTrade,
      unit: wpUnit, estimatedQuantity: Number(wpEstQty) || 0, floorUnits: wpFloor,
      constraint: wpConstraint, status: 'pending', assignedToEngineer: false, dailyPlans: [],
    };
    addWeeklyPlan(project.id, sixWeekPlanId, wp);
    setShowCreateWeekly(null);
    setWpCategory(''); setWpContractor(''); setWpTrade(''); setWpUnit('');
    setWpEstQty(''); setWpFloor(''); setWpConstraint(''); setWpWeek('1');
  };

  const handleCreateDaily = () => {
    if (!showCreateDaily || !dpDate || !dpQty) return;
    const daily: DailyPlan = {
      id: crypto.randomUUID(), weeklyPlanId: showCreateDaily.wpId,
      dayNumber: Number(dpDay), date: dpDate,
      plannedQuantity: Number(dpQty), unit: '', constraint: dpConstraint,
      floorUnits: dpFloor, engineerNote: dpNote, status: 'pending',
    };
    addDailyPlan(project.id, showCreateDaily.swpId, showCreateDaily.wpId, daily);
    setDpDate(''); setDpQty(''); setDpConstraint(''); setDpFloor(''); setDpNote(''); setDpDay('1');
    setShowCreateDaily(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
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
                    {swp.name} — {swp.category}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">{swp.startDate} → {swp.endDate}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{swp.tradeActivity} · {getContractorName(swp.contractorId)} · {swp.estimatedQuantity} {swp.unit}</p>
              </CardHeader>
              {expandedPlan === swp.id && (
                <CardContent className="space-y-3">
                  <div className="flex justify-end">
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
                                    <TableHead className="text-xs">Planned Qty</TableHead>
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
                                      <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                      <TableCell className="text-xs">{dp.constraint || '—'}</TableCell>
                                      <TableCell><StatusBadge status={dp.status} /></TableCell>
                                      <TableCell>
                                        {dp.status === 'validated' && (
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
        </div>
      )}

      {/* =================== ENGINEER VIEW =================== */}
      {role === 'engineer' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Assigned Weekly Plans</h2>
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
                                <TableHead className="text-xs font-semibold">Floor</TableHead>
                                <TableHead className="text-xs font-semibold">Constraint</TableHead>
                                <TableHead className="text-xs font-semibold">Note</TableHead>
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
                                  <TableCell className="text-xs">{dp.floorUnits}</TableCell>
                                  <TableCell className="text-xs">{dp.constraint || '—'}</TableCell>
                                  <TableCell className="text-xs">{dp.engineerNote || '—'}</TableCell>
                                  <TableCell><StatusBadge status={dp.status} /></TableCell>
                                  <TableCell className="space-x-1">
                                    {dp.status === 'pending' && (
                                      <Button size="sm" variant="outline" onClick={() => forwardDailyToSupervisor(project.id, wp.swpId, wp.id, dp.id)}>
                                        <Send className="w-3 h-3" /> Forward
                                      </Button>
                                    )}
                                    {dp.status === 'logged' && (
                                      <div className="flex items-center gap-1">
                                        <Select value={valConstraint} onValueChange={setValConstraint}>
                                          <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Constraint" /></SelectTrigger>
                                          <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Button size="sm" onClick={() => { validateDailyTarget(project.id, wp.swpId, wp.id, dp.id, valConstraint); setValConstraint(''); }}>
                                          Validate
                                        </Button>
                                      </div>
                                    )}
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
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
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
                      <TableCell><StatusBadge status={dp.status} /></TableCell>
                      <TableCell>
                        {dp.status === 'forwarded' && (
                          <div className="flex items-center gap-1">
                            <Input type="number" placeholder="Done qty" value={logQty} onChange={e => setLogQty(e.target.value)} className="h-7 w-16 text-xs" />
                            <Input placeholder="Note" value={logNote} onChange={e => setLogNote(e.target.value)} className="h-7 w-20 text-xs" />
                            <Button size="sm" onClick={() => { logDailyTarget(project.id, dp.sixWeekPlanId, dp.weeklyPlanId, dp.id, Number(logQty), true, logNote); setLogQty(''); setLogNote(''); }}>
                              Log
                            </Button>
                          </div>
                        )}
                        {dp.status === 'logged' && <span className="text-xs text-muted-foreground">Done: {dp.completedQuantity} — {dp.supervisorNote}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* =================== DIALOGS =================== */}

      {/* Create 6-Week Plan */}
      <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create 6-Week Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={planCategory} onValueChange={setPlanCategory}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Contractor</Label><Select value={planContractor} onValueChange={setPlanContractor}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Trade Activity</Label><Select value={planTrade} onValueChange={setPlanTrade}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit</Label><Select value={planUnit} onValueChange={setPlanUnit}><SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Est. Quantity</Label><Input type="number" value={planEstQty} onChange={e => setPlanEstQty(e.target.value)} placeholder="500" className="mt-1" /></div>
              <div><Label>Floor Units</Label><Select value={planFloor} onValueChange={setPlanFloor}><SelectTrigger className="mt-1"><SelectValue placeholder="Floor" /></SelectTrigger><SelectContent>{FLOOR_UNITS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <Button onClick={handleCreatePlan} disabled={!planName || !planStartDate || !planCategory || !planContractor} className="w-full">Create 6-Week Plan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sub-Week Plan */}
      <Dialog open={!!showCreateWeekly} onOpenChange={() => setShowCreateWeekly(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Sub-Week Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Week Number</Label><Select value={wpWeek} onValueChange={setWpWeek}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={wpCategory} onValueChange={setWpCategory}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Contractor</Label><Select value={wpContractor} onValueChange={setWpContractor}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Trade Activity</Label><Select value={wpTrade} onValueChange={setWpTrade}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit</Label><Select value={wpUnit} onValueChange={setWpUnit}><SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Est. Quantity</Label><Input type="number" value={wpEstQty} onChange={e => setWpEstQty(e.target.value)} placeholder="100" className="mt-1" /></div>
              <div><Label>Floor Units</Label><Select value={wpFloor} onValueChange={setWpFloor}><SelectTrigger className="mt-1"><SelectValue placeholder="Floor" /></SelectTrigger><SelectContent>{FLOOR_UNITS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Constraint</Label><Select value={wpConstraint} onValueChange={setWpConstraint}><SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger><SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={() => showCreateWeekly && handleCreateWeekly(showCreateWeekly)} disabled={!wpCategory || !wpContractor || !wpTrade} className="w-full">
              <Send className="w-4 h-4" /> Add & Assign to Engineer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Daily Plan (Engineer) */}
      <Dialog open={!!showCreateDaily} onOpenChange={() => setShowCreateDaily(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Daily Plan</DialogTitle></DialogHeader>
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
                <Input type="number" value={dpQty} onChange={e => setDpQty(e.target.value)} placeholder="e.g. 50" className="mt-1" />
              </div>
              <div>
                <Label>Floor</Label>
                <Select value={dpFloor} onValueChange={setDpFloor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Floor" /></SelectTrigger>
                  <SelectContent>{FLOOR_UNITS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Constraint</Label>
              <Select value={dpConstraint} onValueChange={setDpConstraint}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger>
                <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
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
