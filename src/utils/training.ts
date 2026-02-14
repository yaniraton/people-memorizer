import type {
  Person,
  Question,
  GameMode,
  FlashcardQuestion,
  TrueFalseQuestion,
  MultipleChoiceQuestion,
  MatchingRound,
  FillBlankQuestion,
  FreeRecallQuestion,
  SpeedRoundQuestion,
  LeitnerCard,
} from '../types';
import { compareArraysUnordered, compareNames } from './parser';

// ─── Utilities ─────────────────────────────────────────────────

/** Shuffle an array (Fisher-Yates) */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick count random items from array, optionally excluding indices */
function pickRandom<T>(array: T[], count: number, excludeIndices: number[] = []): T[] {
  const indices = array.map((_, i) => i).filter((i) => !excludeIndices.includes(i));
  return shuffle(indices).slice(0, count).map((i) => array[i]);
}

/** Pick one random item */
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Leitner Box Spaced Repetition ────────────────────────────

const LEITNER_BOXES = 3; // box 0, 1, 2
const BOX_WEIGHTS = [5, 2, 1]; // Higher weight = more likely to be picked

/**
 * Initialize Leitner cards for all people.
 * Preserves existing cards, adds new people at box 0.
 */
export function initLeitnerCards(
  people: Person[],
  existing: Record<string, LeitnerCard>
): Record<string, LeitnerCard> {
  const cards = { ...existing };
  for (const person of people) {
    if (!cards[person.id]) {
      cards[person.id] = {
        personId: person.id,
        box: 0,
        lastSeen: 0,
        correctStreak: 0,
      };
    }
  }
  return cards;
}

/**
 * Select the next person using weighted Leitner box selection.
 * Lower boxes (less known) have higher probability.
 * Avoids picking the same person as last time.
 */
export function selectNextPerson(
  people: Person[],
  cards: Record<string, LeitnerCard>,
  lastPersonId?: string
): Person {
  const candidates = people.filter((p) => p.id !== lastPersonId);
  if (candidates.length === 0) return people[0]; // Only 1 person

  // Weight each person by their box
  const weighted: { person: Person; weight: number }[] = candidates.map((p) => {
    const card = cards[p.id];
    const box = card ? Math.min(card.box, LEITNER_BOXES - 1) : 0;
    // Also add recency bias: longer since last seen = higher weight
    const timeSince = card ? Date.now() - card.lastSeen : Infinity;
    const recencyBonus = Math.min(timeSince / (1000 * 60), 10); // Max 10 minutes worth
    return { person: p, weight: BOX_WEIGHTS[box] + recencyBonus };
  });

  // Weighted random selection
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const { person, weight } of weighted) {
    rand -= weight;
    if (rand <= 0) return person;
  }
  return candidates[0];
}

/**
 * Update a Leitner card after an answer.
 * Correct: promote to next box. Wrong: demote to box 0.
 */
export function updateLeitnerCard(
  card: LeitnerCard,
  correct: boolean
): LeitnerCard {
  if (correct) {
    return {
      ...card,
      box: Math.min(card.box + 1, LEITNER_BOXES - 1),
      lastSeen: Date.now(),
      correctStreak: card.correctStreak + 1,
    };
  } else {
    return {
      ...card,
      box: 0,
      lastSeen: Date.now(),
      correctStreak: 0,
    };
  }
}

// ─── Question Generators ───────────────────────────────────────

/** Generate a flashcard question */
export function generateFlashcard(person: Person): FlashcardQuestion {
  return {
    type: 'flashcard',
    person,
    showSide: Math.random() > 0.5 ? 'name' : 'family',
  };
}

/** Generate a true/false question */
export function generateTrueFalse(person: Person, allPeople: Person[]): TrueFalseQuestion {
  const isTrue = Math.random() > 0.4; // Slight bias toward true to avoid frustration
  const askParents = Math.random() > 0.5;
  const relation = askParents ? 'parents' as const : 'siblings' as const;

  if (isTrue) {
    // True statement
    if (askParents) {
      const parent = pickOne(person.parents);
      return {
        type: 'trueFalse',
        person,
        statement: `${parent} הוא/היא הורה של ${person.name}`,
        claimedValue: parent,
        relation,
        isTrue: true,
      };
    } else {
      if (person.siblings.length === 0) {
        return {
          type: 'trueFalse',
          person,
          statement: `ל${person.name} אין אחים`,
          claimedValue: 'אין אחים',
          relation,
          isTrue: true,
        };
      }
      const sibling = pickOne(person.siblings);
      return {
        type: 'trueFalse',
        person,
        statement: `${sibling} הוא/היא אח/ות של ${person.name}`,
        claimedValue: sibling,
        relation,
        isTrue: true,
      };
    }
  } else {
    // False statement: use a name from another person
    const otherPeople = allPeople.filter((p) => p.id !== person.id);
    if (otherPeople.length === 0) {
      // Fallback: just make it true
      const parent = pickOne(person.parents);
      return {
        type: 'trueFalse',
        person,
        statement: `${parent} הוא/היא הורה של ${person.name}`,
        claimedValue: parent,
        relation: 'parents',
        isTrue: true,
      };
    }

    if (askParents) {
      // Pick a parent from another person that isn't actually this person's parent
      const otherParents = otherPeople.flatMap((p) => p.parents)
        .filter((name) => !person.parents.includes(name));
      if (otherParents.length === 0) {
        // All parents overlap; fallback to true
        const parent = pickOne(person.parents);
        return {
          type: 'trueFalse',
          person,
          statement: `${parent} הוא/היא הורה של ${person.name}`,
          claimedValue: parent,
          relation,
          isTrue: true,
        };
      }
      const fakeParent = pickOne(otherParents);
      return {
        type: 'trueFalse',
        person,
        statement: `${fakeParent} הוא/היא הורה של ${person.name}`,
        claimedValue: fakeParent,
        relation,
        isTrue: false,
      };
    } else {
      const otherSiblings = otherPeople.flatMap((p) => p.siblings)
        .filter((name) => !person.siblings.includes(name));
      if (otherSiblings.length === 0) {
        if (person.siblings.length > 0) {
          const sib = pickOne(person.siblings);
          return {
            type: 'trueFalse',
            person,
            statement: `${sib} הוא/היא אח/ות של ${person.name}`,
            claimedValue: sib,
            relation,
            isTrue: true,
          };
        }
        return {
          type: 'trueFalse',
          person,
          statement: `ל${person.name} אין אחים`,
          claimedValue: 'אין אחים',
          relation,
          isTrue: true,
        };
      }
      const fakeSibling = pickOne(otherSiblings);
      return {
        type: 'trueFalse',
        person,
        statement: `${fakeSibling} הוא/היא אח/ות של ${person.name}`,
        claimedValue: fakeSibling,
        relation,
        isTrue: false,
      };
    }
  }
}

/** Generate a multiple choice question with mixed directions */
export function generateMultipleChoice(
  person: Person,
  allPeople: Person[]
): MultipleChoiceQuestion {
  // Randomly pick question direction
  const direction = Math.random();
  const personIndex = allPeople.findIndex((p) => p.id === person.id);

  if (direction < 0.4) {
    // Name -> parents
    const correct = person.parents.join(', ');
    const distractors = pickRandom(allPeople, 5, [personIndex])
      .map((p) => p.parents.join(', '))
      .filter((d) => d !== correct && d.length > 0);
    const uniqueDistractors = [...new Set(distractors)].slice(0, 3);
    while (uniqueDistractors.length < 3) uniqueDistractors.push('—');
    const options = shuffle([correct, ...uniqueDistractors]);
    return {
      type: 'multipleChoice',
      person,
      prompt: `מי ההורים של ${person.name}?`,
      relation: 'parents',
      options,
      correctIndex: options.indexOf(correct),
    };
  } else if (direction < 0.7) {
    // Name -> siblings
    const correct = person.siblings.length > 0 ? person.siblings.join(', ') : 'אין אחים';
    const distractors = pickRandom(allPeople, 5, [personIndex])
      .map((p) => (p.siblings.length > 0 ? p.siblings.join(', ') : 'אין אחים'))
      .filter((d) => d !== correct);
    const uniqueDistractors = [...new Set(distractors)].slice(0, 3);
    while (uniqueDistractors.length < 3) uniqueDistractors.push('—');
    const options = shuffle([correct, ...uniqueDistractors]);
    return {
      type: 'multipleChoice',
      person,
      prompt: `מי האחים של ${person.name}?`,
      relation: 'siblings',
      options,
      correctIndex: options.indexOf(correct),
    };
  } else {
    // Parents+siblings -> name (reverse)
    const correct = person.name;
    const distractors = pickRandom(allPeople, 5, [personIndex])
      .map((p) => p.name)
      .filter((d) => d !== correct);
    const uniqueDistractors = [...new Set(distractors)].slice(0, 3);
    while (uniqueDistractors.length < 3) uniqueDistractors.push('—');
    const options = shuffle([correct, ...uniqueDistractors]);
    const familyDesc = `הורים: ${person.parents.join(', ')} | אחים: ${person.siblings.length > 0 ? person.siblings.join(', ') : 'אין'}`;
    return {
      type: 'multipleChoice',
      person,
      prompt: `מי זה? ${familyDesc}`,
      relation: 'name',
      options,
      correctIndex: options.indexOf(correct),
    };
  }
}

/** Generate a matching round (4 pairs) */
export function generateMatchingRound(
  people: Person[],
  cards: Record<string, LeitnerCard>
): MatchingRound {
  const askParents = Math.random() > 0.5;
  const relation = askParents ? 'parents' as const : 'siblings' as const;

  // Pick 4 people, preferring those in lower Leitner boxes
  const selected: Person[] = [];
  const remaining = [...people];
  for (let i = 0; i < Math.min(4, remaining.length); i++) {
    const person = selectNextPerson(remaining, cards, selected[selected.length - 1]?.id);
    selected.push(person);
    const idx = remaining.findIndex((p) => p.id === person.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  const pairs = selected.map((p) => ({
    personId: p.id,
    name: p.name,
    answer: askParents
      ? p.parents.join(', ')
      : (p.siblings.length > 0 ? p.siblings.join(', ') : 'אין אחים'),
  }));

  return { type: 'matching', pairs, relation };
}

/** Generate a fill-in-the-blank question */
export function generateFillBlank(person: Person): FillBlankQuestion {
  const askParents = Math.random() > 0.4;

  if (askParents && person.parents.length >= 2) {
    // Hide one parent
    const hideIndex = Math.floor(Math.random() * person.parents.length);
    const missingPart = person.parents[hideIndex];
    const visibleParts = person.parents.filter((_, i) => i !== hideIndex);
    const prompt = `הורים של ${person.name}: ${visibleParts.join(', ')} ו___`;
    return {
      type: 'fillBlank',
      person,
      prompt,
      visibleParts,
      missingPart,
      relation: 'parents',
    };
  } else if (person.siblings.length >= 2) {
    // Hide one sibling
    const hideIndex = Math.floor(Math.random() * person.siblings.length);
    const missingPart = person.siblings[hideIndex];
    const visibleParts = person.siblings.filter((_, i) => i !== hideIndex);
    const prompt = `אחים של ${person.name}: ${visibleParts.join(', ')} ו___`;
    return {
      type: 'fillBlank',
      person,
      prompt,
      visibleParts,
      missingPart,
      relation: 'siblings',
    };
  } else if (person.parents.length === 1) {
    // Only 1 parent, ask for it
    return {
      type: 'fillBlank',
      person,
      prompt: `מי ההורה של ${person.name}?`,
      visibleParts: [],
      missingPart: person.parents[0],
      relation: 'parents',
    };
  } else {
    // Fallback: ask for the name given parents
    return {
      type: 'fillBlank',
      person,
      prompt: `ההורים הם ${person.parents.join(' ו')}. מי הילד/ה?`,
      visibleParts: person.parents,
      missingPart: person.name,
      relation: 'name',
    };
  }
}

/** Generate a free recall question */
export function generateFreeRecall(person: Person): FreeRecallQuestion {
  return { type: 'freeRecall', person };
}

/** Generate a speed round question */
export function generateSpeedRound(
  person: Person,
  allPeople: Person[]
): SpeedRoundQuestion {
  // Mix of true/false and multiple choice for variety
  const useTF = Math.random() > 0.4;
  const inner = useTF
    ? generateTrueFalse(person, allPeople)
    : generateMultipleChoice(person, allPeople);
  return {
    type: 'speedRound',
    inner,
    timeLimitMs: 8000, // 8 seconds per question
  };
}

/** Main dispatcher: generate a question for a game mode */
export function generateQuestion(
  person: Person,
  allPeople: Person[],
  mode: GameMode,
  cards: Record<string, LeitnerCard>
): Question {
  switch (mode) {
    case 'flashcards':
      return generateFlashcard(person);
    case 'trueFalse':
      return generateTrueFalse(person, allPeople);
    case 'multipleChoice':
      return generateMultipleChoice(person, allPeople);
    case 'matching':
      return generateMatchingRound(allPeople, cards);
    case 'fillBlank':
      return generateFillBlank(person);
    case 'freeRecall':
      return generateFreeRecall(person);
    case 'speedRound':
      return generateSpeedRound(person, allPeople);
  }
}

// ─── Answer Checking ───────────────────────────────────────────

export function checkTrueFalse(q: TrueFalseQuestion, answer: boolean): boolean {
  return answer === q.isTrue;
}

export function checkMultipleChoice(q: MultipleChoiceQuestion, selectedIndex: number): boolean {
  return selectedIndex === q.correctIndex;
}

export function checkFillBlank(q: FillBlankQuestion, answer: string): boolean {
  return compareNames(answer, q.missingPart);
}

export interface FreeRecallResult {
  parentsCorrect: boolean;
  siblingsCorrect: boolean;
  allCorrect: boolean;
  correctParents: string;
  correctSiblings: string;
}

export function checkFreeRecall(
  person: Person,
  parentsAnswer: string,
  siblingsAnswer: string
): FreeRecallResult {
  const userParents = parentsAnswer.trim().split(/\s+/).filter((s) => s.length > 0);
  const parentsCorrect = compareArraysUnordered(userParents, person.parents);

  let siblingsCorrect: boolean;
  if (person.siblings.length === 0) {
    const trimmed = siblingsAnswer.trim();
    siblingsCorrect = trimmed === '' || trimmed === 'אין' || trimmed === 'אין אחים';
  } else {
    const userSiblings = siblingsAnswer.trim().split(/\s+/).filter((s) => s.length > 0);
    siblingsCorrect = compareArraysUnordered(userSiblings, person.siblings);
  }

  return {
    parentsCorrect,
    siblingsCorrect,
    allCorrect: parentsCorrect && siblingsCorrect,
    correctParents: person.parents.join(' '),
    correctSiblings: person.siblings.length > 0 ? person.siblings.join(' ') : 'אין אחים',
  };
}

export function checkMatchingPair(personId: string, selectedAnswer: string, allPeople: Person[], relation: 'parents' | 'siblings'): boolean {
  const person = allPeople.find((p) => p.id === personId);
  if (!person) return false;
  const correct = relation === 'parents'
    ? person.parents.join(', ')
    : (person.siblings.length > 0 ? person.siblings.join(', ') : 'אין אחים');
  return selectedAnswer === correct;
}
