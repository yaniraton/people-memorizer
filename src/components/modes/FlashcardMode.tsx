import { useState, useCallback, useEffect } from 'react';
import type { Person, FlashcardQuestion, AnswerResult, LeitnerCard } from '../../types';
import { generateFlashcard, selectNextPerson, updateLeitnerCard } from '../../utils/training';

interface FlashcardModeProps {
  people: Person[];
  cards: Record<string, LeitnerCard>;
  onAnswer: (result: AnswerResult) => void;
  onUpdateCard: (personId: string, card: LeitnerCard) => void;
  questionCount: number | 'infinite';
  totalAnswered: number;
}

export function FlashcardMode({
  people,
  cards,
  onAnswer,
  onUpdateCard,
  questionCount,
  totalAnswered,
}: FlashcardModeProps) {
  const [question, setQuestion] = useState<FlashcardQuestion | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastPersonId, setLastPersonId] = useState<string | undefined>();

  const nextCard = useCallback(() => {
    const person = selectNextPerson(people, cards, lastPersonId);
    setLastPersonId(person.id);
    setQuestion(generateFlashcard(person));
    setIsFlipped(false);
  }, [people, cards, lastPersonId]);

  useEffect(() => {
    if (!question) nextCard();
  }, [question, nextCard]);

  const handleRate = useCallback(
    (rating: 'easy' | 'good' | 'hard') => {
      if (!question) return;
      const person = question.person;
      const isCorrect = rating !== 'hard';

      // Update Leitner card
      const currentCard = cards[person.id] || {
        personId: person.id,
        box: 0,
        lastSeen: 0,
        correctStreak: 0,
      };

      let updatedCard: LeitnerCard;
      if (rating === 'easy') {
        updatedCard = updateLeitnerCard(
          { ...currentCard, box: Math.min(currentCard.box + 1, 2) },
          true
        );
      } else if (rating === 'good') {
        updatedCard = updateLeitnerCard(currentCard, true);
      } else {
        updatedCard = updateLeitnerCard(currentCard, false);
      }

      onUpdateCard(person.id, updatedCard);
      onAnswer({
        personId: person.id,
        correct: isCorrect,
        userAnswer: rating,
        correctAnswer: '',
        mode: 'flashcards',
      });

      // Check if we should continue
      if (questionCount !== 'infinite' && totalAnswered + 1 >= questionCount) {
        return; // Session will end via parent
      }
      nextCard();
    },
    [question, cards, onAnswer, onUpdateCard, questionCount, totalAnswered, nextCard]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!question) return;
      if (!isFlipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setIsFlipped(true);
        }
      } else {
        if (e.key === '1') handleRate('hard');
        else if (e.key === '2') handleRate('good');
        else if (e.key === '3') handleRate('easy');
      }
    },
    [question, isFlipped, handleRate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!question) return null;

  const { person, showSide } = question;

  return (
    <div className="space-y-4">
      {/* Card */}
      <div
        onClick={() => !isFlipped && setIsFlipped(true)}
        className={`relative bg-white rounded-2xl border-2 p-8 min-h-[220px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isFlipped ? 'border-indigo-300 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
        }`}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'כרטיסיה הפוכה' : 'לחץ להפוך'}
      >
        {!isFlipped ? (
          <div className="text-center">
            {showSide === 'name' ? (
              <>
                <p className="text-xs text-slate-400 mb-2 font-medium">שם</p>
                <p className="text-4xl font-bold text-slate-800">{person.name}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-3 font-medium">משפחה</p>
                <div className="space-y-2">
                  <div className="bg-slate-50 rounded-lg px-4 py-2">
                    <span className="text-xs text-slate-400">הורים: </span>
                    <span className="text-lg font-semibold text-slate-700">{person.parents.join(', ')}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-2">
                    <span className="text-xs text-slate-400">אחים: </span>
                    <span className="text-lg font-semibold text-slate-700">
                      {person.siblings.length > 0 ? person.siblings.join(', ') : 'אין'}
                    </span>
                  </div>
                </div>
              </>
            )}
            <p className="text-xs text-slate-300 mt-6">לחץ להפוך ▼</p>
          </div>
        ) : (
          <div className="text-center animate-fade-in">
            {showSide === 'name' ? (
              <>
                <p className="text-xs text-indigo-400 mb-3 font-medium">משפחה</p>
                <div className="space-y-2">
                  <div className="bg-indigo-50 rounded-lg px-4 py-2">
                    <span className="text-xs text-indigo-400">הורים: </span>
                    <span className="text-lg font-semibold text-indigo-700">{person.parents.join(', ')}</span>
                  </div>
                  <div className="bg-indigo-50 rounded-lg px-4 py-2">
                    <span className="text-xs text-indigo-400">אחים: </span>
                    <span className="text-lg font-semibold text-indigo-700">
                      {person.siblings.length > 0 ? person.siblings.join(', ') : 'אין'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-indigo-400 mb-2 font-medium">שם</p>
                <p className="text-4xl font-bold text-indigo-700">{person.name}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <div className="animate-fade-in">
          <p className="text-center text-sm text-slate-500 mb-3">עד כמה ידעת?</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRate('hard')}
              className="py-3 px-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors"
            >
              <div className="text-lg">😓</div>
              <div className="text-sm mt-1">קשה</div>
              <div className="text-xs text-red-400 mt-0.5">1</div>
            </button>
            <button
              onClick={() => handleRate('good')}
              className="py-3 px-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors"
            >
              <div className="text-lg">🤔</div>
              <div className="text-sm mt-1">בסדר</div>
              <div className="text-xs text-amber-400 mt-0.5">2</div>
            </button>
            <button
              onClick={() => handleRate('easy')}
              className="py-3 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
            >
              <div className="text-lg">😎</div>
              <div className="text-sm mt-1">קל</div>
              <div className="text-xs text-emerald-400 mt-0.5">3</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
