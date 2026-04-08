import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { constraintCategories } from '@/types/planner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, AlertTriangle, PieChart as PieChartIcon, Users, TrendingUp, ClipboardList } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  ReferenceLine,
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
  const { projects, role, contractors, tickets } = useAppContext();
  const [ppcTab, setPpcTab] = useState('daily');
  const [outputWeekTab, setOutputWeekTab] = useState<number | 'all'>('all');

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

  // --- PIE CHART: ROV Frequency ---
  const rovCounts: Record<string, number> = {};
  allDailyPlans.forEach(dp => {
    const rov = dp.rov;
    if (rov && rov.trim()) {
      rovCounts[rov] = (rovCounts[rov] || 0) + 1;
    }
  });
  const rovPieData = Object.entries(rovCounts).map(([name, value]) => ({ name, value }));

  // --- PIE CHART: Constraint Status (from tickets) ---
  const projectTickets = tickets.filter(t => t.projectId === projectId);
  const statusCounts: Record<string, number> = {};
  projectTickets.forEach(t => {
    const label = t.status === 'open' ? 'Open' : t.status === 'in-progress' ? 'In Progress' : 'Closed';
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  const constraintStatusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const STATUS_COLORS: Record<string, string> = {
    'Open': 'hsl(var(--destructive))',
    'In Progress': 'hsl(var(--accent))',
    'Closed': 'hsl(var(--primary))',
  };

  const trades = [...new Set(allDailyPlans.map(dp => dp.tradeActivity).filter(Boolean))];
  const outputWeeks = [...new Set(allDailyPlans.map(dp => dp.weekNumber))].sort((a, b) => a - b);

  const filteredDailyPlans = outputWeekTab === 'all'
    ? allDailyPlans
    : allDailyPlans.filter(dp => dp.weekNumber === outputWeekTab);

  const outputPerDayData = DAY_NAMES.map((name, i) => {
    const dayNum = i + 1;
    const dayPlans = filteredDailyPlans.filter(dp => dp.dayNumber === dayNum);
    const entry: Record<string, any> = { name };
    trades.forEach(trade => {
      entry[trade] = dayPlans
        .filter(dp => dp.tradeActivity === trade)
        .reduce((s, dp) => s + (dp.completedQuantity || 0), 0);
    });
    return entry;
  });

  const activePpcData = ppcTab === 'daily' ? dailyPpcData : weeklyPpcData;
  const avgPPC = activePpcData.filter(d => d.planned > 0).length > 0
    ? Math.round(activePpcData.filter(d => d.planned > 0).reduce((s, d) => s + d.ppc, 0) / activePpcData.filter(d => d.planned > 0).length)
    : 0;

    const dailyAvg = (() => {
  const totalActual = dailyPpcData.reduce((sum, item) => sum + item.actual, 0);
  const totalPlanned = dailyPpcData.reduce((sum, item) => sum + item.planned, 0);

  return totalPlanned ? (totalActual / totalPlanned) * 100 : 0;
})();

const weeklyAvg = (() => {
  const totalActual = weeklyPpcData.reduce((sum, item) => sum + item.actual, 0);
  const totalPlanned = weeklyPpcData.reduce((sum, item) => sum + item.planned, 0);

  return totalPlanned ? (totalActual / totalPlanned) * 100 : 0;
})();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{project.name} — Reports</h1>
      </div>

            {/* Trade Activity Index - Horizontal Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Trade Activity Index</CardTitle>
          <p className="text-sm text-muted-foreground">Total quantity per trade activity, colored by unit type</p>
        </CardHeader>
        <CardContent>
          {(() => {
            // Aggregate total estimated quantity per trade activity with unit
            const tradeMap: Record<string, { trade: string; totalQty: number; unit: string }> = {};
            project.sixWeekPlans.forEach(swp => {
              swp.weeklyPlans.forEach(wp => {
                const key = wp.tradeActivity;
                if (!key) return;
                if (!tradeMap[key]) {
                  tradeMap[key] = { trade: key, totalQty: 0, unit: wp.unit || '' };
                }
                tradeMap[key].totalQty += wp.estimatedQuantity || 0;
              });
            });
            const tradeIndexData = Object.values(tradeMap).sort((a, b) => b.totalQty - a.totalQty);

            const getUnitColor = (unit: string) => {
              const u = unit.toUpperCase();
              if (u === 'SQM') return 'hsl(150, 60%, 45%)';
              if (u === 'MT') return 'hsl(210, 70%, 50%)';
              if (u === 'CUBIC') return 'hsl(30, 80%, 55%)';
              return 'hsl(var(--primary))';
            };

            if (tradeIndexData.length === 0) {
              return <p className="text-sm text-muted-foreground">No trade activities found.</p>;
            }

            const chartHeight = Math.max(300, tradeIndexData.length * 40);

            return (
              <>
                <div className="flex gap-4 mb-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(150, 60%, 45%)' }} /> SQM</span>
                  <span className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(210, 70%, 50%)' }} /> MT</span>
                  <span className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(30, 80%, 55%)' }} /> CUBIC</span>
                  <span className="flex items-center gap-1.5 text-xs"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(var(--primary))' }} /> FLAT / Other</span>
                </div>
                <div style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tradeIndexData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis dataKey="trade" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number, _: string, entry: any) => [`${value} ${entry.payload.unit}`, 'Total Qty']} />
                      <Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>
                        {tradeIndexData.map((entry, i) => (
                          <Cell key={i} fill={getUnitColor(entry.unit)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

            {/* Constraint in Trade Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-destructive" /> Constraint in Trade Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Categorized constraints across all trade activities in this project</p>
        </CardHeader>
        <CardContent>
          {(() => {
            // Build table rows: each daily plan with a constraint
            const constraintRows = allDailyPlans.filter(dp => {
              const c = dp.constraint || dp.constraintLog;
              return c && c !== 'No Constraint';
            }).map(dp => {
              const reason = dp.constraint || dp.constraintLog || '';
              const match = constraintCategories.find(cc => cc.reason.toLowerCase() === reason.toLowerCase());
              return {
                tradeActivity: dp.tradeActivity || '-',
                constraint: reason,
                constraintCategory: match ? match.category : 'OTHER',
                date: dp.date || `Day ${dp.dayNumber}`,
                unit: dp.weekUnit || dp.unit || '-',
              };
            });

            // Pie data: group by constraint category
            const catCounts: Record<string, number> = {};
            constraintRows.forEach(r => {
              catCounts[r.constraintCategory] = (catCounts[r.constraintCategory] || 0) + 1;
            });
            const tradeConstraintPieData = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

            if (constraintRows.length === 0) {
              return <p className="text-sm text-muted-foreground">No constraints logged in any trade activity yet.</p>;
            }

            

            return (
              <>
                <div className="h-[320px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tradeConstraintPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                        {tradeConstraintPieData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trade Activity</TableHead>
                        <TableHead>Constraint</TableHead>
                        <TableHead>Constraint Category</TableHead>
                        <TableHead>Date (Day)</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {constraintRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.tradeActivity}</TableCell>
                          <TableCell>{row.constraint}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-muted text-foreground">{row.constraintCategory}</span>
                          </TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
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
                      <ReferenceLine
  y={dailyAvg}
  stroke="hsl(var(--primary))"
  strokeDasharray="4 4"
  strokeWidth={2}
  label={{
    value: `Avg: ${dailyAvg.toFixed(1)}%`,
    position: "right",
    fill: "hsl(var(--primary))",
    fontSize: 12,
  }}
/>
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
                        <ReferenceLine
  y={weeklyAvg}
  stroke="hsl(var(--primary))"
  strokeDasharray="4 4"
  strokeWidth={2}
  label={{
    value: `Avg: ${weeklyAvg.toFixed(1)}%`,
    position: "right",
    fill: "hsl(var(--primary))",
    fontSize: 12,
  }}
/>
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





      {/* Output Per Day */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Output Per Day (Actual Quantity by Trade)</CardTitle>
          <p className="text-sm text-muted-foreground">Daily actual output broken down by trade activity</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button size="sm" variant={outputWeekTab === 'all' ? 'default' : 'outline'} onClick={() => setOutputWeekTab('all')}>All Weeks</Button>
            {outputWeeks.map(w => (
              <Button key={w} size="sm" variant={outputWeekTab === w ? 'default' : 'outline'} onClick={() => setOutputWeekTab(w)}>Week {w}</Button>
            ))}
          </div>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No trade data available yet.</p>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outputPerDayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  {trades.map((trade, i) => (
                    <Bar key={trade} dataKey={trade} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Constraints */}
      <Card className="mb-6">
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

      {/* ROV Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-primary" /> ROV (Reason of Variance) Frequency</CardTitle>
          <p className="text-sm text-muted-foreground">Distribution of reasons logged by supervisors when actual output differs from planned</p>
        </CardHeader>
        <CardContent>
          {rovPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ROV data logged yet.</p>
          ) : (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rovPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {rovPieData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">ROV Breakdown</h4>
                {rovPieData.sort((a, b) => b.value - a.value).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-mono text-primary font-bold">{item.value}×</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Constraint Status from Tickets */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-accent" /> Constraint Status (Tickets)</CardTitle>
          <p className="text-sm text-muted-foreground">Status distribution of shortfall tickets and their associated constraints</p>
        </CardHeader>
        <CardContent>
          {constraintStatusPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets raised yet.</p>
          ) : (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={constraintStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {constraintStatusPieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Tickets by Constraint & Status</h4>
                {projectTickets.map((ticket, i) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[ticket.status === 'open' ? 'Open' : ticket.status === 'in-progress' ? 'In Progress' : 'Closed'] }} />
                      <div>
                        <span className="text-sm font-medium text-foreground">{ticket.constraint || 'No constraint'}</span>
                        <span className="text-xs text-muted-foreground ml-2">({ticket.tradeName})</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ticket.status === 'open' ? 'bg-destructive/10 text-destructive' : ticket.status === 'in-progress' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {ticket.status === 'open' ? 'Open' : ticket.status === 'in-progress' ? 'In Progress' : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>



    </div>
  );
};

export default ReportsPage;
