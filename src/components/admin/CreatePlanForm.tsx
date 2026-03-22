import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SixWeekPlan } from '@/types/planner';
import { CalendarDays, Plus } from 'lucide-react';

export const CreatePlanForm = () => {
  const { createPlan } = useAppContext();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  const handleCreate = () => {
    if (!name || !startDate) return;
    const plan: SixWeekPlan = {
      id: crypto.randomUUID(),
      name,
      startDate,
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    createPlan(plan);
  };

  return (
    <div className="max-w-lg">
      <div className="bg-card rounded-lg border p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">New 6-Week Plan</h2>
            <p className="text-sm text-muted-foreground">Create a plan, then add tasks week by week</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="planName">Plan Name</Label>
            <Input id="planName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. US-1.1 | 6 Week Task Planner" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!name || !startDate} className="w-full">
          <Plus className="w-4 h-4" /> Create Plan
        </Button>
      </div>
    </div>
  );
};
