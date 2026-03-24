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
import { ArrowLeft, Plus, CalendarIcon, Send, Check } from 'lucide-react';
import { CATEGORIES, TRADE_ACTIVITIES, UNITS, FLOOR_UNITS, CONSTRAINTS } from '@/types/planner';
import type { SixWeekPlan, WeeklyPlan } from '@/types/planner';

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projects, contractors, role,
    addSixWeekPlan, addWeeklyPlan, assignToEngineer,
    forwardToSupervisor, logTarget, validateTarget, confirmTarget,
  } = useAppContext();

  const project = projects.find(p => p.id === projectId);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateWeekly, setShowCreateWeekly] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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

  // Supervisor log form
  const [logQty, setLogQty] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logTaskId, setLogTaskId] = useState<{ pid: string; swpId: string; wpId: string } | null>(null);

  // Engineer validate form
  const [valConstraint, setValConstraint] = useState('');
  const [valTaskId, setValTaskId] = useState<{ pid: string; swpId: string; wpId: string } | null>(null);

  const planEndDate = useMemo(() => {
    if (!planStartDate) return null;
    const sixWeeksOut = addDays(planStartDate, 41);
    return sixWeeksOut.getDay() === 0 ? sixWeeksOut : nextSunday(sixWeeksOut);
  }, [planStartDate]);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found. <Button variant="link" onClick={() => navigate('/')}>Go back</Button></div>;

  const handleCreatePlan = () => {
    if (!planName || !planStartDate || !planEndDate || !planCategory || !planContractor) return;
    const plan: SixWeekPlan = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: planName,
      category: planCategory,
      contractorId: planContractor,
      tradeActivity: planTrade,
      unit: planUnit,
      estimatedQuantity: Number(planEstQty) || 0,
      floorUnits: planFloor,
      startDate: format(planStartDate, 'yyyy-MM-dd'),
      endDate: format(planEndDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
      weeklyPlans: [],
    };
    addSixWeekPlan(project.id, plan);
    setShowCreatePlan(false);
    setPlanName(''); setPlanCategory(''); setPlanContractor(''); setPlanTrade('');
    setPlanUnit(''); setPlanEstQty(''); setPlanFloor(''); setPlanStartDate(undefined);
  };

  let taskCounter = 0;
  const getNextTaskId = () => {
    taskCounter++;
    return `T-${String(taskCounter).padStart(3, '0')}`;
  };

  const handleCreateWeekly = (sixWeekPlanId: string) => {
    if (!wpCategory || !wpContractor || !wpTrade) return;
    const existingCount = project.sixWeekPlans.find(s => s.id === sixWeekPlanId)?.weeklyPlans.length || 0;
    const wp: WeeklyPlan = {
      id: crypto.randomUUID(),
      sixWeekPlanId,
      weekNumber: Number(wpWeek),
      taskId: `T-${String(existingCount + 1).padStart(3, '0')}`,
      category: wpCategory,
      contractorId: wpContractor,
      tradeActivity: wpTrade,
      unit: wpUnit,
      estimatedQuantity: Number(wpEstQty) || 0,
      floorUnits: wpFloor,
      constraint: wpConstraint,
      status: 'pending',
      assignedToEngineer: false,
    };
    addWeeklyPlan(project.id, sixWeekPlanId, wp);
    setShowCreateWeekly(null);
    setWpCategory(''); setWpContractor(''); setWpTrade(''); setWpUnit('');
    setWpEstQty(''); setWpFloor(''); setWpConstraint(''); setWpWeek('1');
  };

  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.name || id;

  // Gather all weekly plans for engineer/supervisor views
  const allWeeklyPlans = project.sixWeekPlans.flatMap(swp =>
    swp.weeklyPlans.map(wp => ({ ...wp, sixWeekPlanId: swp.id, planName: swp.name }))
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
      </div>

      {/* ADMIN VIEW */}
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
                  <span>{swp.name} — {swp.category}</span>
                  <span className="text-xs text-muted-foreground font-normal">{swp.startDate} → {swp.endDate} · {swp.weeklyPlans.length} sub-plans</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{swp.tradeActivity} · {getContractorName(swp.contractorId)} · {swp.estimatedQuantity} {swp.unit} · {swp.floorUnits}</p>
              </CardHeader>
              {expandedPlan === swp.id && (
                <CardContent className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setShowCreateWeekly(swp.id)}><Plus className="w-4 h-4" /> Sub-Week Plan</Button>
                  </div>
                  {swp.weeklyPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sub-week plans yet.</p>
                  ) : (
                    <div className="bg-card rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-primary/5">
                            <TableHead className="font-semibold">Task ID</TableHead>
                            <TableHead className="font-semibold">Week</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold">Trade Activity</TableHead>
                            <TableHead className="font-semibold">Contractor</TableHead>
                            <TableHead className="font-semibold">Qty</TableHead>
                            <TableHead className="font-semibold">Floor</TableHead>
                            <TableHead className="font-semibold">Constraint</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {swp.weeklyPlans.map(wp => (
                            <TableRow key={wp.id}>
                              <TableCell className="font-mono text-xs">{wp.taskId}</TableCell>
                              <TableCell>W{wp.weekNumber}</TableCell>
                              <TableCell>{wp.category}</TableCell>
                              <TableCell className="font-medium">{wp.tradeActivity}</TableCell>
                              <TableCell>{getContractorName(wp.contractorId)}</TableCell>
                              <TableCell>{wp.estimatedQuantity} {wp.unit}</TableCell>
                              <TableCell>{wp.floorUnits}</TableCell>
                              <TableCell className="text-xs">{wp.constraint || '—'}</TableCell>
                              <TableCell><StatusBadge status={wp.status} /></TableCell>
                              <TableCell>
                                {!wp.assignedToEngineer && (
                                  <Button size="sm" variant="outline" onClick={() => assignToEngineer(project.id, swp.id, wp.id)}>
                                    <Send className="w-3 h-3" /> Assign
                                  </Button>
                                )}
                                {wp.status === 'validated' && (
                                  <Button size="sm" onClick={() => confirmTarget(project.id, swp.id, wp.id)}>
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
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ENGINEER VIEW */}
      {role === 'engineer' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Assigned Tasks</h2>
          {allWeeklyPlans.filter(wp => wp.assignedToEngineer).length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks assigned yet.</p>
          ) : (
            <div className="bg-card rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="font-semibold">Task ID</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Trade</TableHead>
                    <TableHead className="font-semibold">Floor</TableHead>
                    <TableHead className="font-semibold">Qty</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allWeeklyPlans.filter(wp => wp.assignedToEngineer).map(wp => (
                    <TableRow key={wp.id}>
                      <TableCell className="font-mono text-xs">{wp.taskId}</TableCell>
                      <TableCell className="text-sm">{wp.planName}</TableCell>
                      <TableCell className="font-medium">{wp.tradeActivity}</TableCell>
                      <TableCell>{wp.floorUnits}</TableCell>
                      <TableCell>{wp.estimatedQuantity} {wp.unit}</TableCell>
                      <TableCell><StatusBadge status={wp.status} /></TableCell>
                      <TableCell className="space-x-1">
                        {wp.status === 'assigned' && (
                          <Button size="sm" variant="outline" onClick={() => forwardToSupervisor(project.id, wp.sixWeekPlanId, wp.id)}>
                            <Send className="w-3 h-3" /> Forward
                          </Button>
                        )}
                        {wp.status === 'logged' && (
                          <div className="flex items-center gap-1">
                            <Select value={valConstraint} onValueChange={setValConstraint}>
                              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Constraint" /></SelectTrigger>
                              <SelectContent>
                                {CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => { validateTarget(project.id, wp.sixWeekPlanId, wp.id, valConstraint); setValConstraint(''); }}>
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
        </div>
      )}

      {/* SUPERVISOR VIEW */}
      {role === 'supervisor' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Daily Task Logs</h2>
          {allWeeklyPlans.filter(wp => wp.status === 'forwarded' || wp.status === 'logged').length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks forwarded yet.</p>
          ) : (
            <div className="bg-card rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="font-semibold">Task ID</TableHead>
                    <TableHead className="font-semibold">Trade</TableHead>
                    <TableHead className="font-semibold">Floor</TableHead>
                    <TableHead className="font-semibold">Target</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allWeeklyPlans.filter(wp => wp.status === 'forwarded' || wp.status === 'logged').map(wp => (
                    <TableRow key={wp.id}>
                      <TableCell className="font-mono text-xs">{wp.taskId}</TableCell>
                      <TableCell className="font-medium">{wp.tradeActivity}</TableCell>
                      <TableCell>{wp.floorUnits}</TableCell>
                      <TableCell>{wp.estimatedQuantity} {wp.unit}</TableCell>
                      <TableCell><StatusBadge status={wp.status} /></TableCell>
                      <TableCell>
                        {wp.status === 'forwarded' && (
                          <div className="flex items-center gap-1">
                            <Input type="number" placeholder="Done qty" value={logQty} onChange={e => setLogQty(e.target.value)} className="h-8 w-20 text-xs" />
                            <Input placeholder="Note" value={logNote} onChange={e => setLogNote(e.target.value)} className="h-8 w-24 text-xs" />
                            <Button size="sm" onClick={() => { logTarget(project.id, wp.sixWeekPlanId, wp.id, Number(logQty), true, logNote); setLogQty(''); setLogNote(''); }}>
                              Log
                            </Button>
                          </div>
                        )}
                        {wp.status === 'logged' && <span className="text-xs text-muted-foreground">Completed: {wp.completedQuantity} — {wp.supervisorNote}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Create 6-Week Plan Dialog */}
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
              <div>
                <Label>Category</Label>
                <Select value={planCategory} onValueChange={setPlanCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contractor</Label>
                <Select value={planContractor} onValueChange={setPlanContractor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Trade Activity</Label>
              <Select value={planTrade} onValueChange={setPlanTrade}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={planUnit} onValueChange={setPlanUnit}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Quantity</Label>
                <Input type="number" value={planEstQty} onChange={e => setPlanEstQty(e.target.value)} placeholder="500" className="mt-1" />
              </div>
              <div>
                <Label>Floor Units</Label>
                <Select value={planFloor} onValueChange={setPlanFloor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Floor" /></SelectTrigger>
                  <SelectContent>{FLOOR_UNITS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreatePlan} disabled={!planName || !planStartDate || !planCategory || !planContractor} className="w-full">
              Create 6-Week Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sub-Week Plan Dialog */}
      <Dialog open={!!showCreateWeekly} onOpenChange={() => setShowCreateWeekly(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Sub-Week Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Week Number</Label>
              <Select value={wpWeek} onValueChange={setWpWeek}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={wpCategory} onValueChange={setWpCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contractor</Label>
                <Select value={wpContractor} onValueChange={setWpContractor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Trade Activity</Label>
              <Select value={wpTrade} onValueChange={setWpTrade}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TRADE_ACTIVITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={wpUnit} onValueChange={setWpUnit}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Quantity</Label>
                <Input type="number" value={wpEstQty} onChange={e => setWpEstQty(e.target.value)} placeholder="100" className="mt-1" />
              </div>
              <div>
                <Label>Floor Units</Label>
                <Select value={wpFloor} onValueChange={setWpFloor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Floor" /></SelectTrigger>
                  <SelectContent>{FLOOR_UNITS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Constraint</Label>
              <Select value={wpConstraint} onValueChange={setWpConstraint}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select constraint" /></SelectTrigger>
                <SelectContent>{CONSTRAINTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => showCreateWeekly && handleCreateWeekly(showCreateWeekly)} disabled={!wpCategory || !wpContractor || !wpTrade} className="w-full">
              <Send className="w-4 h-4" /> Add & Assign to Engineer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetailPage;
