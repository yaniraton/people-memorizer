import { useState, useCallback, useEffect, useRef } from 'react';
import type { Person, SpeedRoundQuestion, AnswerResult, LeitnerCard } from '../../types';
import {
  generateSpeedRound,
  selectNextPerson,
  checkTrueFalse,
  checkMultipleChoice,
} from '../../utils/training';

interface SpeedRoundModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  showInstantFeedback: boolean;
}

export function SpeedRoundMode({
  people,
  cards,
  onAnswer,
  showInstantFeedback,
}: SpeedRoundModeProps) {
  const [question, setQuestion] = useState<SpeedRoundQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const nextQuestion = useCallback(() => {
    const person = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(person.id);
    const q = generateSpeedRound(person, people);
    setQuestion(q);
    setTimeLeft(q.timeLimitMs);
    setIsAnswered(false);
    setLastCorrect(null);
    startTimeRef.current = Date.now();
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!question) nextQuestion();
  }, [question, nextQuestion]);

  // Countdown timer
  useEffect(() => {
    if (!question || isAnswered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, question.timeLimitMs - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        // Time's up — auto-fail
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, isAnswered]);

  const handleTimeout = useCallback(() => {
    if (!question || isAnswered) return;
    setIsAnswered(true);
    setLastCorrect(false);

    const inner = question.inner;
    const correctAnswer = inner.type === 'trueFalse'
      ? (inner.isTrue ? 'נכון' : 'לא נכון')
      : inner.options[inner.correctIndex];

    const result: AnswerResult = {
      personId: inner.person.id,
      correct: false,
      userAnswer: 'נגמר הזמן',
      correctAnswer,
      mode: 'speedRound',
      timeMs: question.timeLimitMs,
    };

    if (showInstantFeedback) {
      setTimeout(() => {
        onAnswer(result);
        nextQuestion();
      }, 1200);
    } else {
      onAnswer(result);
      nextQuestion();
    }
  }, [question, isAnswered, showInstantFeedback, onAnswer, nextQuestion]);

  const handleTrueFalseAnswer = useCallback(
    (answer: boolean) => {
      if (!question || isAnswered || question.inner.type !== 'trueFalse') return;
      const elapsed = Date.now() - startTimeRef.current;
      const correct = checkTrueFalse(question.inner, answer);

      setIsAnswered(true);
      setLastCorrect(correct);

      const result: AnswerResult = {
        personId: question.inner.person.id,
        correct,
        userAnswer: answer ? 'נכון' : 'לא נכון',
        correctAnswer: question.inner.isTrue ? 'נכון' : 'לא נכון',
        mode: 'speedRound',
        timeMs: elapsed,
      };

      if (showInstantFeedback) {
        setTimeout(() => {
          onAnswer(result);
          nextQuestion();
        }, 1000);
      } else {
        onAnswer(result);
        nextQuestion();
      }
    },
    [question, isAnswered, showInstantFeedback, onAnswer, nextQuestion]
  );

  const handleMCAnswer = useCallback(
    (index: number) => {
      if (!question || isAnswered || question.inner.type !== 'multipleChoice') return;
      const elapsed = Date.now() - startTimeRef.current;
      const correct = checkMultipleChoice(question.inner, index);

      setIsAnswered(true);
      setLastCorrect(correct);

      const result: AnswerResult = {
        personId: question.inner.person.id,
        correct,
        userAnswer: question.inner.options[index],
        correctAnswer: question.inner.options[question.inner.correctIndex],
        mode: 'speedRound',
        timeMs: elapsed,
      };

      if (showInstantFeedback) {
        setTimeout(() => {
          onAnswer(result);
          nextQuestion();
        }, 1000);
      } else {
        onAnswer(result);
        nextQuestion();
      }
    },
    [question, isAnswered, showInstantFeedback, onAnswer, nextQuestion]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isAnswered) return;
      if (!question) return;
      if (question.inner.type === 'trueFalse') {
        if (e.key === 'ArrowRight' || e.key === '1') handleTrueFalseAnswer(true);
        else if (e.key === 'ArrowLeft' || e.key === '2') handleTrueFalseAnswer(false);
      } else {
        const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (e.key in keyMap) handleMCAnswer(keyMap[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAnswered, question, handleTrueFalseAnswer, handleMCAnswer]);

  if (!question) return null;

  const inner = question.inner;
  const progress = timeLeft / question.timeLimitMs;
  const isUrgent = progress < 0.3;

  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className="relative">
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-100 ${
              isUrgent ? 'bg-red-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={`text-center text-sm mt-1 font-mono font-bold ${
          isUrgent ? 'text-red-500 animate-pulse' : 'text-slate-500'
        }`}>
          {(timeLeft / 1000).toFixed(1)} שניות
        </div>
      </div>

      {/* Question */}
      <div className={`bg-white rounded-2xl border-2 p-6 text-center transition-all duration-200 ${
        lastCorrect === null
          ? 'border-slate-200'
          : lastCorrect
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-red-400 bg-red-50'
      }`}>
        {inner.type === 'trueFalse' ? (
          <>
            <p className="text-xs text-slate-400 mb-3 font-medium">נכון או לא?</p>
            <p className="text-xl font-bold text-slate-800">{inner.statement}</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-slate-800">{inner.prompt}</p>
          </>
        )}

        {lastCorrect !== null && showInstantFeedback && (
          <p className={`mt-3 font-semibold text-lg animate-fade-in ${
            lastCorrect ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {lastCorrect ? '⚡ מהיר ונכון!' : '✗ טעות!'}
          </p>
        )}
      </div>

      {/* Answer buttons */}
      {inner.type === 'trueFalse' ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTrueFalseAnswer(true)}
            disabled={isAnswered}
            className={`py-4 rounded-xl border-2 text-lg font-bold transition-all ${
              isAnswered
                ? inner.isTrue
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.97]'
            }`}
          >
            ✓ נכון
          </button>
          <button
            onClick={() => handleTrueFalseAnswer(false)}
            disabled={isAnswered}
            className={`py-4 rounded-xl border-2 text-lg font-bold transition-all ${
              isAnswered
                ? !inner.isTrue
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-300'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.97]'
            }`}
          >
            ✗ לא נכון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {inner.options.map((option, i) => {
            let cls = 'p-3 rounded-xl border-2 text-sm font-medium transition-all ';
            if (isAnswered) {
              if (i === inner.correctIndex) {
                cls += 'border-emerald-500 bg-emerald-50 text-emerald-700';
              } else {
                cls += 'border-slate-100 bg-slate-50 text-slate-300';
              }
            } else {
              cls += 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.97] cursor-pointer';
            }
            return (
              <button
                key={i}
                onClick={() => handleMCAnswer(i)}
                disabled={isAnswered}
                className={cls}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
