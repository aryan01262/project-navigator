import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ReportsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, role } = useAppContext();

  const project = projects.find(p => p.id === projectId);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  if (role !== 'admin') return <div className="p-8 text-center text-muted-foreground">Reports are only available for Admin.</div>;

  // Gather all daily plans that have been submitted or confirmed
  const allDailyPlans = project.sixWeekPlans.flatMap(swp =>
    swp.weeklyPlans.flatMap(wp =>
      wp.dailyPlans.map(dp => ({
        ...dp,
        tradeActivity: wp.tradeActivity,
        weekUnit: wp.unit,
      }))
    )
  );

  // PPC per day (dayNumber 1-6 = Mon-Sat)
  const ppcData = DAY_NAMES.map((name, i) => {
    const dayNum = i + 1;
    const dayPlans = allDailyPlans.filter(dp => dp.dayNumber === dayNum && dp.completedQuantity !== undefined);
    const totalPlanned = dayPlans.reduce((s, dp) => s + dp.plannedQuantity, 0);
    const totalActual = dayPlans.reduce((s, dp) => s + (dp.completedQuantity || 0), 0);
    const ppc = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
    return { name, ppc, planned: totalPlanned, actual: totalActual };
  });

  // Top constraints
  const constraintCounts: Record<string, number> = {};
  allDailyPlans.forEach(dp => {
    const c = dp.constraint || dp.constraintLog;
    if (c && c !== 'No Constraint') {
      constraintCounts[c] = (constraintCounts[c] || 0) + 1;
    }
  });
  const topConstraints = Object.entries(constraintCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const avgPPC = ppcData.filter(d => d.planned > 0).length > 0
    ? Math.round(ppcData.filter(d => d.planned > 0).reduce((s, d) => s + d.ppc, 0) / ppcData.filter(d => d.planned > 0).length)
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name} — Reports</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average PPC</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">{avgPPC}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Daily Plans</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{allDailyPlans.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Confirmed</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-accent">{allDailyPlans.filter(d => d.status === 'confirmed').length}</p></CardContent>
        </Card>
      </div>

      {/* PPC Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Weekly PPC (Planned vs Actual)</CardTitle>
          <p className="text-sm text-muted-foreground">PPC = (Actual Qty / Planned Qty) × 100%</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ppcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                <YAxis domain={[0, 120]} tickFormatter={v => `${v}%`} className="text-xs fill-muted-foreground" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'ppc') return [`${value}%`, 'PPC'];
                    return [value, name];
                  }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="ppc" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {ppcData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.ppc >= 80 ? 'hsl(var(--primary))' : entry.ppc >= 50 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent inline-block" /> 50-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> &lt;50%</span>
          </div>
        </CardContent>
      </Card>

      {/* Top Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Top Constraint Log</CardTitle>
        </CardHeader>
        <CardContent>
          {topConstraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No constraints logged yet.</p>
          ) : (
            <div className="space-y-2">
              {topConstraints.map(([constraint, count], i) => (
                <div key={constraint} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-medium text-foreground">{constraint}</span>
                  </div>
                  <span className="text-sm font-mono text-primary font-bold">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
