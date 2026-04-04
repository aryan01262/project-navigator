import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { constraintCategories } from '@/types/planner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, AlertTriangle, PieChart as PieChartIcon, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(350, 65%, 50%)',
  'hsl(180, 50%, 45%)',
  'hsl(60, 70%, 45%)',
];

const ReportsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, role, contractors } = useAppContext();
  const [ppcTab, setPpcTab] = useState('daily');

  const project = projects.find(p => p.id === projectId);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  if (role !== 'admin') return <div className="p-8 text-center text-muted-foreground">Reports are only available for Admin.</div>;

  // Gather all daily plans with parent info
  const allDailyPlans = project.sixWeekPlans.flatMap(swp =>
    swp.weeklyPlans.flatMap(wp =>
      wp.dailyPlans.map(dp => ({
        ...dp,
        tradeActivity: wp.tradeActivity,
        weekUnit: wp.unit,
        weekNumber: wp.weekNumber,
        sixWeekPlanId: swp.id,
        weeklyPlanId: wp.id,
        contractorId: wp.contractorId,
        category: wp.category,
      }))
    )
  );

  // All activities across all 6-week plans
  const allActivities = project.sixWeekPlans.flatMap(swp => swp.activities || []);

  // --- PIE CHART: Category distribution ---
  const categoryCounts: Record<string, number> = {};
  allActivities.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });
  const categoryPieData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

  // --- PIE CHART: Trade distribution ---
  const tradeCounts: Record<string, number> = {};
  allActivities.forEach(a => {
    const t = a.trade || a.tradeActivity;
    if (t) tradeCounts[t] = (tradeCounts[t] || 0) + 1;
  });
  const tradePieData = Object.entries(tradeCounts).map(([name, value]) => ({ name, value }));

  // --- DAILY PPC (existing) ---
  const dailyPpcData = DAY_NAMES.map((name, i) => {
    const dayNum = i + 1;
    const dayPlans = allDailyPlans.filter(dp => dp.dayNumber === dayNum && dp.completedQuantity !== undefined);
    const totalPlanned = dayPlans.reduce((s, dp) => s + dp.plannedQuantity, 0);
    const totalActual = dayPlans.reduce((s, dp) => s + (dp.completedQuantity || 0), 0);
    console.log(totalActual, totalPlanned, dayPlans)
    const ppc = totalPlanned > 0 
  ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) 
  : 0;
    return { name, ppc, planned: totalPlanned, actual: totalActual };
  });

  // --- WEEKLY PPC ---
  const weekNumbers = [...new Set(allDailyPlans.map(dp => dp.weekNumber))].sort((a, b) => a - b);
  const weeklyPpcData = weekNumbers.map(wn => {
    const weekPlans = allDailyPlans.filter(dp => dp.weekNumber === wn && dp.completedQuantity !== undefined);
    const totalPlanned = weekPlans.reduce((s, dp) => s + dp.plannedQuantity, 0);
    const totalActual = weekPlans.reduce((s, dp) => s + (dp.completedQuantity || 0), 0);
    const ppc = totalPlanned > 0
  ? Math.min(100, Math.round((totalActual / totalPlanned) * 100))
  : 0;
    return { name: `Week ${wn}`, ppc, planned: totalPlanned, actual: totalActual };
  });

  // --- CONTRACTOR PERFORMANCE ---
  const contractorPerf: Record<string, { planned: number; actual: number }> = {};
  allDailyPlans.forEach(dp => {
    if (dp.contractorId && dp.completedQuantity !== undefined) {
      if (!contractorPerf[dp.contractorId]) contractorPerf[dp.contractorId] = { planned: 0, actual: 0 };
      contractorPerf[dp.contractorId].planned += dp.plannedQuantity;
      contractorPerf[dp.contractorId].actual += (dp.completedQuantity || 0);
    }
  });
const contractorPerfData = Object.entries(contractorPerf).map(([cId, data]) => {
  const planned = data.planned;
  const actual = data.actual;

  return {
    name: contractors.find(c => c.id === cId)?.name || cId,
    planned,
    actual,
    remaining: Math.max(planned - actual, 0), // 🔥 key part
  };
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

  // --- PIE CHART: Constraint Category distribution ---
  const constraintCatCounts: Record<string, number> = {};
  allDailyPlans.forEach(dp => {
    const reason = dp.constraint || dp.constraintLog;
    if (reason && reason !== 'No Constraint') {
      const match = constraintCategories.find(cc => cc.reason.toLowerCase() === reason.toLowerCase());
      const cat = match ? match.category : 'OTHER';
      constraintCatCounts[cat] = (constraintCatCounts[cat] || 0) + 1;
    }
  });
  const constraintCatPieData = Object.entries(constraintCatCounts).map(([name, value]) => ({ name, value }));

  const activePpcData = ppcTab === 'daily' ? dailyPpcData : weeklyPpcData;
  const avgPPC = activePpcData.filter(d => d.planned > 0).length > 0
    ? Math.round(activePpcData.filter(d => d.planned > 0).reduce((s, d) => s + d.ppc, 0) / activePpcData.filter(d => d.planned > 0).length)
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name} — Reports</h1>
      </div>

      {/* Summary Cards */}
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

      {/* Pie Charts: Category & Trade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-primary" /> Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-accent" /> Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {tradePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tradePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {tradePieData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Constraint Category Pie Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Constraint Category Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">Breakdown of constraints by category across the project</p>
        </CardHeader>
        <CardContent>
          {constraintCatPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No constraints logged yet.</p>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={constraintCatPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {constraintCatPieData.map((_, i) => <Cell key={i} fill={COLORS[(i + 5) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PPC Bar Chart with Daily/Weekly Tabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> PPC Report</CardTitle>
          <p className="text-sm text-muted-foreground">PPC = (Actual Qty / Planned Qty) × 100%</p>
        </CardHeader>
        <CardContent>
          <Tabs value={ppcTab} onValueChange={setPpcTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="daily">Daily PPC</TabsTrigger>
              <TabsTrigger value="weekly">Weekly PPC</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPpcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} className="text-xs fill-muted-foreground" />
                   <Tooltip
  formatter={(value: number, name: string, props: any) => {
    if (name === 'ppc') {
      return [`${value}%`, 'PPC'];
    }
    return [value, name];
  }}
  labelFormatter={(label, payload) => {
    if (payload && payload.length) {
      const data = payload[0].payload;
      return `${label} | Planned: ${data.planned}, Actual: ${data.actual}`;
    }
    return label;
  }}
  contentStyle={{
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px'
  }}
/>
                    <Bar dataKey="ppc" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {dailyPpcData.map((entry, index) => (
                        <Cell key={index} fill={entry.ppc >= 80 ? 'hsl(var(--primary))' : entry.ppc >= 50 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="weekly">
              {weeklyPpcData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No weekly data available yet.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyPpcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} className="text-xs fill-muted-foreground" />
                      <Tooltip
  content={({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 rounded-md border bg-card text-sm">
          <p className="font-medium">{label}</p>
          <p>PPC: {data.ppc}%</p>
          <p>Planned: {data.planned}</p>
          <p>Actual: {data.actual}</p>
        </div>
      );
    }
    return null;
  }}
/>
                      <Bar dataKey="ppc" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {weeklyPpcData.map((entry, index) => (
                          <Cell key={index} fill={entry.ppc >= 80 ? 'hsl(var(--primary))' : entry.ppc >= 50 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <div className="flex gap-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent inline-block" /> 50-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> &lt;50%</span>
          </div>
        </CardContent>
      </Card>

      {/* Contractor Performance Horizontal Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Contractor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {contractorPerfData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contractor data available yet.</p>
          ) : (
           <div style={{ height: Math.max(180, contractorPerfData.length * 40) }}>
 <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={contractorPerfData}
    layout="vertical"
    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
    barCategoryGap={12}
  >
    {/* Grid (clean + minimal) */}
    <CartesianGrid
      strokeDasharray="3 6"
      stroke="hsl(var(--border) / 0.3)"
      vertical={false}
    />

    {/* X Axis */}
    <XAxis
      type="number"
      axisLine={{ stroke: "hsl(var(--border) / 0.6)", strokeWidth: 1 }}
      tickLine={false}
      tick={{
        fontSize: 11,
        fill: "hsl(var(--muted-foreground))",
      }}
    />

    {/* Y Axis */}
    <YAxis
      type="category"
      dataKey="name"
      width={170}
      axisLine={{ stroke: "hsl(var(--border) / 0.6)", strokeWidth: 1 }}
      tickLine={false}
      tick={{
        fontSize: 12,
        fill: "hsl(var(--foreground))",
        fontWeight: 500,
      }}
    />

    {/* Tooltip (modern glass look) */}
    <Tooltip
      cursor={{ fill: "rgba(255,255,255,0.04)" }}
      content={({ active, payload }) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
            <div className="bg-white/90 backdrop-blur-lg shadow-xl border border-gray-200 rounded-xl px-4 py-3 text-xs">
              <p className="font-semibold text-gray-900 mb-2">
                {data.name}
              </p>

              <div className="flex justify-between gap-8 text-gray-600">
                <span>Planned</span>
                <span className="font-semibold text-gray-900">
                  {data.planned}
                </span>
              </div>

              <div className="flex justify-between gap-8 text-gray-600">
                <span>Actual</span>
                <span className="font-semibold text-primary">
                  {data.actual}
                </span>
              </div>
            </div>
          );
        }
        return null;
      }}
    />

    {/* Actual */}
    <Bar
      dataKey="actual"
      stackId="a"
      fill="hsl(var(--primary))"
      radius={[10, 0, 0, 10]}
      maxBarSize={14}
    />

    {/* Remaining */}
    <Bar
      dataKey="remaining"
      stackId="a"
      fill="hsl(var(--muted))"
      radius={[0, 10, 10, 0]}
      maxBarSize={14}
    />
  </BarChart>
</ResponsiveContainer>
</div>
          )}
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
