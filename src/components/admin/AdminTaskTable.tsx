import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Plus, Trash2, Check, Upload } from 'lucide-react';
import type { DailyTarget } from '@/types/planner';

export const AdminTaskTable = () => {
  const { plan, addTask, deleteTask, confirmTarget, createPlan } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [contractorFilter, setContractorFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  // Create task form
  const [formDate, setFormDate] = useState('');
  const [formContractor, setFormContractor] = useState('');
  const [formTrade, setFormTrade] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formWeek, setFormWeek] = useState('1');

  if (!plan) return null;

  const getWeekNumber = (date: string) => {
    const start = new Date(plan.startDate);
    const d = new Date(date);
    const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(6, Math.max(1, Math.floor(diff / 7) + 1));
  };

  const filteredTasks = plan.tasks.filter(t => {
    if (weekFilter !== 'all' && t.weekNumber !== Number(weekFilter)) return false;
    if (contractorFilter && !t.contractor.toLowerCase().includes(contractorFilter.toLowerCase())) return false;
    if (tradeFilter && !t.trade.toLowerCase().includes(tradeFilter.toLowerCase())) return false;
    if (zoneFilter && !t.zone.toLowerCase().includes(zoneFilter.toLowerCase())) return false;
    return true;
  });

  const validatedTasks = plan.tasks.filter(t => t.status === 'validated');

  const handleSave = () => {
    if (!formDate || !formContractor || !formTrade || !formZone) return;
    const task: DailyTarget = {
      id: crypto.randomUUID(),
      weekNumber: Number(formWeek),
      date: formDate,
      contractor: formContractor,
      trade: formTrade,
      zone: formZone,
      description: formDescription || `${formTrade} work in ${formZone}`,
      targetQuantity: Number(formQty) || 0,
      unit: formUnit || 'units',
      status: 'pending',
    };
    addTask(task);
    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    setFormDate(''); setFormContractor(''); setFormTrade(''); setFormZone('');
    setFormDescription(''); setFormQty(''); setFormUnit('');
  };

  const handleReset = () => {
    localStorage.removeItem('sixweek-planner');
    createPlan(null as any);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">Started {new Date(plan.startDate).toLocaleDateString()} · {plan.tasks.length} tasks</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <Trash2 className="w-4 h-4" /> Reset Plan
        </Button>
      </div>

      {/* Validated tasks needing confirmation */}
      {validatedTasks.length > 0 && (
        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">{validatedTasks.length} task(s) awaiting your confirmation</p>
          <div className="space-y-2">
            {validatedTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-card rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium">{t.trade}</span> — {t.zone} · {t.completedQuantity}/{t.targetQuantity} {t.unit}
                  {t.constraintLog && <p className="text-xs text-muted-foreground mt-0.5">Constraint: {t.constraintLog}</p>}
                </div>
                <Button size="sm" onClick={() => confirmTarget(t.id)}>
                  <Check className="w-4 h-4" /> Confirm
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="All Weeks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {[1,2,3,4,5,6].map(w => (
              <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Contractor" value={contractorFilter} onChange={e => setContractorFilter(e.target.value)} className="w-[120px] h-9 text-sm" />
        <Input placeholder="Trade" value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} className="w-[100px] h-9 text-sm" />
        <Input placeholder="Zone" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="w-[100px] h-9 text-sm" />
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No tasks yet. Click "+ Add Task" to create one.
                </TableCell>
              </TableRow>
            )}
            {filteredTasks.map((t, i) => (
              <TableRow key={t.id} className="animate-fade-in">
                <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="text-sm">{t.date}</TableCell>
                <TableCell className="text-sm">W{t.weekNumber}</TableCell>
                <TableCell className="text-sm">{t.contractor}</TableCell>
                <TableCell className="text-sm font-medium">{t.trade}</TableCell>
                <TableCell className="text-sm">{t.zone}</TableCell>
                <TableCell className="text-sm">{t.targetQuantity} {t.unit}</TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Week</Label>
              <Select value={formWeek} onValueChange={setFormWeek}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map(w => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contractor</Label>
              <Input value={formContractor} onChange={e => setFormContractor(e.target.value)} placeholder="Contractor name" className="mt-1" />
            </div>
            <div>
              <Label>Trade</Label>
              <Input value={formTrade} onChange={e => setFormTrade(e.target.value)} placeholder="e.g. Plumbing, Electrical" className="mt-1" />
            </div>
            <div>
              <Label>Zone</Label>
              <Input value={formZone} onChange={e => setFormZone(e.target.value)} placeholder="e.g. Zone A, Block 2" className="mt-1" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Task details" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Qty</Label>
                <Input type="number" value={formQty} onChange={e => setFormQty(e.target.value)} placeholder="100" className="mt-1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="sq.m, pcs" className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!formDate || !formContractor || !formTrade || !formZone} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
