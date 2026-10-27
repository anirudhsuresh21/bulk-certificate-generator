import * as XLSX from 'xlsx';

export interface ParsedSheetData {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  previewRows: Array<Record<string, string>>;
  suggestedMapping: Record<string, string>; // fieldKey -> excelHeader
}

const HEADER_MAP_PATTERNS: Record<string, RegExp[]> = {
  recipient_name: [
    /^name$/i,
    /recipient/i,
    /student.*name/i,
    /participant.*name/i,
    /candidate.*name/i,
    /full.*name/i,
    /^first.*name$/i,
  ],
  event_name: [
    /^event$/i,
    /event.*name/i,
    /workshop/i,
    /course/i,
    /program/i,
    /training/i,
  ],
  issue_date: [
    /^date$/i,
    /issue.*date/i,
    /completion.*date/i,
    /awarded.*date/i,
  ],
  roll_number: [
    /roll.*no/i,
    /roll.*number/i,
    /^id$/i,
    /reg.*no/i,
    /registration.*no/i,
    /student.*id/i,
  ],
  organization_name: [/org/i, /organization/i, /college/i, /school/i, /company/i],
  certificate_title: [/title/i, /certificate.*title/i],
};

export function parseExcelOrCsv(fileBuffer: Buffer): ParsedSheetData {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded spreadsheet contains no data rows.');
  }

  // Extract clean headers
  const headers = Object.keys(rawRows[0]).map((h) => h.trim());

  // Format rows cleanly
  const rows: Array<Record<string, string>> = rawRows.map((row) => {
    const cleanRow: Record<string, string> = {};
    for (const h of headers) {
      let val = row[h];
      if (val instanceof Date) {
        val = val.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else {
        val = String(val ?? '').trim();
      }
      cleanRow[h] = val;
    }
    return cleanRow;
  });

  // Suggest automatic column mappings
  const suggestedMapping: Record<string, string> = {};
  for (const [fieldKey, patterns] of Object.entries(HEADER_MAP_PATTERNS)) {
    for (const header of headers) {
      if (patterns.some((pattern) => pattern.test(header))) {
        suggestedMapping[fieldKey] = header;
        break;
      }
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    previewRows: rows.slice(0, 5),
    suggestedMapping,
  };
}
