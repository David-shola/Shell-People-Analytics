import { Employee } from '../types/employee';

export const SHEET_ID = '1LNRwuyuI2ljZ0ZkQVyKF0tAshPGoCNwzUK5DrGopwKg';
export const SHEET_GID = '876394651';
export const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'Education',
  'BusinessTravel',
  'MonthlyIncome_GBP',
  'Attrition',
] as const;

export function parseCsvRows(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"' && cleanText[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && cleanText[i + 1] === '\n') {
          i++;
        }
        row.push(current.trim());
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function toNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/[£$,%\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseHireYear(hireDate: string): number {
  const match = hireDate.match(/^(\d{4})/);
  if (match) return Number(match[1]);
  const dt = new Date(hireDate);
  return Number.isFinite(dt.getTime()) ? dt.getFullYear() : 2020;
}

export function parseEmployeeCsv(csvText: string): Employee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV data is empty. Verify the sheet contains employee rows or upload a non-empty CSV file.');
  }

  if (/^<!doctype\s+html|^<html/i.test(trimmed)) {
    throw new Error(
      'Google Sheets returned an HTML page instead of CSV data. The sheet may no longer be publicly accessible — check sharing permissions or use Upload CSV.'
    );
  }

  const rows = parseCsvRows(trimmed);
  if (rows.length < 2) {
    throw new Error('No employee records were found after the header row.');
  }

  const headers = rows[0].map((h) => h.trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((h, idx) => headerIndex.set(h, idx));

  const missing = REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col));
  if (missing.length > 0) {
    throw new Error(
      `CSV schema mismatch — missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`
    );
  }

  const get = (row: string[], col: string): string => {
    const idx = headerIndex.get(col);
    return idx !== undefined && idx < row.length ? (row[idx] ?? '').trim() : '';
  };

  const employees: Employee[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const employeeId = get(row, 'EmployeeID');
    if (!employeeId) continue;

    const firstName = get(row, 'FirstName');
    const lastName = get(row, 'LastName');
    const hireDate = get(row, 'HireDate');
    const attritionRaw = get(row, 'Attrition').toLowerCase();

    employees.push({
      EmployeeID: employeeId,
      FirstName: firstName,
      LastName: lastName,
      FullName: `${firstName} ${lastName}`.trim() || employeeId,
      Gender: get(row, 'Gender') || 'Unspecified',
      Age: toNumber(get(row, 'Age'), 0),
      MaritalStatus: get(row, 'MaritalStatus') || 'Unspecified',
      Department: get(row, 'Department') || 'Unassigned',
      JobTitle: get(row, 'JobTitle') || 'Role Unspecified',
      JobLevel: Math.max(1, Math.round(toNumber(get(row, 'JobLevel'), 1))),
      EmploymentType: get(row, 'EmploymentType') || 'Full-Time',
      Location: get(row, 'Location') || 'Unknown',
      HireDate: hireDate,
      HireYear: parseHireYear(hireDate),
      YearsAtCompany: toNumber(get(row, 'YearsAtCompany'), 0),
      YearsInCurrentRole: toNumber(get(row, 'YearsInCurrentRole'), 0),
      YearsSinceLastPromotion: toNumber(get(row, 'YearsSinceLastPromotion'), 0),
      YearsWithCurrManager: toNumber(get(row, 'YearsWithCurrManager'), 0),
      Education: get(row, 'Education') || 'Unspecified',
      DistanceFromHome_km: toNumber(get(row, 'DistanceFromHome_km'), 0),
      BusinessTravel: get(row, 'BusinessTravel') || 'Non-Travel',
      MonthlyIncome_GBP: toNumber(get(row, 'MonthlyIncome_GBP'), 0),
      Attrition: attritionRaw === 'yes' || attritionRaw === 'true' || attritionRaw === '1' ? 'Yes' : 'No',
    });
  }

  if (employees.length === 0) {
    throw new Error('Parsed CSV headers successfully, but zero valid employee records were found.');
  }

  return employees;
}

export async function fetchGoogleSheetCsv(): Promise<Employee[]> {
  let response: Response;
  try {
    response = await fetch(GVIZ_CSV_URL, {
      method: 'GET',
      cache: 'no-store',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      `Unable to reach the Google Sheets gviz endpoint (${detail}). Check your network connection or use Upload CSV as a fallback.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Google Sheets returned HTTP ${response.status} (${response.statusText || 'Error'}). Confirm the sheet is shared publicly or upload a CSV file.`
    );
  }

  const text = await response.text();
  return parseEmployeeCsv(text);
}
