import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, nextSunday } from 'date-fns';
import type { SixWeekPlan } from '@/types/planner';
import { CalendarDays, CalendarIcon, Plus } from 'lucide-react';

export const CreatePlanForm = () => {
  const { createPlan } = useAppContext();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date>();

  const endDate = useMemo(() => {
    if (!startDate) return null;
    // End of 6th week = 42 days from start, then find the next Sunday
    const sixWeeksOut = addDays(startDate, 41);
    // If it's already Sunday, use it; otherwise find next Sunday
    if (sixWeeksOut.getDay() === 0) return sixWeeksOut;
    return nextSunday(sixWeeksOut);
  }, [startDate]);

  const handleCreate = () => {
    if (!name || !startDate || !endDate) return;
    const plan: SixWeekPlan = {
      id: crypto.randomUUID(),
      name,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      contractors: [],
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
            <p className="text-sm text-muted-foreground">Select a start date — end date auto-sets to 6th week Sunday</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="planName">Plan Name</Label>
            <Input id="planName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. US-1.1 | 6 Week Task Planner" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>End Date (auto)</Label>
              <Input readOnly value={endDate ? format(endDate, 'PPP') : '—'} className="mt-1 bg-muted/50 cursor-not-allowed" />
            </div>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!name || !startDate} className="w-full">
          <Plus className="w-4 h-4" /> Create Plan
        </Button>
      </div>
    </div>
  );
};
