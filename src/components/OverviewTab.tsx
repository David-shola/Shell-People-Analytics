import React, { useMemo } from 'react';
import { ChartConfiguration } from 'chart.js';
import { EnrichedEmployee, ThemeMode } from '../types/employee';
import {
  formatGBP,
  formatNumber,
  formatPct,
  groupByCategory,
} from '../utils/analytics';
import { ChartCard, getChartPalette } from './ChartCard';
import { KpiItem, KpiStrip } from './KpiStrip';

interface OverviewTabProps {
  employees: EnrichedEmployee[];
  theme: ThemeMode;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ employees, theme }) => {
  const palette = useMemo(() => getChartPalette(theme), [theme]);

  const kpis: KpiItem[] = useMemo(() => {
    const total = employees.length;
    const attrited = employees.filter((e) => e.Attrition === 'Yes').length;
    const activeList = employees.filter((e) => e.Attrition === 'No');
    const activeCount = activeList.length;
    const attritionRate = total > 0 ? (attrited / total) * 100 : 0;
    const avgIncome =
      total > 0
        ? employees.reduce((sum, e) => sum + e.MonthlyIncome_GBP, 0) / total
        : 0;
    const monthlyPayroll = employees.reduce((sum, e) => sum + e.MonthlyIncome_GBP, 0);
    const activePayroll = activeList.reduce((sum, e) => sum + e.MonthlyIncome_GBP, 0);

    return [
      {
        label: 'Headcount',
        value: formatNumber(total),
        subtext: `${formatNumber(activeCount)} active · ${formatNumber(attrited)} leavers`,
        accent: 'yellow',
      },
      {
        label: 'Attrition Rate',
        value: formatPct(attritionRate),
        subtext: `${formatNumber(attrited)} departed employees`,
        accent: 'orange',
      },
      {
        label: 'Active Employees',
        value: formatNumber(activeCount),
        subtext: `${formatPct(total > 0 ? (activeCount / total) * 100 : 0)} retention share`,
        accent: 'yellow',
      },
      {
        label: 'Average Income',
        value: formatGBP(avgIncome),
        subtext: 'Monthly gross pay (GBP)',
        accent: 'neutral',
      },
      {
        label: 'Monthly Payroll',
        value: formatGBP(monthlyPayroll),
        subtext: `Active payroll: ${formatGBP(activePayroll)}`,
        accent: 'neutral',
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

  const deptConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => e.Department).sort(
      (a, b) => b.total - a.total
    );

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
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: palette.textMuted,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const g = grouped[idx];
                return g
                  ? `Total: ${g.total} · Attrition: ${g.attritionRate.toFixed(1)}%`
                  : '';
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: palette.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip]);

  const locationConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => e.Location).sort(
      (a, b) => b.total - a.total
    );

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
            labels: {
              color: palette.textMuted,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const g = grouped[idx];
                return g
                  ? `Site headcount: ${g.total} · Attrition: ${g.attritionRate.toFixed(1)}%`
                  : '';
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
            ticks: { color: palette.textMuted, font: { size: 11 } },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  const genderConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => e.Gender).sort(
      (a, b) => b.total - a.total
    );
    const sliceColors = [
      palette.yellow,
      theme === 'dark' ? '#E4E4E7' : '#111113',
      palette.orange,
      '#71717A',
    ];

    return {
      type: 'doughnut',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            data: grouped.map((g) => g.total),
            backgroundColor: grouped.map((_, i) => sliceColors[i % sliceColors.length]),
            borderColor: palette.surfaceBg,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: palette.textPrimary,
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              font: { size: 12 },
            },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              label: (ctx) => {
                const g = grouped[ctx.dataIndex];
                if (!g) return '';
                const share = employees.length ? (g.total / employees.length) * 100 : 0;
                return `${g.label}: ${g.total} (${share.toFixed(1)}%) · Attrition ${g.attritionRate.toFixed(
                  1
                )}%`;
              },
            },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip, theme]);

  const employmentTypeConfig = useMemo<ChartConfiguration>(() => {
    const grouped = groupByCategory(employees, (e) => e.EmploymentType).sort(
      (a, b) => b.total - a.total
    );

    return {
      type: 'bar',
      data: {
        labels: grouped.map((g) => g.label),
        datasets: [
          {
            label: 'Active',
            data: grouped.map((g) => g.active),
            backgroundColor: palette.yellow,
            borderRadius: 4,
          },
          {
            label: 'Attrited',
            data: grouped.map((g) => g.attrited),
            backgroundColor: palette.orange,
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
            labels: {
              color: palette.textMuted,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            ...sharedTooltip,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const g = grouped[idx];
                return g
                  ? `Total: ${g.total} · Attrition: ${g.attritionRate.toFixed(1)}%`
                  : '';
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

  const hiringTrendConfig = useMemo<ChartConfiguration>(() => {
    const byYear = new Map<number, { total: number; attrited: number }>();
    for (const emp of employees) {
      const yr = emp.HireYear;
      const cur = byYear.get(yr) ?? { total: 0, attrited: 0 };
      cur.total += 1;
      if (emp.Attrition === 'Yes') cur.attrited += 1;
      byYear.set(yr, cur);
    }

    const years = Array.from(byYear.keys()).sort((a, b) => a - b);

    return {
      type: 'line',
      data: {
        labels: years.map(String),
        datasets: [
          {
            label: 'Total Hires',
            data: years.map((y) => byYear.get(y)?.total ?? 0),
            borderColor: palette.yellow,
            backgroundColor: 'rgba(255, 200, 0, 0.16)',
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
          {
            label: 'Later Attrited',
            data: years.map((y) => byYear.get(y)?.attrited ?? 0),
            borderColor: palette.orange,
            backgroundColor: 'rgba(245, 130, 32, 0.1)',
            fill: false,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            borderDash: [4, 3],
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
            labels: {
              color: palette.textMuted,
              boxWidth: 12,
              font: { size: 11 },
            },
          },
          tooltip: sharedTooltip,
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.textMuted, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.gridColor },
            ticks: { color: palette.textMuted, font: { size: 11 }, precision: 0 },
          },
        },
      },
    };
  }, [employees, palette, sharedTooltip]);

  return (
    <div className="space-y-5">
      <KpiStrip items={kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs departed employees across Shell UK functions"
          config={deptConfig}
          heightClass="h-80"
        />
        <ChartCard
          title="Headcount & Attrition by UK Location"
          subtitle="Workforce footprint across operational sites and hubs"
          config={locationConfig}
          heightClass="h-80"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Gender Distribution"
          subtitle="Workforce gender split in current filter selection"
          config={genderConfig}
          heightClass="h-64"
        />
        <ChartCard
          title="Employment Type Mix"
          subtitle="Full-Time, Part-Time, and Contract turnover split"
          config={employmentTypeConfig}
          heightClass="h-64"
        />
        <ChartCard
          title="Annual Hiring Trend"
          subtitle="Cohort hiring volume by year and subsequent attrition"
          config={hiringTrendConfig}
          heightClass="h-64"
        />
      </div>
    </div>
  );
};
