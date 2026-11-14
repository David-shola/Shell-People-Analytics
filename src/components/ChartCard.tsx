import React, { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { ThemeMode } from '../types/employee';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  ScatterController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

export interface ChartPalette {
  yellow: string;
  orange: string;
  ink: string;
  mutedBar: string;
  neutralSeries: string[];
  textPrimary: string;
  textMuted: string;
  gridColor: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  surfaceBg: string;
}

export function getChartPalette(theme: ThemeMode): ChartPalette {
  if (theme === 'dark') {
    return {
      yellow: '#FFC800',
      orange: '#F58220',
      ink: '#F5F5F4',
      mutedBar: '#3F3F46',
      neutralSeries: ['#FFC800', '#F58220', '#E4E4E7', '#71717A', '#A1A1AA'],
      textPrimary: '#F5F5F4',
      textMuted: '#A1A1AA',
      gridColor: 'rgba(255, 255, 255, 0.08)',
      tooltipBg: '#18181B',
      tooltipText: '#FAFAFA',
      tooltipBorder: '#27272A',
      surfaceBg: '#151518',
    };
  }
  return {
    yellow: '#FFC800',
    orange: '#F58220',
    ink: '#111113',
    mutedBar: '#D4D4D8',
    neutralSeries: ['#FFC800', '#111113', '#F58220', '#71717A', '#A1A1AA'],
    textPrimary: '#111113',
    textMuted: '#52525B',
    gridColor: 'rgba(17, 17, 19, 0.08)',
    tooltipBg: '#111113',
    tooltipText: '#FFFFFF',
    tooltipBorder: '#27272A',
    surfaceBg: '#FFFFFF',
  };
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  config: ChartConfiguration;
  heightClass?: string;
  className?: string;
  rightNote?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  config,
  heightClass = 'h-64',
  className = '',
  rightNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151518] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </div>
        {rightNote && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {rightNote}
          </span>
        )}
      </div>
      <div className={`relative w-full ${heightClass}`}>
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
};
