import React, { useEffect, useMemo, useState } from 'react';
import { getInvestmentDashboardSummary, getInvestmentReportData, getInvestmentUsers, exportInvestmentCsv, saveInvestmentReport, type InvestmentReportRow } from '../lib/azerInvestment';

export default function InvestmentDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<InvestmentReportRow[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [dashboard, reports, investmentUsers] = await Promise.all([
        getInvestmentDashboardSummary(),
        getInvestmentReportData(),
        getInvestmentUsers(),
      ]);

      if (!mounted) return;
      setSummary(dashboard);
      setChartData(reports);
      setUsers(investmentUsers);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  const chartMax = useMemo(() => Math.max(...chartData.map((row) => row.value), 100), [chartData]);

  const handleExportCsv = async () => {
    const csv = await exportInvestmentCsv(chartData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investment-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addSampleReport = async () => {
    const nextRow = {
      label: `M${chartData.length + 1}`,
      value: 20 + Math.round(Math.random() * 30),
    };
    const nextData = [...chartData, nextRow];
    setChartData(nextData);
    await saveInvestmentReport(nextData);
  };

  if (loading || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d5c46] text-white">
        <div className="text-center">
          <div className="text-3xl font-black">Azeri Investment</div>
          <p className="mt-3 text-sm opacity-80">Loading fast analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1a17] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Azeri investment</p>
            <h1 className="text-4xl font-black mt-2">Investor performance dashboard</h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addSampleReport}
              className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 font-semibold"
            >
              Add sample report
            </button>
            <button
              onClick={handleExportCsv}
              className="bg-emerald-500 hover:bg-emerald-400 rounded-xl px-4 py-2 font-semibold text-[#06170f]"
            >
              Export CSV
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard label="Total users" value={summary.totalUsers.toLocaleString()} tone="emerald" />
          <StatCard label="Active users" value={summary.activeUsers.toLocaleString()} tone="blue" />
          <StatCard label="Total invested" value={`$${summary.totalInvested.toLocaleString()}`} tone="amber" />
          <StatCard label="Monthly growth" value={`${summary.monthlyGrowth}%`} tone="rose" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Portfolio trends</h2>
              <span className="text-xs text-emerald-300">Avg portfolio: ${summary.avgPortfolio.toLocaleString()}</span>
            </div>

            <div className="h-64 flex items-end gap-3">
              {chartData.map((row, index) => (
                <div key={`${row.label}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex justify-center items-end h-52">
                    <div
                      style={{ height: `${(row.value / chartMax) * 100}%` }}
                      className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-500 via-emerald-400 to-amber-300 shadow-lg shadow-emerald-500/30"
                      title={`${row.label}: ${row.value}`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300">{row.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
            <h2 className="text-xl font-bold mb-4">Top investment plans</h2>
            <div className="space-y-4">
              {summary.topPlans.map((plan: any) => (
                <div key={plan.name}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>{plan.name}</span>
                    <span className="font-semibold">{plan.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${plan.value}%`, background: plan.color }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">User investment records</h2>
            <span className="text-xs text-slate-300">{users.length} tracked accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id || user.email} className="border-t border-white/10">
                    <td className="py-3 pr-4">{user.full_name || user.email || 'Unnamed user'}</td>
                    <td className="py-3 pr-4 capitalize">{user.role || 'customer'}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1 text-[10px] uppercase">
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">${Number(user.portfolio_value || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'blue' | 'amber' | 'rose' }) {
  const colorMap = {
    emerald: 'from-emerald-500/30 to-emerald-400/10 text-emerald-200 border-emerald-500/20',
    blue: 'from-sky-500/30 to-sky-400/10 text-sky-200 border-sky-500/20',
    amber: 'from-amber-500/30 to-amber-400/10 text-amber-200 border-amber-500/20',
    rose: 'from-rose-500/30 to-rose-400/10 text-rose-200 border-rose-500/20',
  } as const;

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${colorMap[tone]} p-5`}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-80">{label}</p>
      <div className="text-3xl font-black mt-3">{value}</div>
    </div>
  );
}
