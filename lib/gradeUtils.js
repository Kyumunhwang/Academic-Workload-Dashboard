/**
 * Grade normalization and multi-grade parsing utility for Academic Workload Dashboard
 * Pure JS functions safe for both Client and Server environments.
 */

/**
 * Parse and normalize multiple grades into an array of standardized grade strings (e.g. ['Grade 7', 'Grade 8'])
 */
export function parseGrades(gradeStr) {
  if (!gradeStr) return [];
  const parts = gradeStr.toString().split(/[,/&+]/);
  const grades = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/(?:[M|H|Grade\s*])?(\d+)/i);
    if (match) {
      const g = `Grade ${match[1]}`;
      if (!grades.includes(g)) {
        grades.push(g);
      }
    } else if (trimmed.toLowerCase().includes('all')) {
      const allGrades = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
      allGrades.forEach((g) => {
        if (!grades.includes(g)) grades.push(g);
      });
    }
  }

  // Sort grades numerically (e.g. Grade 6 before Grade 7)
  grades.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  return grades;
}

/**
 * Standardize grade string for consistent filtering (supports comma-separated multi-grades)
 */
export function normalizeGrade(gradeStr) {
  if (!gradeStr) return '';
  const parsed = parseGrades(gradeStr);
  if (parsed.length > 0) {
    return parsed.join(', ');
  }
  return gradeStr.toString().trim();
}

/**
 * Format standard grade string into short code:
 * Grade 6 -> M6, Grade 7 -> M7, Grade 8 -> M8
 * Grade 9 -> H9, Grade 10 -> H10, Grade 11 -> H11, Grade 12 -> H12
 */
export function formatGradeShort(gradeStr) {
  if (!gradeStr) return '';
  const trimmed = gradeStr.toString().trim();
  const num = parseInt(trimmed.replace(/\D/g, ''), 10);
  if (!num) return trimmed;

  if (num >= 6 && num <= 8) {
    return `M${num}`;
  }
  if (num >= 9 && num <= 12) {
    return `H${num}`;
  }
  return `G${num}`;
}

