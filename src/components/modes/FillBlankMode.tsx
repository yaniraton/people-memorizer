import { useState, useCallback, useEffect, useRef } from 'react';
import type { Person, FillBlankQuestion, AnswerResult, LeitnerCard } from '../../types';
import { generateFillBlank, selectNextPerson, checkFillBlank } from '../../utils/training';

interface FillBlankModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  showInstantFeedback: boolean;
}

export function FillBlankMode({
  people,
  cards,
  onAnswer,
  showInstantFeedback,
}: FillBlankModeProps) {
  const [question, setQuestion] = useState<FillBlankQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const nextQuestion = useCallback(() => {
    const person = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(person.id);
    setQuestion(generateFillBlank(person));
    setAnswer('');
    setFeedback(null);
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!question) nextQuestion();
  }, [question, nextQuestion]);

  useEffect(() => {
    if (question && !feedback) {
      inputRef.current?.focus();
    }
  }, [question, feedback]);

  const handleSubmit = useCallback(() => {
    if (!question || feedback || !answer.trim()) return;

    const correct = checkFillBlank(question, answer);
    const result: AnswerResult = {
      personId: question.person.id,
      correct,
      userAnswer: answer,
      correctAnswer: question.missingPart,
      mode: 'fillBlank',
    };

    if (showInstantFeedback) {
      setFeedback({ correct });
      setTimeout(() => {
        onAnswer(result);
        nextQuestion();
      }, 1500);
    } else {
      onAnswer(result);
      nextQuestion();
    }
  }, [question, feedback, answer, showInstantFeedback, onAnswer, nextQuestion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (!question) return null;

  return (
    <div className="space-y-5">
      {/* Prompt card */}
      <div className={`bg-white rounded-2xl border-2 p-6 text-center transition-all duration-300 ${
        feedback === null
          ? 'border-slate-200'
          : feedback.correct
            ? 'border-emerald-400'
            : 'border-red-400'
      }`}>
        <p className="text-xs text-slate-400 mb-3 font-medium">השלם את החסר</p>
        <p className="text-2xl font-bold text-slate-800 leading-relaxed">
          {question.prompt}
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!!feedback}
          placeholder="הקלד את החלק החסר..."
          className={`w-full p-4 text-lg border-2 rounded-xl text-center font-medium transition-all duration-200 ${
            feedback === null
              ? 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              : feedback.correct
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-red-400 bg-red-50 text-red-700'
          }`}
          dir="rtl"
          autoComplete="off"
          aria-label="תשובה"
        />
      </div>

      {/* Submit button */}
      {!feedback && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-lg"
        >
          בדוק
        </button>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`text-center text-lg font-semibold animate-fade-in ${
          feedback.correct ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {feedback.correct
            ? '✓ מצוין!'
            : `✗ התשובה הנכונה: ${question.missingPart}`
          }
        </div>
      )}
    </div>
  );
}
