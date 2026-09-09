import { google } from 'googleapis';

/**
 * In-memory cache structure for responses and Google API client instances
 */
let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes server-side cache TTL

// Singleton Google Auth & Sheets client to eliminate handshake overhead
let cachedSheetsInstance = null;

// Cached sheet metadata to eliminate redundant spreadsheets.get roundtrips
let cachedSheetMeta = {
  title: 'Form Responses 1',
  numericId: 15718209,
};

/**
 * Invalidate in-memory response cache upon write/delete mutations
 */
export function invalidateCache() {
  cachedData = null;
  lastFetchTime = 0;
}

/**
 * Fallback sample mock data to verify UI if no credentials are configured
 */
let sampleMockData = [
  {
    id: 'mock-1',
    rowIndex: 2,
    date: '2026-09-10',
    rawGrade: 'Grade 6',
    grade: 'Grade 6',
    subject: 'Math',
    rawType: 'Homework',
    type: 'Homework',
    description: 'Workbook Chapter 3, exercises 1-15',
  },
  {
    id: 'mock-2',
    rowIndex: 3,
    date: '2026-09-10',
    rawGrade: 'Grade 6',
    grade: 'Grade 6',
    subject: 'Science',
    rawType: 'Project',
    type: 'Project',
    description: 'Solar System model proposal submission',
  },
  {
    id: 'mock-3',
    rowIndex: 4,
    date: '2026-09-10',
    rawGrade: 'Grade 6',
    grade: 'Grade 6',
    subject: 'Korean',
    rawType: 'Exam',
    type: 'Exam',
    description: 'Vocabulary and grammar quiz unit 2',
  },
];

/**
 * Standardize various date formats into standard YYYY-MM-DD
 */
export function formatDateToIso(dateRaw) {
  if (!dateRaw) return '';
  const trimmed = dateRaw.toString().trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format: M/D/YYYY or MM/DD/YYYY (Google Forms output)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback to JS Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}

/**
 * Standardize grade string for consistent filtering
 */
export function normalizeGrade(gradeStr) {
  if (!gradeStr) return '';
  const trimmed = gradeStr.toString().trim();
  const match = trimmed.match(/(?:[M|H|Grade\s*])?(\d+)/i);
  if (match) {
    return `Grade ${match[1]}`;
  }
  return trimmed;
}

/**
 * Standardize event type string
 */
export function normalizeType(typeStr) {
  if (!typeStr) return 'Homework';
  const lower = typeStr.toString().trim().toLowerCase();
  if (lower.includes('exam') || lower.includes('시험')) return 'Exam';
  if (lower.includes('project') || lower.includes('프로젝트')) return 'Project';
  return 'Homework';
}

/**
 * Identify column indexes based on header row names.
 */
function resolveColumnIndices(headerRow) {
  let indices = {
    date: 1,
    grade: 2,
    subject: 3,
    type: 4,
    description: 5,
  };

  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    return indices;
  }

  headerRow.forEach((col, idx) => {
    const headerName = (col || '').toString().trim().toLowerCase();
    if (headerName.includes('date') || headerName.includes('날짜')) {
      indices.date = idx;
    } else if (headerName.includes('grade') || headerName.includes('학년')) {
      indices.grade = idx;
    } else if (headerName.includes('subject') || headerName.includes('과목')) {
      indices.subject = idx;
    } else if (
      headerName.includes('type') ||
      headerName.includes('종류') ||
      headerName.includes('which task') ||
      headerName.includes('task type')
    ) {
      indices.type = idx;
    } else if (
      headerName.includes('description') ||
      headerName.includes('내용') ||
      headerName.includes('explain the task') ||
      headerName.includes('detail')
    ) {
      indices.description = idx;
    }
  });

  return indices;
}

/**
 * Singleton Google Sheets Authenticated Client
 * Eliminates repeated JWT key parsing and TLS handshake on every request
 */
function getSheetsClient() {
  if (cachedSheetsInstance) {
    return cachedSheetsInstance;
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return null;
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  cachedSheetsInstance = { sheets, spreadsheetId };
  return cachedSheetsInstance;
}

/**
 * Optimized fetch:
 * 1. Uses Singleton Google Auth
 * 2. Directly fetches target sheet A:F without intermediate spreadsheets.get call
 * 3. Fallback to metadata discovery only on failure
 */
export async function getCalendarData() {
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const clientInfo = getSheetsClient();
  if (!clientInfo) {
    console.warn('[GoogleSheetsSync] Missing credentials. Using mock fallback.');
    return sampleMockData;
  }

  const { sheets, spreadsheetId } = clientInfo;

  try {
    let targetSheet = cachedSheetMeta.title;
    let sheetNumericId = cachedSheetMeta.numericId;
    let response;

    // Fast-path: Directly fetch compact range A:F using cached sheet title
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${targetSheet}'!A:F`,
      });
    } catch (fastPathErr) {
      console.warn('[GoogleSheetsSync] Fast-path fetch failed, discovering metadata...', fastPathErr.message);
      // Fallback: Discover sheet list only if fast path failed
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetList = meta.data.sheets || [];

      const targetSheetObj = sheetList.find((s) => {
        const title = (s.properties?.title || '').toLowerCase();
        return title.includes('form responses') || title.includes('설문지 응답');
      }) || sheetList[0];

      targetSheet = targetSheetObj?.properties?.title || 'Sheet1';
      sheetNumericId = targetSheetObj?.properties?.sheetId ?? 0;

      // Update cached metadata
      cachedSheetMeta = { title: targetSheet, numericId: sheetNumericId };

      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${targetSheet}'!A:F`,
      });
    }

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.info(`[GoogleSheetsSync] Sheet '${targetSheet}' is empty. Returning sample mock events.`);
      cachedData = sampleMockData;
      lastFetchTime = now;
      return sampleMockData;
    }

    const headerRow = rows[0];
    const colMap = resolveColumnIndices(headerRow);

    const dataRows = rows.slice(1);
    const parsedEvents = dataRows
      .map((row, index) => {
        const rowIndex = index + 2; // Row 1 is header, data starts at Row 2 (1-based index)
        if (!row || !row[colMap.date]) return null;

        const rawDate = (row[colMap.date] || '').trim();
        const isoDate = formatDateToIso(rawDate);
        const rawGrade = (row[colMap.grade] || '').trim();
        const subject = (row[colMap.subject] || '').trim();
        const rawType = (row[colMap.type] || '').trim();
        const description = (row[colMap.description] || '').trim();

        return {
          id: `sheet-event-${rowIndex}-${isoDate}`,
          rowIndex,
          sheetNumericId,
          sheetTitle: targetSheet,
          date: isoDate,
          rawDate,
          rawGrade,
          grade: normalizeGrade(rawGrade),
          subject: subject || 'General',
          rawType,
          type: normalizeType(rawType),
          description,
        };
      })
      .filter((ev) => ev !== null && ev.date);

    const result = parsedEvents.length > 0 ? parsedEvents : sampleMockData;
    cachedData = result;
    lastFetchTime = now;
    return result;
  } catch (error) {
    console.error('[GoogleSheetsSync Error]:', error.message);
    return cachedData || sampleMockData;
  }
}

/**
 * Updates an existing calendar event in Google Sheets
 */
export async function updateCalendarEvent({
  rowIndex,
  sheetTitle,
  date,
  grade,
  subject,
  type,
  description,
  id,
}) {
  const clientInfo = getSheetsClient();

  if (!clientInfo) {
    sampleMockData = sampleMockData.map((item) => {
      if (item.id === id || item.rowIndex === rowIndex) {
        return {
          ...item,
          date: date || item.date,
          grade: grade || item.grade,
          subject: subject || item.subject,
          type: type || item.type,
          description: description !== undefined ? description : item.description,
        };
      }
      return item;
    });
    invalidateCache();
    return { success: true, mode: 'mock' };
  }

  const { sheets, spreadsheetId } = clientInfo;

  try {
    const activeSheetTitle = sheetTitle || cachedSheetMeta.title;

    // Read header row to get dynamic column mapping
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${activeSheetTitle}'!1:1`,
    });
    const headerRow = headerRes.data.values?.[0] || [];
    const colMap = resolveColumnIndices(headerRow);

    // Read compact row values (A:F) to preserve Timestamp in Col A
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${activeSheetTitle}'!A${rowIndex}:F${rowIndex}`,
    });

    const currentRow = rowRes.data.values?.[0] || [];
    while (currentRow.length <= Math.max(colMap.date, colMap.grade, colMap.subject, colMap.type, colMap.description)) {
      currentRow.push('');
    }

    if (date !== undefined) currentRow[colMap.date] = date;
    if (grade !== undefined) currentRow[colMap.grade] = grade;
    if (subject !== undefined) currentRow[colMap.subject] = subject;
    if (type !== undefined) currentRow[colMap.type] = type;
    if (description !== undefined) currentRow[colMap.description] = description;

    // Write updated row values directly to A:F
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${activeSheetTitle}'!A${rowIndex}:F${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [currentRow],
      },
    });

    invalidateCache();
    return { success: true, mode: 'google_sheets' };
  } catch (error) {
    console.error('[updateCalendarEvent Error]:', error);
    throw error;
  }
}

/**
 * Deletes an event row from Google Sheets
 */
export async function deleteCalendarEvent({ rowIndex, sheetNumericId, sheetTitle, id }) {
  const clientInfo = getSheetsClient();

  if (!clientInfo) {
    sampleMockData = sampleMockData.filter((item) => item.id !== id && item.rowIndex !== rowIndex);
    invalidateCache();
    return { success: true, mode: 'mock' };
  }

  const { sheets, spreadsheetId } = clientInfo;

  try {
    const numericId = sheetNumericId ?? cachedSheetMeta.numericId;
    const rowNum = Number(rowIndex);
    if (!rowNum || rowNum < 2) {
      throw new Error(`Invalid row index for deletion: ${rowIndex}`);
    }

    const startIndex = rowNum - 1;
    const endIndex = rowNum;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: numericId,
                dimension: 'ROWS',
                startIndex,
                endIndex,
              },
            },
          },
        ],
      },
    });

    invalidateCache();
    return { success: true, mode: 'google_sheets' };
  } catch (error) {
    console.error('[deleteCalendarEvent Error]:', error);
    throw error;
  }
}
