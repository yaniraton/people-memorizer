import { useState, useCallback, useEffect } from 'react';
import type { Person, TrueFalseQuestion, AnswerResult, LeitnerCard } from '../../types';
import { generateTrueFalse, selectNextPerson, checkTrueFalse } from '../../utils/training';

interface TrueFalseModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  showInstantFeedback: boolean;
}

export function TrueFalseMode({
  people,
  cards,
  onAnswer,
  showInstantFeedback,
}: TrueFalseModeProps) {
  const [question, setQuestion] = useState<TrueFalseQuestion | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: boolean } | null>(null);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();

  const nextQuestion = useCallback(() => {
    const person = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(person.id);
    setQuestion(generateTrueFalse(person, people));
    setFeedback(null);
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!question) nextQuestion();
  }, [question, nextQuestion]);

  const handleAnswer = useCallback(
    (answer: boolean) => {
      if (!question || feedback) return;
      const correct = checkTrueFalse(question, answer);

      const result: AnswerResult = {
        personId: question.person.id,
        correct,
        userAnswer: answer ? 'נכון' : 'לא נכון',
        correctAnswer: question.isTrue ? 'נכון' : 'לא נכון',
        mode: 'trueFalse',
      };

      if (showInstantFeedback) {
        setFeedback({ correct, answer });
        // Auto-advance after delay
        setTimeout(() => {
          onAnswer(result);
          nextQuestion();
        }, 1200);
      } else {
        onAnswer(result);
        nextQuestion();
      }
    },
    [question, feedback, showInstantFeedback, onAnswer, nextQuestion]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (feedback) return;
      if (e.key === 'ArrowRight' || e.key === '1') handleAnswer(true);
      else if (e.key === 'ArrowLeft' || e.key === '2') handleAnswer(false);
    },
    [feedback, handleAnswer]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!question) return null;

  return (
    <div className="space-y-6">
      {/* Statement card */}
      <div className={`bg-white rounded-2xl border-2 p-8 text-center transition-all duration-300 ${
        feedback === null
          ? 'border-slate-200'
          : feedback.correct
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-red-400 bg-red-50'
      }`}>
        <p className="text-xs text-slate-400 mb-4 font-medium">האם הטענה הבאה נכונה?</p>
        <p className="text-2xl font-bold text-slate-800 leading-relaxed">
          {question.statement}
        </p>

        {feedback && (
          <div className={`mt-4 text-lg font-semibold animate-fade-in ${
            feedback.correct ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {feedback.correct ? '✓ נכון!' : `✗ טעות! התשובה: ${question.isTrue ? 'נכון' : 'לא נכון'}`}
          </div>
        )}
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer(true)}
          disabled={!!feedback}
          className={`py-5 rounded-xl border-2 text-lg font-bold transition-all duration-200 ${
            feedback?.answer === true
              ? feedback.correct
                ? 'border-emerald-500 bg-emerald-100 text-emerald-700 scale-105'
                : 'border-red-500 bg-red-100 text-red-700'
              : feedback && question.isTrue
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                : feedback
                  ? 'border-slate-200 bg-slate-50 text-slate-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          ✓ נכון
          <span className="block text-xs font-normal mt-1 opacity-60">← או 1</span>
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={!!feedback}
          className={`py-5 rounded-xl border-2 text-lg font-bold transition-all duration-200 ${
            feedback?.answer === false
              ? feedback.correct
                ? 'border-emerald-500 bg-emerald-100 text-emerald-700 scale-105'
                : 'border-red-500 bg-red-100 text-red-700'
              : feedback && !question.isTrue
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                : feedback
                  ? 'border-slate-200 bg-slate-50 text-slate-300'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          ✗ לא נכון
          <span className="block text-xs font-normal mt-1 opacity-60">→ או 2</span>
        </button>
      </div>
    </div>
  );
}
