import type { Person, ParseResult } from '../types';

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Parse raw text input into an array of Person objects.
 *
 * Expected format: blocks of 3 lines per person, separated by blank lines.
 * Line 1: name
 * Line 2: parents (space-separated)
 * Line 3: siblings (space-separated)
 */
export function parsePeopleText(text: string): ParseResult {
  // Split into lines, trim each
  const allLines = text.split('\n').map((line) => line.trim());

  // Filter out empty lines to get non-empty lines
  const nonEmptyLines = allLines.filter((line) => line.length > 0);

  if (nonEmptyLines.length === 0) {
    return {
      success: false,
      error: {
        message: 'הטקסט ריק. יש להזין לפחות אדם אחד.',
        remainderLines: [],
      },
    };
  }

  const remainder = nonEmptyLines.length % 3;
  if (remainder !== 0) {
    const lastGroupStart = nonEmptyLines.length - remainder;
    const remainderLines = nonEmptyLines.slice(lastGroupStart);

    let message: string;
    if (remainder === 1) {
      message = `שגיאה בפורמט: נותרה שורה אחת לא שלמה (חסרות שורות הורים ואחים). סך הכל ${nonEmptyLines.length} שורות שאינן ריקות - לא מתחלק ב-3.`;
    } else {
      message = `שגיאה בפורמט: נותרו ${remainder} שורות לא שלמות (חסרה שורת אחים). סך הכל ${nonEmptyLines.length} שורות שאינן ריקות - לא מתחלק ב-3.`;
    }

    return {
      success: false,
      error: {
        message,
        remainderLines,
      },
    };
  }

  const people: Person[] = [];

  for (let i = 0; i < nonEmptyLines.length; i += 3) {
    const name = nonEmptyLines[i];
    const parentsLine = nonEmptyLines[i + 1];
    const siblingsLine = nonEmptyLines[i + 2];

    const parents = parentsLine.split(/\s+/).filter((s) => s.length > 0);
    const siblings = siblingsLine.split(/\s+/).filter((s) => s.length > 0);

    people.push({
      id: generateId(),
      name,
      parents,
      siblings,
    });
  }

  return { success: true, people };
}

/**
 * Compare two arrays of strings ignoring order (case-sensitive since Hebrew)
 */
export function compareArraysUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

/**
 * Compare a single name string (trimming extra spaces)
 */
export function compareNames(userInput: string, correct: string): boolean {
  return userInput.trim().replace(/\s+/g, ' ') === correct.trim().replace(/\s+/g, ' ');
}
