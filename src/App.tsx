import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Moon,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { FilterBar } from './components/FilterBar';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import {
  DataProvenance,
  EnrichedEmployee,
  FilterState,
  TabId,
  ThemeMode,
} from './types/employee';
import { enrichEmployees, filterEmployees } from './utils/analytics';
import {
  fetchGoogleSheetCsv,
  parseEmployeeCsv,
  SHEET_GID,
} from './utils/csvParser';

const DEFAULT_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

const THEME_STORAGE_KEY = 'shell-people-analytics-theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'light';
}

const ShellMark: React.FC = () => (
  <svg
    viewBox="0 0 36 34"
    className="h-7 w-7 shrink-0"
    aria-hidden="true"
  >
    <path
      d="M18 2C9.4 2 2.5 8.5 2.5 16.5c0 4.6 2.1 8.8 5.6 11.6l3.3 3.4h13.2l3.3-3.4c3.5-2.8 5.6-7 5.6-11.6C33.5 8.5 26.6 2 18 2z"
      fill="#FFC800"
      stroke="#F58220"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M18 5.5v22M11.5 7.2L15.6 27.5M24.5 7.2L20.4 27.5M6.8 11.8L13.5 27.5M29.2 11.8L22.5 27.5"
      stroke="#111113"
      strokeWidth="1.35"
      strokeLinecap="round"
      opacity="0.72"
    />
  </svg>
);

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<DataProvenance | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const syncSheet = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setSyncing(true);
    setErrorMsg(null);

    try {
      const parsed = await fetchGoogleSheetCsv();
      const enriched = enrichEmployees(parsed);
      setEmployees(enriched);
      setProvenance({
        sourceType: 'sheet',
        sourceLabel: `Google Sheet (gid ${SHEET_GID})`,
        lastSyncedAt: new Date(),
        totalRecords: enriched.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to read the Google Sheet CSV endpoint.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void syncSheet(true);
  }, [syncSheet]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    try {
      const text = await file.text();
      const parsed = parseEmployeeCsv(text);
      const enriched = enrichEmployees(parsed);
      setEmployees(enriched);
      setFilters(DEFAULT_FILTERS);
      setProvenance({
        sourceType: 'csv',
        sourceLabel: `CSV upload (${file.name})`,
        lastSyncedAt: new Date(),
        totalRecords: enriched.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to parse the uploaded CSV file.';
      setErrorMsg(`CSV upload error (${file.name}): ${msg}`);
    }
  };

  const filterOptions = useMemo(() => {
    const uniqSorted = (vals: string[]) =>
      Array.from(new Set(vals.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );

    return {
      departments: uniqSorted(employees.map((e) => e.Department)),
      locations: uniqSorted(employees.map((e) => e.Location)),
      employmentTypes: uniqSorted(employees.map((e) => e.EmploymentType)),
      genders: uniqSorted(employees.map((e) => e.Gender)),
    };
  }, [employees]);

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, filters),
    [employees, filters]
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const formatSyncTime = (dt: Date) =>
    dt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-neutral-950 transition-colors duration-150 dark:bg-[#0b0b0d] dark:text-neutral-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload employee CSV file"
      />

      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#111114]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <ShellMark />
            <h1 className="font-display text-lg font-bold tracking-tight text-neutral-950 dark:text-white">
              Shell People Analytics
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => void syncSheet(false)}
              disabled={syncing}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#FFC800] px-3.5 py-2 text-xs font-semibold text-[#111113] transition-colors hover:bg-[#eab700] disabled:cursor-wait disabled:opacity-70 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {syncing ? 'Syncing…' : 'Sync Sheet'}
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload CSV
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
              title={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white p-2 text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100 dark:hover:bg-neutral-800 shrink-0"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-[#FFC800]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
        {/* Quiet unboxed provenance line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>Shell UK Workforce Intelligence</span>
            {provenance && (
              <>
                <span aria-hidden="true">·</span>
                <span>Source: {provenance.sourceLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {provenance.totalRecords} records
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Synced {formatSyncTime(provenance.lastSyncedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Clear Error Banner */}
        {errorMsg && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-[#F58220] bg-orange-50 p-4 text-xs text-neutral-900 sm:flex-row sm:items-center sm:justify-between dark:border-[#F58220]/70 dark:bg-[#23150b] dark:text-neutral-100"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#C2410C] dark:text-[#F58220]"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#9A3412] dark:text-[#F58220]">
                  Unable to load sheet data
                </p>
                <p className="mt-0.5 leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {errorMsg}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void syncSheet(false)}
                className="min-h-[38px] rounded-lg bg-[#111113] px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-[#FFC800] dark:text-[#111113] dark:hover:bg-[#eab700] whitespace-nowrap"
              >
                Retry Sync
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                className="min-h-[38px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                Upload CSV
              </button>
            </div>
          </div>
        )}

        {/* Shared Filters ABOVE the three tabs */}
        {employees.length > 0 && (
          <FilterBar
            filters={filters}
            options={filterOptions}
            totalCount={employees.length}
            filteredCount={filteredEmployees.length}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        )}

        {/* Three Tabs */}
        <div
          role="tablist"
          aria-label="Analytics Views"
          className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-200 pb-0 dark:border-neutral-800"
        >
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'deep-dive', label: 'Deep Dive' },
              { id: 'insights', label: 'Insights' },
            ] as { id: TabId; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[42px] px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-neutral-950 dark:text-[#FFC800]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#F58220] dark:bg-[#FFC800]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content States: Loading / No Data / Empty Filter Match / Active Tab */}
        {loading && employees.length === 0 ? (
          <div className="space-y-4" aria-label="Loading workforce dataset">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151518]"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="h-80 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151518]" />
              <div className="h-80 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151518]" />
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#151518]">
            <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
              No workforce dataset loaded
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Sync with the public Shell UK Google Sheet or upload a local CSV file containing the employee schema to inspect workforce metrics.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => void syncSheet(false)}
                className="min-h-[40px] rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] hover:bg-[#eab700]"
              >
                Sync Sheet
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                className="min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#18181c] dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Upload CSV
              </button>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-[#151518]">
            <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
              No employees match the selected filters
            </h2>
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Adjust one or more dropdowns above or reset filters to restore all {employees.length} records.
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 min-h-[40px] rounded-lg bg-[#FFC800] px-4 py-2 text-xs font-semibold text-[#111113] hover:bg-[#eab700]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div role="tabpanel">
            {activeTab === 'overview' && (
              <OverviewTab employees={filteredEmployees} theme={theme} />
            )}
            {activeTab === 'deep-dive' && (
              <DeepDiveTab employees={filteredEmployees} theme={theme} />
            )}
            {activeTab === 'insights' && (
              <InsightsTab
                employees={filteredEmployees}
                allEmployees={employees}
                filters={filters}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
