import { useState, useCallback, useEffect } from 'react';
import type { Person, MultipleChoiceQuestion, AnswerResult, LeitnerCard } from '../../types';
import { generateMultipleChoice, selectNextPerson, checkMultipleChoice } from '../../utils/training';

interface MultipleChoiceModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  showInstantFeedback: boolean;
}

export function MultipleChoiceMode({
  people,
  cards,
  onAnswer,
  showInstantFeedback,
}: MultipleChoiceModeProps) {
  const [question, setQuestion] = useState<MultipleChoiceQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();

  const nextQuestion = useCallback(() => {
    const person = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(person.id);
    setQuestion(generateMultipleChoice(person, people));
    setSelectedIndex(null);
    setIsCorrect(null);
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!question) nextQuestion();
  }, [question, nextQuestion]);

  const handleSelect = useCallback(
    (index: number) => {
      if (!question || selectedIndex !== null) return;
      const correct = checkMultipleChoice(question, index);
      setSelectedIndex(index);
      setIsCorrect(correct);

      const result: AnswerResult = {
        personId: question.person.id,
        correct,
        userAnswer: question.options[index],
        correctAnswer: question.options[question.correctIndex],
        mode: 'multipleChoice',
      };

      if (showInstantFeedback) {
        setTimeout(() => {
          onAnswer(result);
          nextQuestion();
        }, 1500);
      } else {
        onAnswer(result);
        nextQuestion();
      }
    },
    [question, selectedIndex, showInstantFeedback, onAnswer, nextQuestion]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex !== null) return;
      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in keyMap) handleSelect(keyMap[e.key]);
    },
    [selectedIndex, handleSelect]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!question) return null;

  return (
    <div className="space-y-5">
      {/* Question prompt */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 text-center">
        <p className="text-xl font-bold text-slate-800 leading-relaxed">
          {question.prompt}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option, i) => {
          let className = 'p-4 rounded-xl border-2 text-right font-medium transition-all duration-200 ';

          if (selectedIndex !== null) {
            if (i === question.correctIndex) {
              className += 'border-emerald-500 bg-emerald-50 text-emerald-700 scale-[1.02]';
            } else if (i === selectedIndex && !isCorrect) {
              className += 'border-red-500 bg-red-50 text-red-700 scale-[0.98]';
            } else {
              className += 'border-slate-100 bg-slate-50 text-slate-300';
            }
          } else {
            className += 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer';
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selectedIndex !== null}
              className={className}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs shrink-0">
                  {i + 1}
                </span>
                <span>{option}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
