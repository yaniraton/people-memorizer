// Core data types

export interface Person {
  id: string;
  name: string;
  parents: string[];
  siblings: string[];
}

// ─── Game Modes ────────────────────────────────────────────────

export type GameMode =
  | 'flashcards'      // Self-paced review, flip to reveal, rate difficulty
  | 'trueFalse'       // Quick "Is X the parent of Y?" recognition
  | 'multipleChoice'  // Pick correct answer from 4 options
  | 'matching'        // Match names to parents/siblings in a grid
  | 'fillBlank'       // Partial info shown, type the missing piece
  | 'freeRecall'      // Hardest: type all parents + siblings from memory
  | 'speedRound';     // Timed rapid-fire with countdown

export interface GameModeInfo {
  id: GameMode;
  label: string;
  description: string;
  difficulty: number; // 1-5 scale
  icon: string;
}

export const GAME_MODES: GameModeInfo[] = [
  { id: 'flashcards',     label: 'כרטיסיות',      description: 'צפייה חופשית - הפוך לגלות, דרג קושי',        difficulty: 1, icon: '📇' },
  { id: 'trueFalse',      label: 'נכון / לא נכון',  description: 'טענות מהירות - האם X הורה של Y?',            difficulty: 2, icon: '⚡' },
  { id: 'multipleChoice', label: 'ברירה מרובה',    description: 'בחר תשובה נכונה מתוך 4 אפשרויות',          difficulty: 2, icon: '🔘' },
  { id: 'matching',       label: 'התאמה',          description: 'חבר שמות להורים או אחים במשחק התאמה',       difficulty: 3, icon: '🔗' },
  { id: 'fillBlank',      label: 'השלם את החסר',    description: 'מידע חלקי מוצג - הקלד את החסר',            difficulty: 4, icon: '✏️' },
  { id: 'freeRecall',     label: 'זיכרון חופשי',    description: 'הקלד את כל ההורים והאחים בעצמך',            difficulty: 5, icon: '🧠' },
  { id: 'speedRound',     label: 'מבחן מהיר',      description: 'שאלות עם טיימר - כמה תספיק?',              difficulty: 3, icon: '⏱️' },
];

// ─── Question Types ────────────────────────────────────────────

/** What relationship is being asked about */
export type RelationType = 'parents' | 'siblings' | 'name';

export type QuestionCount = 10 | 20 | 50 | 'infinite';

export interface SessionSettings {
  gameMode: GameMode;
  questionCount: QuestionCount;
  showInstantFeedback: boolean;
}

// -- Flashcard
export interface FlashcardQuestion {
  type: 'flashcard';
  person: Person;
  showSide: 'name' | 'family'; // which side to show first
}

// -- True/False
export interface TrueFalseQuestion {
  type: 'trueFalse';
  person: Person;
  statement: string;
  claimedValue: string;
  relation: RelationType;
  isTrue: boolean;
}

// -- Multiple Choice
export interface MultipleChoiceQuestion {
  type: 'multipleChoice';
  person: Person;
  prompt: string;
  relation: RelationType;
  options: string[];       // display strings for each option
  correctIndex: number;
}

// -- Matching
export interface MatchingRound {
  type: 'matching';
  pairs: { personId: string; name: string; answer: string }[];
  relation: RelationType;
}

// -- Fill in the Blank
export interface FillBlankQuestion {
  type: 'fillBlank';
  person: Person;
  prompt: string;          // e.g., "הורים של זיו: רותם ו___"
  visibleParts: string[];  // parts that are shown
  missingPart: string;     // the answer to fill in
  relation: RelationType;
}

// -- Free Recall
export interface FreeRecallQuestion {
  type: 'freeRecall';
  person: Person;
}

// -- Speed Round (reuses TrueFalse or MultipleChoice internally)
export interface SpeedRoundQuestion {
  type: 'speedRound';
  inner: TrueFalseQuestion | MultipleChoiceQuestion;
  timeLimitMs: number;
}

export type Question =
  | FlashcardQuestion
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | MatchingRound
  | FillBlankQuestion
  | FreeRecallQuestion
  | SpeedRoundQuestion;

// ─── Answer / Results ──────────────────────────────────────────

export interface AnswerResult {
  personId: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  mode: GameMode;
  /** Time taken in ms (for speed round) */
  timeMs?: number;
}

// ─── Leitner Spaced Repetition ─────────────────────────────────

export interface LeitnerCard {
  personId: string;
  box: number;        // 0 = new/failed, 1 = seen once, 2 = known well
  lastSeen: number;   // timestamp
  correctStreak: number;
}

// ─── Stats ─────────────────────────────────────────────────────

export interface PersonStats {
  personId: string;
  name: string;
  timesAsked: number;
  timesCorrect: number;
  accuracy: number;
}

export interface SessionStats {
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  total: number;
  accuracy: number;
  results: AnswerResult[];
}

export interface OverallStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  personStats: Record<string, PersonStats>;
  leitnerCards: Record<string, LeitnerCard>;
}

export type Screen = 'input' | 'training' | 'stats';

export interface ParseError {
  message: string;
  remainderLines: string[];
}

export type ParseResult =
  | { success: true; people: Person[] }
  | { success: false; error: ParseError };
