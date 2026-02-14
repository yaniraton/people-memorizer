import { useState, useCallback, useEffect, useRef } from 'react';
import type { Person, AnswerResult, LeitnerCard } from '../../types';
import { generateFreeRecall, selectNextPerson, checkFreeRecall } from '../../utils/training';
import type { FreeRecallResult } from '../../utils/training';

interface FreeRecallModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  showInstantFeedback: boolean;
}

export function FreeRecallMode({
  people,
  cards,
  onAnswer,
  showInstantFeedback,
}: FreeRecallModeProps) {
  const [personId, setPersonId] = useState<string | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [parentsInput, setParentsInput] = useState('');
  const [siblingsInput, setSiblingsInput] = useState('');
  const [feedback, setFeedback] = useState<FreeRecallResult | null>(null);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();
  const parentsRef = useRef<HTMLInputElement>(null);
  const siblingsRef = useRef<HTMLInputElement>(null);

  const nextQuestion = useCallback(() => {
    const p = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(p.id);
    const q = generateFreeRecall(p);
    setPersonId(q.person.id);
    setPerson(q.person);
    setParentsInput('');
    setSiblingsInput('');
    setFeedback(null);
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!personId) nextQuestion();
  }, [personId, nextQuestion]);

  useEffect(() => {
    if (person && !feedback) {
      parentsRef.current?.focus();
    }
  }, [person, feedback]);

  const handleSubmit = useCallback(() => {
    if (!person || feedback) return;
    const result = checkFreeRecall(person, parentsInput, siblingsInput);

    const answerResult: AnswerResult = {
      personId: person.id,
      correct: result.allCorrect,
      userAnswer: `הורים: ${parentsInput}, אחים: ${siblingsInput}`,
      correctAnswer: `הורים: ${result.correctParents}, אחים: ${result.correctSiblings}`,
      mode: 'freeRecall',
    };

    if (showInstantFeedback) {
      setFeedback(result);
    } else {
      onAnswer(answerResult);
      nextQuestion();
    }
  }, [person, feedback, parentsInput, siblingsInput, showInstantFeedback, onAnswer, nextQuestion]);

  const handleContinue = useCallback(() => {
    if (!person || !feedback) return;
    const answerResult: AnswerResult = {
      personId: person.id,
      correct: feedback.allCorrect,
      userAnswer: `הורים: ${parentsInput}, אחים: ${siblingsInput}`,
      correctAnswer: `הורים: ${feedback.correctParents}, אחים: ${feedback.correctSiblings}`,
      mode: 'freeRecall',
    };
    onAnswer(answerResult);
    nextQuestion();
  }, [person, feedback, parentsInput, siblingsInput, onAnswer, nextQuestion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, field: 'parents' | 'siblings') => {
      if (e.key === 'Enter') {
        if (feedback) {
          handleContinue();
        } else if (field === 'parents') {
          siblingsRef.current?.focus();
        } else {
          handleSubmit();
        }
      }
    },
    [feedback, handleSubmit, handleContinue]
  );

  if (!person) return null;

  return (
    <div className="space-y-5">
      {/* Name card */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-center">
        <p className="text-xs text-slate-400 mb-2 font-medium">נסה לזכור הכל על:</p>
        <p className="text-4xl font-bold text-slate-800">{person.name}</p>
      </div>

      {/* Input fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            הורים
            {feedback && (
              <span className={`mr-2 ${feedback.parentsCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                {feedback.parentsCorrect ? '✓' : '✗'}
              </span>
            )}
          </label>
          <input
            ref={parentsRef}
            type="text"
            value={parentsInput}
            onChange={(e) => setParentsInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'parents')}
            disabled={!!feedback}
            placeholder="הקלד שמות הורים מופרדים ברווח..."
            className={`w-full p-3 border-2 rounded-xl text-base transition-all ${
              feedback === null
                ? 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                : feedback.parentsCorrect
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-red-400 bg-red-50'
            }`}
            dir="rtl"
            autoComplete="off"
          />
          {feedback && !feedback.parentsCorrect && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">
              התשובה: {feedback.correctParents}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            אחים
            {feedback && (
              <span className={`mr-2 ${feedback.siblingsCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                {feedback.siblingsCorrect ? '✓' : '✗'}
              </span>
            )}
          </label>
          <input
            ref={siblingsRef}
            type="text"
            value={siblingsInput}
            onChange={(e) => setSiblingsInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'siblings')}
            disabled={!!feedback}
            placeholder="הקלד שמות אחים (או השאר ריק אם אין)..."
            className={`w-full p-3 border-2 rounded-xl text-base transition-all ${
              feedback === null
                ? 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                : feedback.siblingsCorrect
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-red-400 bg-red-50'
            }`}
            dir="rtl"
            autoComplete="off"
          />
          {feedback && !feedback.siblingsCorrect && (
            <p className="text-sm text-red-600 mt-1 animate-fade-in">
              התשובה: {feedback.correctSiblings}
            </p>
          )}
        </div>
      </div>

      {/* Submit / Continue */}
      {!feedback ? (
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg"
        >
          בדוק
        </button>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className={`text-center text-lg font-semibold ${
            feedback.allCorrect ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {feedback.allCorrect
              ? '✓ מושלם! זכרת הכל!'
              : feedback.parentsCorrect || feedback.siblingsCorrect
                ? '~ כמעט! חלק מהתשובות נכונות'
                : '✗ לא נורא, נשתפר בפעם הבאה'
            }
          </div>
          <button
            onClick={handleContinue}
            className="w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            autoFocus
          >
            הבא →
          </button>
        </div>
      )}
    </div>
  );
}
