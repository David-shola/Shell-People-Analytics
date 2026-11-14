import React, { useMemo, useState } from 'react';
import { ChartConfiguration } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { EnrichedEmployee, ThemeMode } from '../types/employee';
import {
  formatGBP,
  formatNumber,
  formatPct,
  formatTravelLabel,
  groupByCategory,
} from '../utils/analytics';
import { ChartCard, getChartPalette } from './ChartCard';
import { KpiItem, KpiStrip } from './KpiStrip';

interface DeepDiveTabProps {
  employees: EnrichedEmployee[];
  theme: ThemeMode;
}

type SortKey =
  | 'EmployeeID'
  | 'FullName'
  | 'Department'
  | 'Location'
  | 'JobLevel'
  | 'EmploymentType'
  | 'YearsAtCompany'
  | 'MonthlyIncome_GBP'
  | 'riskScore'
  | 'Attrition';

export const DeepDiveTab: React.FC<DeepDiveTabProps> = ({ employees, theme }) => {
  const palette = useMemo(() => getChartPalette(theme), [theme]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const kpis: KpiItem[] = useMemo(() => {
    const total = employees.length;
    const avgTenure =
      total > 0
        ? employees.reduce((s, e) => s + e.YearsAtCompany, 0) / total
        : 0;
    const femaleCount = employees.filter(
      (e) => e.Gender.toLowerCase() === 'female'
    ).length;
    const femaleShare = total > 0 ? (femaleCount / total) * 100 : 0;

    const nonFtCount = employees.filter(
      (e) => e.EmploymentType !== 'Full-Time'
    ).length;
    const nonFtShare = total > 0 ? (nonFtCount / total) * 100 : 0;

    const avgYearsSincePromo =
      total > 0
        ? employees.reduce((s, e) => s + e.YearsSinceLastPromotion, 0) / total
        : 0;

    const activeEmployees = employees.filter((e) => e.Attrition === 'No');
    const highRiskScope =
      activeEmployees.length > 0 ? activeEmployees : employees;
    const highRiskCount = highRiskScope.filter((e) => e.riskTier === 'High').length;
    const highRiskPct =
      highRiskScope.length > 0 ? (highRiskCount / highRiskScope.length) * 100 : 0;

    return [
      {
        label: 'Average Tenure',
        value: `${avgTenure.toFixed(1)} yrs`,
        subtext: 'Years at Shell UK',
        accent: 'yellow',
      },
      {
        label: 'Female Share',
        value: formatPct(femaleShare),
        subtext: `${formatNumber(femaleCount)} of ${formatNumber(total)} employees`,
        accent: 'neutral',
      },
      {
        label: 'Non-Full-Time Share',
        value: formatPct(nonFtShare),
        subtext: `${formatNumber(nonFtCount)} Part-Time & Contract`,
        accent: 'orange',
      },
      {
        label: 'Years Since Promotion',
        value: `${avgYearsSincePromo.toFixed(1)} yrs`,
        subtext: 'Mean time since grade move',
        accent: 'neutral',
      },
      {
        label: 'High Flight-Risk Count',
        value: formatNumber(highRiskCount),
        subtext: `${formatPct(highRiskPct)} of ${
          activeEmployees.length > 0 ? 'active' : 'filtered'
        } staff (score ≥50)`,
        accent: 'orange',
      },
    ];
  }, [employees]);

  const sharedTooltip = useMemo(
    () => ({
      backgroundColor: palette.tooltipBg,
      titleColor: palette.tooltipText,
      bodyColor: palette.tooltipText,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    }),
    [palette]
  );

  // Age bands with attrition
  const ageBandConfig = useMemo<ChartConfiguration>(() => {
    const bands = [
      { label: '<30', match: (age: number) => age < 30 },
      { label: '30–39', match: (age: number) => age >= 30 && age <= 39 },
      { label: '40–49', match: (age: number) => age >= 40 && age <= 49 },
      { label: '50+', match: (age: number) => age >= 50 },
    ];

    const stats = bands.map((b) => {
      const subset = employees.filter((e) => b.match(e.Age));
      const leavers = subset.filter((e) => e.Attrition === 'Yes').length;
      return {
        label: b.label,
        total: subset.length,
        attrited: leavers,
        rate: subset.length > 0 ? (leavers / subset.length) * 100 : 0,
      };
    });

    return {
      type: 'bar',
      data: {
        labels: stats.map((s) => s.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: stats.map((s) => Number(s.rate.toFixed(1))),
            borderColor: palette.orange,
            backgroundColor: palette.orange,
            yAxisID: 'y1',
            tension: 0.2,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            type: 'bar',
            label: 'Headcount',
            data: stats.map((s) => s.total),
            backgroundColor: palette.yellow,
            yAxisID: 'y',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: palette.textMuted, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const s = stats[idx];
                return s ? `Leavers: ${s.attrited} of ${s.total}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 }, precision: 0 },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { display: false },
            ticks: {
              color: palette.orange,
              font: { size: 11 },
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip]);

  // Tenure bands with attrition
  const tenureBandConfig = useMemo<ChartConfiguration>(() => {
    const bands = [
      { label: '0–2 yrs', match: (y: number) => y <= 2 },
      { label: '3–5 yrs', match: (y: number) => y >= 3 && y <= 5 },
      { label: '6–10 yrs', match: (y: number) => y >= 6 && y <= 10 },
      { label: '11+ yrs', match: (y: number) => y >= 11 },
    ];

    const stats = bands.map((b) => {
      const subset = employees.filter((e) => b.match(e.YearsAtCompany));
      const leavers = subset.filter((e) => e.Attrition === 'Yes').length;
      return {
        label: b.label,
        total: subset.length,
        attrited: leavers,
        rate: subset.length > 0 ? (leavers / subset.length) * 100 : 0,
      };
    });

    return {
      type: 'bar',
      data: {
        labels: stats.map((s) => s.label),
        datasets: [
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: stats.map((s) => Number(s.rate.toFixed(1))),
            borderColor: palette.orange,
            backgroundColor: palette.orange,
            yAxisID: 'y1',
            tension: 0.2,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            type: 'bar',
            label: 'Headcount',
            data: stats.map((s) => s.total),
            backgroundColor: theme === 'dark' ? '#E4E4E7' : '#111113',
            yAxisID: 'y',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: palette.textMuted, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const s = stats[idx];
                return s ? `Leavers: ${s.attrited} of ${s.total}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 }, precision: 0 },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { display: false },
            ticks: {
              color: palette.orange,
              font: { size: 11 },
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  // Income by Job Level
  const incomeByLevelConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => `Level ${e.JobLevel}`).sort(
      (a, b) => a.label.localeCompare(b.label)
    );

    return {
      type: 'bar',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            label: 'Avg Monthly Income (£)',
            data: grouped.map((g) => Math.round(g.avgIncome)),
            backgroundColor: palette.yellow,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              label: (ctx) => {
                const g = grouped[ctx.dataIndex];
                return g
                  ? `Avg: ${formatGBP(g.avgIncome)}/mo · Headcount: ${g.total}`
                  : '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.gridColor },
            ticks: {
              color: palette.textMuted,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip]);

  // Income by Department
  const incomeByDeptConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => e.Department).sort(
      (a, b) => b.avgIncome - a.avgIncome
    );

    return {
      type: 'bar',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            label: 'Avg Monthly Income (£)',
            data: grouped.map((g) => Math.round(g.avgIncome)),
            backgroundColor: theme === 'dark' ? '#E4E4E7' : '#111113',
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              label: (ctx) => {
                const g = grouped[ctx.dataIndex];
                return g
                  ? `Avg: ${formatGBP(g.avgIncome)}/mo (${g.total} staff)`
                  : '';
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: palette.gridColor },
            ticks: {
              color: palette.textMuted,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  // Education breakdown
  const educationConfig = useMemo<ChartConfiguration>(() => {
    const order = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
    const grouped = groupByCategory(employees, (e) => e.Education).sort((a, b) => {
      const ia = order.indexOf(a.label);
      const ib = order.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return {
      type: 'bar',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            label: 'Active',
            data: grouped.map((g) => g.active),
            backgroundColor: palette.yellow,
            borderRadius: 3,
          },
          {
            label: 'Attrited',
            data: grouped.map((g) => g.attrited),
            backgroundColor: palette.orange,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: palette.textMuted, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const g = grouped[items[0]?.dataIndex ?? 0];
                return g ? `Attrition: ${g.attritionRate.toFixed(1)}%` : '';
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 }, precision: 0 },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip]);

  // Business Travel breakdown
  const travelConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) =>
      formatTravelLabel(e.BusinessTravel)
    ).sort((a, b) => b.total - a.total);

    return {
      type: 'bar',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            label: 'Active',
            data: grouped.map((g) => g.active),
            backgroundColor: theme === 'dark' ? '#E4E4E7' : '#111113',
            borderRadius: 3,
          },
          {
            label: 'Attrited',
            data: grouped.map((g) => g.attrited),
            backgroundColor: palette.orange,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: palette.textMuted, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const g = grouped[items[0]?.dataIndex ?? 0];
                return g ? `Attrition: ${g.attritionRate.toFixed(1)}%` : '';
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 }, precision: 0 },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  // Income vs Tenure scatter plot
  const scatterConfig = useMemo<ChartConfiguration>(() => {
    const activePts = employees
      .filter((e) => e.Attrition === 'No')
      .map((e) => ({ x: e.YearsAtCompany, y: e.MonthlyIncome_GBP, emp: e }));
    const attritedPts = employees
      .filter((e) => e.Attrition === 'Yes')
      .map((e) => ({ x: e.YearsAtCompany, y: e.MonthlyIncome_GBP, emp: e }));

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePts,
            backgroundColor:
              theme === 'dark'
                ? 'rgba(255, 200, 0, 0.72)'
                : 'rgba(17, 17, 19, 0.58)',
            borderColor: palette.yellow,
            borderWidth: 1,
            pointRadius: 4.5,
            pointHoverRadius: 6.5,
          },
          {
            label: 'Attrited',
            data: attritedPts,
            backgroundColor: 'rgba(245, 130, 32, 0.88)',
            borderColor: '#C2410C',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: palette.textMuted, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as { emp?: EnrichedEmployee } | undefined;
                const emp = raw?.emp;
                if (!emp) return '';
                return `${emp.FullName} (${emp.EmployeeID}) · L${emp.JobLevel} ${
                  emp.JobTitle
                } · ${emp.YearsAtCompany} yrs · ${formatGBP(emp.MonthlyIncome_GBP)}/mo`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Years at Company',
              color: palette.textMuted,
              font: { size: 11 },
            },
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 } },
          },
          y: {
            title: {
              display: true,
              text: 'Monthly Income (GBP)',
              color: palette.textMuted,
              font: { size: 11 },
            },
            grid: { color: palette.gridColor },
            ticks: {
              color: palette.textMuted,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  // Searchable & sortable table state
  const searchedAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? employees.filter(
          (e) =>
            e.EmployeeID.toLowerCase().includes(q) ||
            e.FullName.toLowerCase().includes(q) ||
            e.JobTitle.toLowerCase().includes(q) ||
            e.Department.toLowerCase().includes(q) ||
            e.Location.toLowerCase().includes(q)
        )
      : employees;

    const factor = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * factor;
      }
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(searchedAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return searchedAndSorted.slice(start, start + pageSize);
  }, [searchedAndSorted, safePage, pageSize]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'MonthlyIncome_GBP' || key === 'riskScore' || key === 'YearsAtCompany' || key === 'JobLevel'
          ? 'desc'
          : 'asc'
      );
    }
    setPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#F58220]" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-5">
      <KpiStrip items={kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount volume paired with cohort attrition percentage"
          config={ageBandConfig}
          heightClass="h-64"
        />
        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile across service-year cohorts"
          config={tenureBandConfig}
          heightClass="h-64"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Average Monthly Income by Job Level"
          subtitle="Mean GBP monthly compensation from Level 1 to Level 5"
          config={incomeByLevelConfig}
          heightClass="h-72"
        />
        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Mean GBP monthly pay ranked across functions"
          config={incomeByDeptConfig}
          heightClass="h-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Education Level & Attrition"
          subtitle="Active vs departed employees by highest qualification"
          config={educationConfig}
          heightClass="h-64"
        />
        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Turnover comparison across travel frequency tiers"
          config={travelConfig}
          heightClass="h-64"
        />
      </div>

      <ChartCard
        title="Monthly Income vs. Company Tenure"
        subtitle="Each point represents an employee; hover for role, level, and pay details"
        config={scatterConfig}
        heightClass="h-80"
        rightNote={`${employees.length} plotted`}
      />

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151518]">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Employee Directory & Risk Register
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              {searchedAndSorted.length} matching records · Click any column header to sort
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, name, role, site..."
                className="min-h-[40px] w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#F58220] focus:outline-none focus:ring-2 focus:ring-[#FFC800]/50 dark:border-neutral-800 dark:bg-[#0e0e11] dark:text-neutral-100"
              />
            </div>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="min-h-[40px] rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-800 focus:border-[#F58220] focus:outline-none dark:border-neutral-800 dark:bg-[#0e0e11] dark:text-neutral-200"
            >
              <option value={15}>15 rows</option>
              <option value={30}>30 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-600 dark:border-neutral-800 dark:bg-[#101013] dark:text-neutral-400">
                {(
                  [
                    ['EmployeeID', 'ID', 'left'],
                    ['FullName', 'Employee', 'left'],
                    ['Department', 'Department', 'left'],
                    ['Location', 'Location', 'left'],
                    ['JobLevel', 'Lvl', 'right'],
                    ['EmploymentType', 'Type', 'left'],
                    ['YearsAtCompany', 'Tenure', 'right'],
                    ['MonthlyIncome_GBP', 'Monthly Pay', 'right'],
                    ['riskScore', 'Risk Score', 'right'],
                    ['Attrition', 'Status', 'left'],
                  ] as [SortKey, string, 'left' | 'right'][]
                ).map(([key, label, align]) => (
                  <th key={key} className="px-3.5 py-2.5 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-neutral-950 dark:hover:text-white ${
                        align === 'right' ? 'flex-row-reverse ml-auto w-full justify-start' : ''
                      }`}
                    >
                      <span>{label}</span>
                      {renderSortIcon(key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400"
                  >
                    No employees match &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                visibleRows.map((emp) => (
                  <tr
                    key={emp.EmployeeID}
                    className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                  >
                    <td className="px-3.5 py-2.5 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {emp.EmployeeID}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-neutral-950 dark:text-neutral-100">
                        {emp.FullName}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {emp.JobTitle}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-300">
                      {emp.Department}
                    </td>
                    <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {emp.Location}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                      L{emp.JobLevel}
                    </td>
                    <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {emp.EmploymentType}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      {emp.YearsAtCompany} yrs
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums font-medium text-neutral-950 dark:text-neutral-100 whitespace-nowrap">
                      {formatGBP(emp.MonthlyIncome_GBP)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          emp.riskTier === 'High'
                            ? 'font-semibold text-[#C2410C] dark:text-[#F58220]'
                            : emp.riskTier === 'Medium'
                            ? 'font-medium text-amber-700 dark:text-[#FFC800]'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }
                      >
                        {emp.riskScore} · {emp.riskTier}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={
                          emp.Attrition === 'Yes'
                            ? 'font-medium text-[#C2410C] dark:text-[#F58220]'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }
                      >
                        {emp.Attrition === 'Yes' ? 'Attrited' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500 sm:flex-row dark:border-neutral-800 dark:text-neutral-400">
          <div className="tabular-nums">
            Page {safePage} of {totalPages} · Showing {visibleRows.length} of{' '}
            {searchedAndSorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[36px] rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-[#1a1a1f] dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[36px] rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-[#1a1a1f] dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
