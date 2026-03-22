import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AlertCircle, Check, X } from 'lucide-react';

export const SupervisorPanel = () => {
  const { plan, logTarget } = useAppContext();
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [formData, setFormData] = useState<Record<string, { qty: string; done: boolean; note: string }>>({});

  if (!plan) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground">No Plan Available</h2>
        <p className="text-muted-foreground">Waiting for Admin to create a plan.</p>
      </div>
    );
  }

  const allTasks = plan.tasks.filter(t => weekFilter === 'all' || t.weekNumber === Number(weekFilter));
  const forwarded = allTasks.filter(t => t.status === 'forwarded');
  const logged = allTasks.filter(t => ['logged', 'validated', 'confirmed'].includes(t.status));

  const getForm = (id: string) => formData[id] || { qty: '', done: false, note: '' };
  const setForm = (id: string, d: Partial<{ qty: string; done: boolean; note: string }>) => {
    setFormData(p => ({ ...p, [id]: { ...getForm(id), ...d } }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Supervisor Portal</h1>
        <p className="text-muted-foreground">Log daily task completion and quantities</p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="All Weeks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {[1,2,3,4,5,6].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-3 text-sm">
          <span className="text-muted-foreground">Pending: <strong className="text-secondary">{forwarded.length}</strong></span>
          <span className="text-muted-foreground">Logged: <strong className="text-success">{logged.length}</strong></span>
        </div>
      </div>

      {/* Tasks to review */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Tasks to Review</h3>
        {forwarded.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No tasks forwarded yet.</p>}
        {forwarded.map(t => {
          const form = getForm(t.id);
          return (
            <div key={t.id} className="bg-card rounded-lg border p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{t.trade}</span>
                <span className="text-xs text-muted-foreground">· {t.zone} · {t.contractor}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-xs text-muted-foreground">Target: {t.targetQuantity} {t.unit} · Date: {t.date}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Completed Qty</label>
                  <Input type="number" value={form.qty} onChange={e => setForm(t.id, { qty: e.target.value })} placeholder={`${t.targetQuantity}`} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant={form.done ? 'default' : 'outline'} onClick={() => setForm(t.id, { done: true })} className={form.done ? 'bg-success hover:bg-success/90' : ''}>
                      <Check className="w-4 h-4" /> Done
                    </Button>
                    <Button size="sm" variant={!form.done ? 'destructive' : 'outline'} onClick={() => setForm(t.id, { done: false })}>
                      <X className="w-4 h-4" /> Not Done
                    </Button>
                  </div>
                </div>
              </div>
              <Textarea placeholder="Add note (optional)..." value={form.note} onChange={e => setForm(t.id, { note: e.target.value })} rows={2} className="text-sm" />
              <Button size="sm" onClick={() => logTarget(t.id, Number(form.qty) || 0, form.done, form.note)} disabled={!form.qty}>
                Log Task
              </Button>
            </div>
          );
        })}
      </div>

      {/* Logged tasks */}
      {logged.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Logged Tasks</h3>
          <div className="bg-card rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Trade</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logged.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm font-medium">{t.trade}</TableCell>
                    <TableCell className="text-sm">{t.zone}</TableCell>
                    <TableCell className="text-sm">{t.completedQuantity}/{t.targetQuantity} {t.unit}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
