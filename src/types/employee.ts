export type ThemeMode = 'light' | 'dark';
export type TabId = 'overview' | 'deep-dive' | 'insights';

export interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  FullName: string;
  Gender: string;
  Age: number;
  MaritalStatus: string;
  Department: string;
  JobTitle: string;
  JobLevel: number;
  EmploymentType: string;
  Location: string;
  HireDate: string;
  HireYear: number;
  YearsAtCompany: number;
  YearsInCurrentRole: number;
  YearsSinceLastPromotion: number;
  YearsWithCurrManager: number;
  Education: string;
  DistanceFromHome_km: number;
  BusinessTravel: string;
  MonthlyIncome_GBP: number;
  Attrition: 'Yes' | 'No';
}

export type RiskTier = 'High' | 'Medium' | 'Low';

export interface RiskFactor {
  label: string;
  points: number;
}

export interface FlightRiskAssessment {
  score: number;
  tier: RiskTier;
  factors: RiskFactor[];
}

export interface EnrichedEmployee extends Employee {
  riskScore: number;
  riskTier: RiskTier;
  riskFactors: RiskFactor[];
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: 'All' | 'No' | 'Yes';
}

export interface DataProvenance {
  sourceType: 'sheet' | 'csv';
  sourceLabel: string;
  lastSyncedAt: Date;
  totalRecords: number;
}

export interface InsightFinding {
  id: string;
  category: string;
  title: string;
  detail: string;
  metric: string;
  tone: 'neutral' | 'warning' | 'alert' | 'positive';
}

export interface RecommendedAction {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Monitor';
  title: string;
  rationale: string;
  targetScope: string;
}
