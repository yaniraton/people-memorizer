import type { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  hasPeople: boolean;
}

const tabs: { id: Screen; label: string }[] = [
  { id: 'input', label: 'קלט' },
  { id: 'training', label: 'אימון' },
  { id: 'stats', label: 'סטטיסטיקות' },
];

export function Navigation({ currentScreen, onNavigate, hasPeople }: NavigationProps) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-indigo-600">זכור אנשים</h1>
          <nav className="flex gap-1" role="navigation" aria-label="ניווט ראשי">
            {tabs.map((tab) => {
              const disabled = (tab.id === 'training' || tab.id === 'stats') && !hasPeople;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  disabled={disabled}
                  aria-current={currentScreen === tab.id ? 'page' : undefined}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentScreen === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
