import React from 'react';

export interface KpiItem {
  label: string;
  value: string;
  subtext: string;
  accent?: 'yellow' | 'orange' | 'neutral';
}

interface KpiStripProps {
  items: KpiItem[];
}

export const KpiStrip: React.FC<KpiStripProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const indicatorColor =
          item.accent === 'yellow'
            ? 'bg-[#FFC800]'
            : item.accent === 'orange'
            ? 'bg-[#F58220]'
            : 'bg-neutral-900 dark:bg-neutral-200';

        return (
          <div
            key={item.label}
            className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#151518]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {item.label}
              </span>
              <span className={`h-1.5 w-4 rounded-full ${indicatorColor}`} aria-hidden="true" />
            </div>
            <div className="mt-2.5 font-mono text-2xl font-semibold tracking-tight tabular-nums text-neutral-950 dark:text-neutral-50">
              {item.value}
            </div>
            <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              {item.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
