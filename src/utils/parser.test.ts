import { describe, it, expect } from 'vitest';
import { parsePeopleText, compareArraysUnordered, compareNames } from './parser';

describe('parsePeopleText', () => {
  it('should parse the sample input correctly', () => {
    const input = `זיו
רותם טל
נועה עמית

שלומי
רוני רן
בן`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people).toHaveLength(2);

      expect(result.people[0].name).toBe('זיו');
      expect(result.people[0].parents).toEqual(['רותם', 'טל']);
      expect(result.people[0].siblings).toEqual(['נועה', 'עמית']);

      expect(result.people[1].name).toBe('שלומי');
      expect(result.people[1].parents).toEqual(['רוני', 'רן']);
      expect(result.people[1].siblings).toEqual(['בן']);
    }
  });

  it('should handle multiple blank lines between blocks', () => {
    const input = `אדם
הורה1 הורה2
אח1


חוה
הורה3 הורה4
אח2 אח3`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people).toHaveLength(2);
      expect(result.people[0].name).toBe('אדם');
      expect(result.people[1].name).toBe('חוה');
    }
  });

  it('should trim whitespace from lines', () => {
    const input = `  זיו  
  רותם   טל  
  נועה   עמית  `;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people[0].name).toBe('זיו');
      expect(result.people[0].parents).toEqual(['רותם', 'טל']);
      expect(result.people[0].siblings).toEqual(['נועה', 'עמית']);
    }
  });

  it('should return error for empty input', () => {
    const result = parsePeopleText('');
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.message).toContain('ריק');
    }
  });

  it('should return error when lines not divisible by 3 (remainder 1)', () => {
    const input = `זיו
רותם טל
נועה עמית

שלומי`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.message).toContain('שורה אחת');
      expect(result.error.remainderLines).toEqual(['שלומי']);
    }
  });

  it('should return error when lines not divisible by 3 (remainder 2)', () => {
    const input = `זיו
רותם טל
נועה עמית

שלומי
רוני רן`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.message).toContain('שורות');
      expect(result.error.remainderLines).toEqual(['שלומי', 'רוני רן']);
    }
  });

  it('should handle single person', () => {
    const input = `דני
אבא אמא
אח`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people).toHaveLength(1);
      expect(result.people[0].name).toBe('דני');
    }
  });

  it('should handle blank lines at start and end', () => {
    const input = `

זיו
רותם טל
נועה עמית

`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people).toHaveLength(1);
    }
  });

  it('should generate unique IDs', () => {
    const input = `א
ב ג
ד

ה
ו ז
ח`;

    const result = parsePeopleText(input);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.people[0].id).not.toBe(result.people[1].id);
    }
  });
});

describe('compareArraysUnordered', () => {
  it('should match same arrays in different order', () => {
    expect(compareArraysUnordered(['רותם', 'טל'], ['טל', 'רותם'])).toBe(true);
  });

  it('should not match different arrays', () => {
    expect(compareArraysUnordered(['רותם', 'טל'], ['רותם', 'רן'])).toBe(false);
  });

  it('should not match arrays of different lengths', () => {
    expect(compareArraysUnordered(['רותם'], ['רותם', 'טל'])).toBe(false);
  });

  it('should match empty arrays', () => {
    expect(compareArraysUnordered([], [])).toBe(true);
  });
});

describe('compareNames', () => {
  it('should match exact names', () => {
    expect(compareNames('זיו', 'זיו')).toBe(true);
  });

  it('should match with extra spaces', () => {
    expect(compareNames('  זיו  ', 'זיו')).toBe(true);
  });

  it('should not match different names', () => {
    expect(compareNames('זיו', 'שלומי')).toBe(false);
  });
});
