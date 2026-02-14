import { useState, useCallback } from 'react';
import type {
  Person,
  SessionSettings,
  SessionStats,
  OverallStats,
  QuestionCount,
  AnswerResult,
  PersonStats,
  LeitnerCard,
  GameMode,
} from '../types';
import { GAME_MODES } from '../types';
import { initLeitnerCards, updateLeitnerCard } from '../utils/training';

import { FlashcardMode } from './modes/FlashcardMode';
import { TrueFalseMode } from './modes/TrueFalseMode';
import { MultipleChoiceMode } from './modes/MultipleChoiceMode';
import { MatchingMode } from './modes/MatchingMode';
import { FillBlankMode } from './modes/FillBlankMode';
import { FreeRecallMode } from './modes/FreeRecallMode';
import { SpeedRoundMode } from './modes/SpeedRoundMode';

interface TrainingScreenProps {
  people: Person[];
  overallStats: OverallStats;
  onUpdateStats: (stats: OverallStats) => void;
  onGoToInput: () => void;
}

const QUESTION_COUNTS: { value: QuestionCount; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 'infinite', label: 'אינסופי' },
];

// Initial session stats
function emptySessionStats(): SessionStats {
  return {
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    total: 0,
    accuracy: 0,
    results: [],
  };
}

export function TrainingScreen({
  people,
  overallStats,
  onUpdateStats,
  onGoToInput,
}: TrainingScreenProps) {
  const [settings, setSettings] = useState<SessionSettings>({
    gameMode: 'flashcards',
    questionCount: 10,
    showInstantFeedback: true,
  });
  const [isActive, setIsActive] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>(emptySessionStats());
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [leitnerCards, setLeitnerCards] = useState<Record<string, LeitnerCard>>(() =>
    initLeitnerCards(people, overallStats.leitnerCards ?? {})
  );

  // ─── Session lifecycle ───────────────────────────────────────

  const startSession = useCallback(() => {
    if (people.length === 0) return;
    setSessionStats(emptySessionStats());
    setIsSessionComplete(false);
    setLeitnerCards(initLeitnerCards(people, overallStats.leitnerCards ?? {}));
    setIsActive(true);
  }, [people, overallStats]);

  const finishSession = useCallback(
    (stats: SessionStats) => {
      const newOverall: OverallStats = {
        ...overallStats,
        totalSessions: overallStats.totalSessions + 1,
        totalQuestions: overallStats.totalQuestions + stats.total,
        totalCorrect: overallStats.totalCorrect + stats.correct,
        personStats: { ...overallStats.personStats },
        leitnerCards: { ...leitnerCards },
      };

      // Update per-person stats
      for (const result of stats.results) {
        const existing: PersonStats = newOverall.personStats[result.personId]
          ? { ...newOverall.personStats[result.personId] }
          : {
              personId: result.personId,
              name: people.find((p) => p.id === result.personId)?.name ?? '',
              timesAsked: 0,
              timesCorrect: 0,
              accuracy: 0,
            };
        existing.timesAsked += 1;
        if (result.correct) existing.timesCorrect += 1;
        existing.accuracy =
          existing.timesAsked > 0 ? (existing.timesCorrect / existing.timesAsked) * 100 : 0;
        newOverall.personStats[result.personId] = existing;
      }

      onUpdateStats(newOverall);
      setIsActive(false);
      setIsSessionComplete(true);
    },
    [overallStats, leitnerCards, people, onUpdateStats]
  );

  // ─── Answer handling ─────────────────────────────────────────

  const handleAnswer = useCallback(
    (result: AnswerResult) => {
      setSessionStats((prev) => {
        const newCorrect = prev.correct + (result.correct ? 1 : 0);
        const newWrong = prev.wrong + (result.correct ? 0 : 1);
        const newTotal = prev.total + 1;
        const newStreak = result.correct ? prev.streak + 1 : 0;
        const newBestStreak = Math.max(prev.bestStreak, newStreak);

        const newStats: SessionStats = {
          correct: newCorrect,
          wrong: newWrong,
          streak: newStreak,
          bestStreak: newBestStreak,
          total: newTotal,
          accuracy: newTotal > 0 ? (newCorrect / newTotal) * 100 : 0,
          results: [...prev.results, result],
        };

        // Check if session should end
        if (settings.questionCount !== 'infinite' && newTotal >= settings.questionCount) {
          // We need to defer finishSession to avoid setState during render
          setTimeout(() => finishSession(newStats), 0);
        }

        return newStats;
      });

      // Update Leitner card for this person
      setLeitnerCards((prev) => {
        const card = prev[result.personId] ?? {
          personId: result.personId,
          box: 0,
          lastSeen: 0,
          correctStreak: 0,
        };
        const updated = updateLeitnerCard(card, result.correct);
        return { ...prev, [result.personId]: updated };
      });
    },
    [settings.questionCount, finishSession]
  );

  const handleBatchAnswer = useCallback(
    (results: AnswerResult[]) => {
      for (const result of results) {
        handleAnswer(result);
      }
    },
    [handleAnswer]
  );

  const handleUpdateCard = useCallback(
    (personId: string, card: LeitnerCard) => {
      setLeitnerCards((prev) => ({ ...prev, [personId]: card }));
    },
    []
  );

  // ─── Renders ─────────────────────────────────────────────────

  if (people.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">אין אנשים ברשימה. יש להזין נתונים קודם.</p>
        <button
          onClick={onGoToInput}
          className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          עבור לקלט
        </button>
      </div>
    );
  }

  // Session complete screen
  if (isSessionComplete) {
    return <SessionCompleteView
      stats={sessionStats}
      settings={settings}
      onNewSession={startSession}
      onBackToSettings={() => { setIsSessionComplete(false); setIsActive(false); }}
    />;
  }

  // Settings screen
  if (!isActive) {
    return <SettingsView
      settings={settings}
      onUpdateSettings={setSettings}
      onStart={startSession}
      peopleCount={people.length}
    />;
  }

  // Active game
  return (
    <div className="space-y-4">
      {/* Progress header */}
      <ProgressHeader
        stats={sessionStats}
        settings={settings}
        onEndSession={() => finishSession(sessionStats)}
      />

      {/* Active game mode */}
      <GameModeRenderer
        mode={settings.gameMode}
        people={people}
        cards={leitnerCards}
        onAnswer={handleAnswer}
        onBatchAnswer={handleBatchAnswer}
        onUpdateCard={handleUpdateCard}
        showInstantFeedback={settings.showInstantFeedback}
        questionCount={settings.questionCount === 'infinite' ? 'infinite' : settings.questionCount}
        totalAnswered={sessionStats.total}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function ProgressHeader({
  stats,
  settings,
  onEndSession,
}: {
  stats: SessionStats;
  settings: SessionSettings;
  onEndSession: () => void;
}) {
  const modeInfo = GAME_MODES.find((m) => m.id === settings.gameMode);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{modeInfo?.icon}</span>
          <span className="text-sm font-medium text-slate-600">{modeInfo?.label}</span>
        </div>
        <button
          onClick={onEndSession}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          סיים אימון
        </button>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
        <span>
          שאלה {stats.total + 1}
          {settings.questionCount !== 'infinite' ? ` מתוך ${settings.questionCount}` : ''}
        </span>
        <div className="flex gap-3">
          <span className="text-emerald-600 font-medium">✓ {stats.correct}</span>
          <span className="text-red-500 font-medium">✗ {stats.wrong}</span>
          {stats.streak >= 2 && (
            <span className="text-amber-500 font-medium">
              🔥 {stats.streak}
            </span>
          )}
        </div>
      </div>
      {settings.questionCount !== 'infinite' && (
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min((stats.total / (settings.questionCount as number)) * 100, 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function GameModeRenderer({
  mode,
  people,
  cards,
  onAnswer,
  onBatchAnswer,
  onUpdateCard,
  showInstantFeedback,
  questionCount,
  totalAnswered,
}: {
  mode: GameMode;
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  onBatchAnswer: (results: AnswerResult[]) => void;
  onUpdateCard: (personId: string, card: LeitnerCard) => void;
  showInstantFeedback: boolean;
  questionCount: number | 'infinite';
  totalAnswered: number;
}) {
  switch (mode) {
    case 'flashcards':
      return (
        <FlashcardMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          onUpdateCard={onUpdateCard}
          questionCount={questionCount}
          totalAnswered={totalAnswered}
        />
      );
    case 'trueFalse':
      return (
        <TrueFalseMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
    case 'multipleChoice':
      return (
        <MultipleChoiceMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
    case 'matching':
      return (
        <MatchingMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          onBatchAnswer={onBatchAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
    case 'fillBlank':
      return (
        <FillBlankMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
    case 'freeRecall':
      return (
        <FreeRecallMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
    case 'speedRound':
      return (
        <SpeedRoundMode
          people={people}
          cards={cards}
          onAnswer={onAnswer}
          showInstantFeedback={showInstantFeedback}
        />
      );
  }
}

function SettingsView({
  settings,
  onUpdateSettings,
  onStart,
  peopleCount,
}: {
  settings: SessionSettings;
  onUpdateSettings: (s: SessionSettings) => void;
  onStart: () => void;
  peopleCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">הגדרות אימון</h2>
        <p className="text-sm text-slate-400 mb-5">{peopleCount} אנשים ברשימה</p>

        {/* Game mode selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">מצב משחק</label>
          <div className="grid grid-cols-1 gap-2">
            {GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onUpdateSettings({ ...settings, gameMode: mode.id })}
                className={`flex items-center gap-3 p-3 rounded-lg border text-right transition-all duration-150 ${
                  settings.gameMode === mode.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl shrink-0">{mode.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{mode.label}</span>
                    <DifficultyDots level={mode.difficulty} />
                  </div>
                  <p className="text-xs mt-0.5 opacity-70 truncate">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">מספר שאלות</label>
          <div className="flex gap-2 flex-wrap">
            {QUESTION_COUNTS.map((qc) => (
              <button
                key={String(qc.value)}
                onClick={() => onUpdateSettings({ ...settings, questionCount: qc.value })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  settings.questionCount === qc.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {qc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback toggle */}
        {settings.gameMode !== 'flashcards' && (
          <div className="mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.showInstantFeedback}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showInstantFeedback: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
                <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:-translate-x-4" />
              </div>
              <span className="text-sm text-slate-700">הצג משוב מיידי</span>
            </label>
          </div>
        )}

        <button
          onClick={onStart}
          className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg shadow-sm hover:shadow"
        >
          התחל אימון
        </button>
      </div>
    </div>
  );
}

function SessionCompleteView({
  stats,
  settings,
  onNewSession,
  onBackToSettings,
}: {
  stats: SessionStats;
  settings: SessionSettings;
  onNewSession: () => void;
  onBackToSettings: () => void;
}) {
  const modeInfo = GAME_MODES.find((m) => m.id === settings.gameMode);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
        <div className="text-4xl mb-3">
          {stats.accuracy >= 80 ? '🎉' : stats.accuracy >= 50 ? '👍' : '💪'}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">האימון הסתיים!</h2>
        <p className="text-sm text-slate-400">{modeInfo?.icon} {modeInfo?.label}</p>

        <div className="grid grid-cols-2 gap-3 mt-6 max-w-xs mx-auto">
          <StatBox label="נכונות" value={stats.correct} color="emerald" />
          <StatBox label="שגיאות" value={stats.wrong} color="red" />
          <StatBox label="רצף הכי טוב" value={stats.bestStreak} color="amber" />
          <StatBox label="דיוק" value={`${stats.accuracy.toFixed(0)}%`} color="indigo" />
        </div>
      </div>

      {/* Detailed results */}
      {stats.results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3">תוצאות מפורטות</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {stats.results.map((result, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg text-sm flex items-center gap-2 ${
                  result.correct
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <span className="shrink-0">{result.correct ? '✓' : '✗'}</span>
                <span className="truncate">
                  {result.correct
                    ? result.userAnswer
                    : `${result.userAnswer} → ${result.correctAnswer}`
                  }
                </span>
                {result.timeMs !== undefined && (
                  <span className="text-xs opacity-60 mr-auto shrink-0">
                    {(result.timeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={onNewSession}
          className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          אימון חדש
        </button>
        <button
          onClick={onBackToSettings}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          חזרה להגדרות
        </button>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${colorMap[color] ?? ''}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`רמת קושי ${level} מתוך 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < level ? 'bg-indigo-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}
