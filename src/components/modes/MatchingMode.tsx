import { useState, useCallback, useEffect, useRef } from 'react';
import type { Person, AnswerResult, LeitnerCard } from '../../types';
import { generateMatchingRound, shuffle } from '../../utils/training';

interface MatchingModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  onBatchAnswer: (results: AnswerResult[]) => void;
  showInstantFeedback: boolean;
}

interface MatchPair {
  personId: string;
  name: string;
  answer: string;
}

export function MatchingMode({
  people,
  cards,
  onAnswer: _onAnswer,
  onBatchAnswer,
}: MatchingModeProps) {
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [relation, setRelation] = useState<'parents' | 'siblings' | 'name'>('parents');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundResults, setRoundResults] = useState<AnswerResult[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRound = useCallback(() => {
    const round = generateMatchingRound(people, cards);
    setPairs(round.pairs);
    setShuffledAnswers(shuffle(round.pairs.map((p) => p.answer)));
    setRelation(round.relation);
    setSelectedName(null);
    setMatched(new Set());
    setWrongFlash(null);
    setRoundComplete(false);
    setRoundResults([]);
    setStartTime(Date.now());
    setElapsed(0);
  }, [people, cards]);

  useEffect(() => {
    if (pairs.length === 0) startRound();
  }, [pairs.length, startRound]);

  // Timer
  useEffect(() => {
    if (roundComplete || pairs.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundComplete, startTime, pairs.length]);

  const handleNameClick = useCallback(
    (name: string) => {
      if (matched.has(name)) return;
      setSelectedName((prev) => (prev === name ? null : name));
      setWrongFlash(null);
    },
    [matched]
  );

  const handleAnswerClick = useCallback(
    (answer: string) => {
      if (!selectedName) return;
      // Find the pair for the selected name
      const pair = pairs.find((p) => p.name === selectedName);
      if (!pair) return;

      if (pair.answer === answer) {
        // Correct match
        const newMatched = new Set(matched);
        newMatched.add(selectedName);
        setMatched(newMatched);
        setSelectedName(null);

        const result: AnswerResult = {
          personId: pair.personId,
          correct: true,
          userAnswer: answer,
          correctAnswer: pair.answer,
          mode: 'matching',
        };
        const newResults = [...roundResults, result];
        setRoundResults(newResults);

        // Check if round is complete
        if (newMatched.size === pairs.length) {
          setRoundComplete(true);
          onBatchAnswer(newResults);
        }
      } else {
        // Wrong match - flash red
        setWrongFlash(answer);
        const result: AnswerResult = {
          personId: pair.personId,
          correct: false,
          userAnswer: answer,
          correctAnswer: pair.answer,
          mode: 'matching',
        };
        setRoundResults((prev) => [...prev, result]);
        onBatchAnswer([result]);

        setTimeout(() => setWrongFlash(null), 600);
      }
    },
    [selectedName, pairs, matched, roundResults, onBatchAnswer]
  );

  if (pairs.length === 0) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 font-medium">
          {relation === 'parents' ? 'חבר שמות להורים' : 'חבר שמות לאחים'}
        </span>
        <span className="font-mono text-slate-400">
          {formatTime(elapsed)} שניות
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {pairs.map((p) => (
          <div
            key={p.personId}
            className={`w-3 h-3 rounded-full transition-colors ${
              matched.has(p.name) ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Matching grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Names column */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium mb-1 text-center">שמות</p>
          {pairs.map((pair) => {
            const isMatched = matched.has(pair.name);
            const isSelected = selectedName === pair.name;
            return (
              <button
                key={pair.personId}
                onClick={() => handleNameClick(pair.name)}
                disabled={isMatched}
                className={`w-full py-3 px-4 rounded-xl border-2 font-semibold text-center transition-all duration-200 ${
                  isMatched
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-500 line-through'
                    : isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-[1.03] shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
                }`}
              >
                {pair.name}
              </button>
            );
          })}
        </div>

        {/* Answers column */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium mb-1 text-center">
            {relation === 'parents' ? 'הורים' : 'אחים'}
          </p>
          {shuffledAnswers.map((answer, i) => {
            const isUsed = Array.from(matched).some(
              (name) => pairs.find((p) => p.name === name)?.answer === answer
            );
            const isWrong = wrongFlash === answer;
            return (
              <button
                key={i}
                onClick={() => handleAnswerClick(answer)}
                disabled={isUsed || !selectedName}
                className={`w-full py-3 px-4 rounded-xl border-2 text-sm font-medium text-center transition-all duration-200 ${
                  isUsed
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-500 line-through'
                    : isWrong
                      ? 'border-red-500 bg-red-100 text-red-700 animate-shake'
                      : !selectedName
                        ? 'border-slate-100 bg-slate-50 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                }`}
              >
                {answer}
              </button>
            );
          })}
        </div>
      </div>

      {/* Round complete */}
      {roundComplete && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center animate-fade-in">
          <p className="text-lg font-bold text-emerald-700 mb-1">
            סיבוב הושלם!
          </p>
          <p className="text-sm text-emerald-600">
            זמן: {formatTime(elapsed)} שניות
          </p>
          <button
            onClick={startRound}
            className="mt-4 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            סיבוב הבא
          </button>
        </div>
      )}
    </div>
  );
}
