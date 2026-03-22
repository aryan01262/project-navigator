import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Send, ClipboardCheck, AlertCircle } from 'lucide-react';

export const EngineerPanel = () => {
  const { plan, forwardTarget, validateTarget } = useAppContext();
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [tab, setTab] = useState<'forward' | 'validate'>('forward');
  const [constraintLogs, setConstraintLogs] = useState<Record<string, string>>({});

  if (!plan) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground">No Plan Available</h2>
        <p className="text-muted-foreground">Switch to Admin to create a 6-week plan first.</p>
      </div>
    );
  }

  const today = new Date();
  const dayOfMonth = today.getDate();
  const isEvenDay = dayOfMonth % 2 === 0;

  const allTasks = plan.tasks.filter(t => weekFilter === 'all' || t.weekNumber === Number(weekFilter));
  const forwardable = allTasks.filter(t => t.status === 'pending');
  const logged = allTasks.filter(t => t.status === 'logged');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Engineer Portal</h1>
        <p className="text-muted-foreground">Forward targets & validate supervisor logs</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setTab('forward')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all active:scale-[0.97] ${tab === 'forward' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            <Send className="w-3.5 h-3.5 inline mr-1" /> Forward ({forwardable.length})
          </button>
          <button onClick={() => setTab('validate')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all active:scale-[0.97] ${tab === 'validate' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            <ClipboardCheck className="w-3.5 h-3.5 inline mr-1" /> Validate ({logged.length})
          </button>
        </div>
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="All Weeks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            {[1,2,3,4,5,6].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        Today is day <strong className="text-foreground">{dayOfMonth}</strong> ({isEvenDay ? 'even' : 'odd'}). Forward tasks whose date falls on {isEvenDay ? 'even' : 'odd'} days.
      </div>

      {tab === 'forward' && (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>W</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forwardable.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No pending tasks to forward.</TableCell></TableRow>
              )}
              {forwardable.map(t => {
                const tDay = new Date(t.date).getDate();
                const canForward = (tDay % 2 === 0) === isEvenDay;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell className="text-sm">W{t.weekNumber}</TableCell>
                    <TableCell className="text-sm">{t.contractor}</TableCell>
                    <TableCell className="text-sm font-medium">{t.trade}</TableCell>
                    <TableCell className="text-sm">{t.zone}</TableCell>
                    <TableCell className="text-sm">{t.targetQuantity} {t.unit}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => forwardTarget(t.id)} disabled={!canForward} variant={canForward ? 'default' : 'outline'}>
                        <Send className="w-3.5 h-3.5" /> Fwd
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === 'validate' && (
        <div className="space-y-3">
          {logged.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No supervisor logs to validate.</p>}
          {logged.map(t => (
            <div key={t.id} className="bg-card rounded-lg border p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{t.trade}</span>
                <span className="text-xs text-muted-foreground">· {t.zone} · {t.contractor}</span>
                <StatusBadge status={t.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{t.targetQuantity} {t.unit}</span></div>
                <div><span className="text-muted-foreground">Completed:</span> <span className="font-medium">{t.completedQuantity} {t.unit}</span></div>
                <div><span className="text-muted-foreground">Done:</span> <span className={t.isDone ? 'text-success font-medium' : 'text-destructive font-medium'}>{t.isDone ? 'Yes' : 'No'}</span></div>
                {t.supervisorNote && <div><span className="text-muted-foreground">Note:</span> {t.supervisorNote}</div>}
              </div>
              <Textarea placeholder="Enter constraint log..." value={constraintLogs[t.id] || ''} onChange={e => setConstraintLogs(p => ({ ...p, [t.id]: e.target.value }))} rows={2} className="text-sm" />
              <Button size="sm" onClick={() => { validateTarget(t.id, constraintLogs[t.id] || 'No constraints'); setConstraintLogs(p => { const n = { ...p }; delete n[t.id]; return n; }); }}>
                <ClipboardCheck className="w-4 h-4" /> Validate & Punch Log
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
