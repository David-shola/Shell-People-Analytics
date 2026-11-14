import {
  Employee,
  EnrichedEmployee,
  FilterState,
  FlightRiskAssessment,
  InsightFinding,
  RecommendedAction,
  RiskFactor,
} from '../types/employee';

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(value));
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatTravelLabel(raw: string): string {
  switch (raw) {
    case 'Travel_Frequently':
      return 'Frequent Travel';
    case 'Travel_Rarely':
      return 'Rare Travel';
    case 'Non-Travel':
      return 'Non-Travel';
    default:
      return raw.replace(/_/g, ' ');
  }
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function computeJobLevelMedians(employees: Employee[]): Map<number, number> {
  const byLevel = new Map<number, number[]>();
  for (const emp of employees) {
    const arr = byLevel.get(emp.JobLevel) ?? [];
    arr.push(emp.MonthlyIncome_GBP);
    byLevel.set(emp.JobLevel, arr);
  }

  const medians = new Map<number, number>();
  for (const [level, incomes] of byLevel.entries()) {
    medians.set(level, computeMedian(incomes));
  }
  return medians;
}

export const FLIGHT_RISK_RULES = [
  {
    criterion: 'Non-Full-Time Contract',
    rule: 'Part-Time (+25 pts) or Contract (+20 pts)',
    maxPoints: 25,
  },
  {
    criterion: 'Promotion Stagnation',
    rule: '5+ yrs since promotion (+20 pts) or 3–4 yrs (+10 pts)',
    maxPoints: 20,
  },
  {
    criterion: 'Below-Band Compensation',
    rule: '<90% of Job Level median (+20 pts) or 90–99% (+10 pts)',
    maxPoints: 20,
  },
  {
    criterion: 'Early-Tenure Vulnerability',
    rule: '0–3 yrs at Shell (+15 pts) or 4–6 yrs (+8 pts)',
    maxPoints: 15,
  },
  {
    criterion: 'High Travel Burden',
    rule: 'Frequent business travel (+10 pts)',
    maxPoints: 10,
  },
  {
    criterion: 'Long Commute',
    rule: 'Distance from home ≥ 30 km (+10 pts)',
    maxPoints: 10,
  },
] as const;

export function assessFlightRisk(
  emp: Employee,
  levelMedians: Map<number, number>
): FlightRiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 0;

  if (emp.EmploymentType === 'Part-Time') {
    score += 25;
    factors.push({ label: 'Part-Time contract', points: 25 });
  } else if (emp.EmploymentType === 'Contract') {
    score += 20;
    factors.push({ label: 'Fixed-term / Contract', points: 20 });
  }

  if (emp.YearsSinceLastPromotion >= 5) {
    score += 20;
    factors.push({ label: `${emp.YearsSinceLastPromotion} yrs no promotion`, points: 20 });
  } else if (emp.YearsSinceLastPromotion >= 3) {
    score += 10;
    factors.push({ label: `${emp.YearsSinceLastPromotion} yrs since promotion`, points: 10 });
  }

  const levelMedian = levelMedians.get(emp.JobLevel) ?? 0;
  if (levelMedian > 0) {
    const ratio = emp.MonthlyIncome_GBP / levelMedian;
    if (ratio < 0.9) {
      score += 20;
      factors.push({ label: 'Pay >10% below level median', points: 20 });
    } else if (ratio < 1.0) {
      score += 10;
      factors.push({ label: 'Pay below level median', points: 10 });
    }
  }

  if (emp.YearsAtCompany <= 3) {
    score += 15;
    factors.push({ label: `Early tenure (${emp.YearsAtCompany} yrs)`, points: 15 });
  } else if (emp.YearsAtCompany <= 6) {
    score += 8;
    factors.push({ label: `Mid-early tenure (${emp.YearsAtCompany} yrs)`, points: 8 });
  }

  if (emp.BusinessTravel === 'Travel_Frequently') {
    score += 10;
    factors.push({ label: 'Frequent travel', points: 10 });
  }

  if (emp.DistanceFromHome_km >= 30) {
    score += 10;
    factors.push({ label: `${emp.DistanceFromHome_km} km commute`, points: 10 });
  }

  const tier = score >= 50 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  return { score, tier, factors };
}

export function enrichEmployees(employees: Employee[]): EnrichedEmployee[] {
  const levelMedians = computeJobLevelMedians(employees);
  return employees.map((emp) => {
    const risk = assessFlightRisk(emp, levelMedians);
    return {
      ...emp,
      riskScore: risk.score,
      riskTier: risk.tier,
      riskFactors: risk.factors,
    };
  });
}

export function filterEmployees(
  employees: EnrichedEmployee[],
  filters: FilterState
): EnrichedEmployee[] {
  return employees.filter((e) => {
    if (filters.department !== 'All' && e.Department !== filters.department) return false;
    if (filters.location !== 'All' && e.Location !== filters.location) return false;
    if (filters.employmentType !== 'All' && e.EmploymentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && e.Gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && e.Attrition !== filters.attrition) return false;
    return true;
  });
}

export interface GroupStats {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupByCategory(
  employees: EnrichedEmployee[],
  keyFn: (e: EnrichedEmployee) => string
): GroupStats[] {
  const map = new Map<
    string,
    { total: number; active: number; attrited: number; incomeSum: number }
  >();

  for (const e of employees) {
    const k = keyFn(e);
    const cur = map.get(k) ?? { total: 0, active: 0, attrited: 0, incomeSum: 0 };
    cur.total += 1;
    if (e.Attrition === 'Yes') cur.attrited += 1;
    else cur.active += 1;
    cur.incomeSum += e.MonthlyIncome_GBP;
    map.set(k, cur);
  }

  return Array.from(map.entries()).map(([label, v]) => ({
    label,
    total: v.total,
    active: v.active,
    attrited: v.attrited,
    attritionRate: v.total > 0 ? (v.attrited / v.total) * 100 : 0,
    avgIncome: v.total > 0 ? v.incomeSum / v.total : 0,
  }));
}

export function generateInsights(
  filtered: EnrichedEmployee[],
  allEmployees: EnrichedEmployee[]
): InsightFinding[] {
  if (filtered.length === 0) return [];

  const findings: InsightFinding[] = [];

  const total = filtered.length;
  const leavers = filtered.filter((e) => e.Attrition === 'Yes');
  const active = filtered.filter((e) => e.Attrition === 'No');
  const attrRate = (leavers.length / total) * 100;
  const baseAttrRate =
    allEmployees.length > 0
      ? (allEmployees.filter((e) => e.Attrition === 'Yes').length / allEmployees.length) * 100
      : attrRate;
  const diffFromBase = attrRate - baseAttrRate;

  findings.push({
    id: 'overall-attrition',
    category: 'Workforce Attrition',
    title:
      attrRate >= 22
        ? 'Elevated attrition rate in current slice'
        : attrRate <= 14
        ? 'Strong workforce retention relative to UK baseline'
        : 'Attrition tracking near UK workforce baseline',
    detail: `${leavers.length} of ${total} employees in this view have departed (${formatPct(
      attrRate
    )}), which is ${
      Math.abs(diffFromBase) < 0.2
        ? 'in line with'
        : diffFromBase > 0
        ? `${diffFromBase.toFixed(1)} pp above`
        : `${Math.abs(diffFromBase).toFixed(1)} pp below`
    } the overall ${formatPct(baseAttrRate)} UK benchmark.`,
    metric: formatPct(attrRate),
    tone: attrRate >= 22 ? 'alert' : attrRate >= 16 ? 'warning' : 'positive',
  });

  // Employment Type finding
  const ft = filtered.filter((e) => e.EmploymentType === 'Full-Time');
  const nonFt = filtered.filter((e) => e.EmploymentType !== 'Full-Time');
  if (ft.length > 0 && nonFt.length > 0) {
    const ftAttr = (ft.filter((e) => e.Attrition === 'Yes').length / ft.length) * 100;
    const nonFtAttr = (nonFt.filter((e) => e.Attrition === 'Yes').length / nonFt.length) * 100;
    const gap = nonFtAttr - ftAttr;
    findings.push({
      id: 'contract-gap',
      category: 'Contract Stability',
      title:
        gap > 5
          ? 'Non-full-time staff show sharply higher turnover'
          : 'Turnover balanced across contract types',
      detail: `Part-Time and Contract employees (${nonFt.length} staff) have an attrition rate of ${formatPct(
        nonFtAttr
      )} compared with ${formatPct(ftAttr)} for Full-Time employees (${ft.length} staff).`,
      metric: `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pp`,
      tone: gap > 10 ? 'alert' : gap > 4 ? 'warning' : 'neutral',
    });
  }

  // Department hotspot
  const deptStats = groupByCategory(filtered, (e) => e.Department).filter((d) => d.total >= 3);
  if (deptStats.length >= 2) {
    const sorted = [...deptStats].sort((a, b) => b.attritionRate - a.attritionRate);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    findings.push({
      id: 'dept-spread',
      category: 'Department Spread',
      title: `${highest.label} leads departmental attrition`,
      detail: `${highest.label} records ${formatPct(highest.attritionRate)} attrition (${highest.attrited}/${
        highest.total
      }), whereas ${lowest.label} sits at ${formatPct(lowest.attritionRate)} (${lowest.attrited}/${
        lowest.total
      }).`,
      metric: formatPct(highest.attritionRate),
      tone: highest.attritionRate >= 25 ? 'alert' : highest.attritionRate >= 18 ? 'warning' : 'neutral',
    });
  }

  // Location hotspot
  const locStats = groupByCategory(filtered, (e) => e.Location).filter((l) => l.total >= 3);
  if (locStats.length >= 2) {
    const sortedLoc = [...locStats].sort((a, b) => b.attritionRate - a.attritionRate);
    const topLoc = sortedLoc[0];
    const lowLoc = sortedLoc[sortedLoc.length - 1];
    findings.push({
      id: 'location-spread',
      category: 'UK Site Variance',
      title: `${topLoc.label} experiences highest site turnover`,
      detail: `Across UK hubs with at least 3 records, ${topLoc.label} averages ${formatPct(
        topLoc.attritionRate
      )} attrition (${topLoc.attrited} leavers) vs ${formatPct(lowLoc.attritionRate)} in ${lowLoc.label}.`,
      metric: topLoc.label,
      tone: topLoc.attritionRate >= 22 ? 'warning' : 'neutral',
    });
  }

  // Pay & Flight-Risk Concentration
  if (active.length > 0) {
    const highRiskActive = active.filter((e) => e.riskTier === 'High');
    const avgActivePay = active.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / active.length;
    const avgLeaverPay =
      leavers.length > 0
        ? leavers.reduce((s, e) => s + e.MonthlyIncome_GBP, 0) / leavers.length
        : avgActivePay;
    const payGap = avgActivePay - avgLeaverPay;

    findings.push({
      id: 'risk-concentration',
      category: 'Active Retention Exposure',
      title: `${highRiskActive.length} active employees flagged High Flight-Risk`,
      detail: `${formatPct(
        (highRiskActive.length / active.length) * 100
      )} of active staff in this view score ≥50 on the risk model.${
        leavers.length > 0
          ? ` Historical leavers earned ${formatGBP(avgLeaverPay)}/mo on average (${
              payGap >= 0 ? `${formatGBP(payGap)} less than` : `${formatGBP(Math.abs(payGap))} more than`
            } active peers).`
          : ''
      }`,
      metric: `${highRiskActive.length} active`,
      tone: highRiskActive.length > 0 ? 'warning' : 'positive',
    });
  }

  // Promotion stagnation
  const stalledActive = active.filter((e) => e.YearsSinceLastPromotion >= 5);
  if (active.length > 0) {
    const stalledPct = (stalledActive.length / active.length) * 100;
    findings.push({
      id: 'promotion-stagnation',
      category: 'Career Progression',
      title: `${formatPct(stalledPct)} of active workforce 5+ years without promotion`,
      detail: `${stalledActive.length} active employees have spent at least 5 years in grade without progression, increasing vulnerability when paired with below-median pay.`,
      metric: `${stalledActive.length} staff`,
      tone: stalledPct >= 30 ? 'warning' : 'neutral',
    });
  }

  return findings;
}

export function generateRecommendations(filtered: EnrichedEmployee[]): RecommendedAction[] {
  if (filtered.length === 0) return [];

  const actions: RecommendedAction[] = [];
  const active = filtered.filter((e) => e.Attrition === 'No');
  const highRiskActive = active.filter((e) => e.riskTier === 'High');

  // 1. Contract & Part-Time conversion review
  const nonFt = filtered.filter((e) => e.EmploymentType !== 'Full-Time');
  const ft = filtered.filter((e) => e.EmploymentType === 'Full-Time');
  if (nonFt.length > 0) {
    const nonFtAttr = (nonFt.filter((e) => e.Attrition === 'Yes').length / nonFt.length) * 100;
    const ftAttr = ft.length > 0 ? (ft.filter((e) => e.Attrition === 'Yes').length / ft.length) * 100 : 0;
    const activeNonFt = active.filter((e) => e.EmploymentType !== 'Full-Time').length;
    if (nonFtAttr > ftAttr + 5 || activeNonFt > 0) {
      actions.push({
        id: 'action-contract',
        priority: nonFtAttr >= 28 ? 'Immediate' : 'Near-Term',
        title: 'Audit Part-Time and Contract retention pathways',
        rationale: `Non-full-time attrition stands at ${formatPct(
          nonFtAttr
        )}. Conduct stay interviews with the ${activeNonFt} active Part-Time/Contract staff in this slice and evaluate permanent conversion or pro-rata benefit parity.`,
        targetScope: `${activeNonFt} active non-full-time staff`,
      });
    }
  }

  // 2. Targeted High Flight-Risk manager check-ins
  if (highRiskActive.length > 0) {
    const topDepts = groupByCategory(highRiskActive, (e) => e.Department)
      .sort((a, b) => b.total - a.total)
      .slice(0, 2)
      .map((d) => d.label)
      .join(' & ');

    actions.push({
      id: 'action-watchlist',
      priority: 'Immediate',
      title: 'Launch 30-day manager retention check-ins for Watchlist staff',
      rationale: `${highRiskActive.length} active employees score ≥50 on the flight-risk model, concentrated in ${
        topDepts || 'selected departments'
      }. Prioritize 1:1 career and workload reviews before annual cycle lock-in.`,
      targetScope: `${highRiskActive.length} High-Risk employees`,
    });
  }

  // 3. Pay equity & below-median calibration
  const belowMedianActive = active.filter((e) =>
    e.riskFactors.some((f) => f.label.includes('below level median'))
  );
  if (belowMedianActive.length > 0) {
    actions.push({
      id: 'action-comp',
      priority: belowMedianActive.length >= active.length * 0.35 ? 'Immediate' : 'Near-Term',
      title: 'Calibrate below-median compensation at Job Levels 1–3',
      rationale: `${belowMedianActive.length} active employees (${formatPct(
        (belowMedianActive.length / Math.max(1, active.length)) * 100
      )}) earn below their Job Level peer median. Target off-cycle market adjustments for high-risk performers first.`,
      targetScope: `${belowMedianActive.length} below-median staff`,
    });
  }

  // 4. Promotion & Mobility sprint
  const stalled = active.filter((e) => e.YearsSinceLastPromotion >= 5);
  if (stalled.length > 0) {
    actions.push({
      id: 'action-mobility',
      priority: 'Near-Term',
      title: 'Open internal mobility & grade-progression reviews',
      rationale: `${stalled.length} active employees have gone 5+ years without a promotion. Pair talent calibration with UK cross-site project rotations or lateral skill tracks.`,
      targetScope: `${stalled.length} stalled progression records`,
    });
  }

  // 5. Site-level engagement if travel/location burden is present
  const freqTravelActive = active.filter((e) => e.BusinessTravel === 'Travel_Frequently');
  if (freqTravelActive.length > 0) {
    actions.push({
      id: 'action-travel',
      priority: 'Monitor',
      title: 'Review travel cadence & hybrid flexibility at high-commute hubs',
      rationale: `${freqTravelActive.length} active employees travel frequently. Assess rotational scheduling and remote-day allowances for staff commuting ≥30 km.`,
      targetScope: `${freqTravelActive.length} frequent travellers`,
    });
  }

  return actions.slice(0, 4);
}
