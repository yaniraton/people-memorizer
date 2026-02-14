import { useState, useCallback } from 'react';
import type { Person, Screen, OverallStats } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Navigation } from './components/Navigation';
import { InputScreen } from './components/InputScreen';
import { TrainingScreen } from './components/TrainingScreen';
import { StatsScreen } from './components/StatsScreen';

const INITIAL_STATS: OverallStats = {
  totalSessions: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  personStats: {},
  leitnerCards: {},
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('input');
  const [people, setPeople, clearPeople] = useLocalStorage<Person[]>('people-memorizer-people', []);
  const [overallStats, setOverallStats, clearStats] = useLocalStorage<OverallStats>(
    'people-memorizer-stats',
    INITIAL_STATS
  );

  const handleSavePeople = useCallback(
    (newPeople: Person[]) => {
      setPeople(newPeople);
    },
    [setPeople]
  );

  const handleStartTraining = useCallback(() => {
    setCurrentScreen('training');
  }, []);

  const handleClearAll = useCallback(() => {
    clearPeople();
    clearStats();
  }, [clearPeople, clearStats]);

  const handleUpdateStats = useCallback(
    (stats: OverallStats) => {
      setOverallStats(stats);
    },
    [setOverallStats]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100">
      <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} hasPeople={people.length > 0} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {currentScreen === 'input' && (
          <InputScreen
            people={people}
            onSave={handleSavePeople}
            onStartTraining={handleStartTraining}
            onClearAll={handleClearAll}
          />
        )}
        {currentScreen === 'training' && (
          <TrainingScreen
            people={people}
            overallStats={overallStats}
            onUpdateStats={handleUpdateStats}
            onGoToInput={() => setCurrentScreen('input')}
          />
        )}
        {currentScreen === 'stats' && (
          <StatsScreen
            overallStats={overallStats}
            people={people}
            onClearStats={clearStats}
          />
        )}
      </main>
    </div>
  );
}
