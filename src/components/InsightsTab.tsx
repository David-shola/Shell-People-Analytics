import React, { useMemo } from 'react';
import { EnrichedEmployee, FilterState } from '../types/employee';
import {
  FLIGHT_RISK_RULES,
  formatGBP,
  generateInsights,
  generateRecommendations,
} from '../utils/analytics';

interface InsightsTabProps {
  employees: EnrichedEmployee[];
  allEmployees: EnrichedEmployee[];
  filters: FilterState;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({
  employees,
  allEmployees,
  filters,
}) => {
  const findings = useMemo(
    () => generateInsights(employees, allEmployees),
    [employees, allEmployees]
  );

  const recommendations = useMemo(
    () => generateRecommendations(employees),
    [employees]
  );

  // Top-10 flight-risk watchlist prioritizes Active employees unless Attrition='Yes' is explicitly selected
  const watchlist = useMemo(() => {
    const pool =
      filters.attrition === 'Yes'
        ? employees
        : employees.filter((e) => e.Attrition === 'No');

    return [...pool]
      .sort((a, b) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return a.MonthlyIncome_GBP - b.MonthlyIncome_GBP;
      })
      .slice(0, 10);
  }, [employees, filters.attrition]);

  const showingAttritedOnly = filters.attrition === 'Yes';

  return (
    <div className="space-y-6">
      {/* Auto-generated findings */}
      <section aria-labelledby="findings-heading">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2
              id="findings-heading"
              className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
            >
              Executive Findings
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Automatically derived from the {employees.length} employee records matching your active filters
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((item) => {
            const metricColor =
              item.tone === 'alert'
                ? 'text-[#C2410C] dark:text-[#F58220]'
                : item.tone === 'warning'
                ? 'text-amber-700 dark:text-[#FFC800]'
                : 'text-neutral-950 dark:text-neutral-100';

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151518]"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {item.category}
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums ${metricColor}`}
                    >
                      {item.metric}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-neutral-950 dark:text-neutral-100">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {item.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Transparent Flight-Risk Rule + Top-10 Watchlist */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Watchlist Table (8 cols) */}
        <section className="rounded-xl border border-neutral-200 bg-white xl:col-span-8 dark:border-neutral-800 dark:bg-[#151518]">
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Top-10 Flight-Risk Watchlist
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {showingAttritedOnly
                ? 'Highest-scoring departed employees in current slice (Attrition = Yes filter active)'
                : 'Highest-scoring active employees ranked by the transparent 100-point retention model'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-600 dark:border-neutral-800 dark:bg-[#101013] dark:text-neutral-400">
                  <th className="px-3.5 py-2.5 font-medium">#</th>
                  <th className="px-3.5 py-2.5 font-medium">Employee</th>
                  <th className="px-3.5 py-2.5 font-medium">Department · Site</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Monthly Pay</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Score</th>
                  <th className="px-3.5 py-2.5 font-medium">Triggered Risk Drivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {watchlist.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400"
                    >
                      No employees available for the watchlist under current filters.
                    </td>
                  </tr>
                ) : (
                  watchlist.map((emp, idx) => (
                    <tr
                      key={emp.EmployeeID}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                    >
                      <td className="px-3.5 py-3 font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-neutral-950 dark:text-neutral-100">
                          {emp.FullName}{' '}
                          <span className="font-mono text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                            · {emp.EmployeeID}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {emp.JobTitle} · L{emp.JobLevel} · {emp.EmploymentType}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-neutral-700 dark:text-neutral-300">
                        <div>{emp.Department}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {emp.Location}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {formatGBP(emp.MonthlyIncome_GBP)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={
                            emp.riskTier === 'High'
                              ? 'font-semibold text-[#C2410C] dark:text-[#F58220]'
                              : emp.riskTier === 'Medium'
                              ? 'font-semibold text-amber-700 dark:text-[#FFC800]'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }
                        >
                          {emp.riskScore}/100 · {emp.riskTier}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {emp.riskFactors.length > 0
                          ? emp.riskFactors
                              .map((f) => `${f.label} (+${f.points})`)
                              .join(' · ')
                          : 'No elevated risk triggers'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transparent Scoring Rule Breakdown (4 cols) */}
        <aside className="rounded-xl border border-neutral-200 bg-white p-5 xl:col-span-4 dark:border-neutral-800 dark:bg-[#151518]">
          <h2 className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Transparent Flight-Risk Scoring Rule
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Every employee is scored deterministically from 0 to 100 using six observable HR indicators. Compensation is benchmarked against the company-wide median for each Job Level.
          </p>

          <dl className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 text-xs dark:divide-neutral-800 dark:border-neutral-800">
            {FLIGHT_RISK_RULES.map((item) => (
              <div
                key={item.criterion}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div>
                  <dt className="font-medium text-neutral-900 dark:text-neutral-100">
                    {item.criterion}
                  </dt>
                  <dd className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.rule}
                  </dd>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-neutral-900 dark:text-[#FFC800]">
                  +{item.maxPoints}
                </span>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t border-neutral-200 pt-3 text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <span className="font-semibold text-[#C2410C] dark:text-[#F58220]">
              High Risk: 50–100
            </span>{' '}
            ·{' '}
            <span className="font-semibold text-amber-700 dark:text-[#FFC800]">
              Medium: 30–49
            </span>{' '}
            · <span>Low: 0–29</span>
          </div>
        </aside>
      </div>

      {/* Recommended Actions */}
      <section aria-labelledby="actions-heading">
        <div className="mb-3">
          <h2
            id="actions-heading"
            className="text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
          >
            Recommended HR Actions
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Prioritized interventions generated from the current workforce segment
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommendations.map((action, index) => {
            const priorityClass =
              action.priority === 'Immediate'
                ? 'text-[#C2410C] dark:text-[#F58220]'
                : action.priority === 'Near-Term'
                ? 'text-amber-700 dark:text-[#FFC800]'
                : 'text-neutral-600 dark:text-neutral-400';

            return (
              <div
                key={action.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151518]"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`font-semibold ${priorityClass}`}>
                    {String(index + 1).padStart(2, '0')}. {action.priority} Priority
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                    {action.targetScope}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                  {action.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {action.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
