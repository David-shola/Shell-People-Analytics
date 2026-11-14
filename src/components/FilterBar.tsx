import React from 'react';
import { RotateCcw } from 'lucide-react';
import { FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  totalCount: number;
  filteredCount: number;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  options,
  totalCount,
  filteredCount,
  onChange,
  onReset,
}) => {
  const hasActiveFilter =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'w-full min-h-[40px] rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-900 transition-colors focus:border-[#F58220] focus:outline-none focus:ring-2 focus:ring-[#FFC800]/50 dark:border-neutral-800 dark:bg-[#0e0e11] dark:text-neutral-100';

  return (
    <section
      aria-label="Workforce Filters"
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#151518]"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Department
          </span>
          <select
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Departments ({options.departments.length})</option>
            {options.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Location
          </span>
          <select
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className={selectClass}
          >
            <option value="All">All UK Sites ({options.locations.length})</option>
            {options.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Employment Type
          </span>
          <select
            value={filters.employmentType}
            onChange={(e) => onChange({ ...filters, employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Gender
          </span>
          <select
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Attrition
          </span>
          <select
            value={filters.attrition}
            onChange={(e) =>
              onChange({
                ...filters,
                attrition: e.target.value as FilterState['attrition'],
              })
            }
            className={selectClass}
          >
            <option value="All">All Employees</option>
            <option value="No">Active Only (No)</option>
            <option value="Yes">Attrited Only (Yes)</option>
          </select>
        </label>

        <div className="flex items-end justify-between gap-3 sm:justify-end lg:flex-col lg:items-end lg:justify-end">
          <div className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            Showing{' '}
            <span className="font-mono font-semibold text-neutral-950 dark:text-neutral-100">
              {filteredCount}
            </span>{' '}
            of{' '}
            <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilter}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:bg-[#1a1a1f] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Filters
          </button>
        </div>
      </div>
    </section>
  );
};
