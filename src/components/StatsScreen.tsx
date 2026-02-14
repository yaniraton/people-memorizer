import type { OverallStats, Person } from '../types';

interface StatsScreenProps {
  overallStats: OverallStats;
  people: Person[];
  onClearStats: () => void;
}

export function StatsScreen({ overallStats, people, onClearStats }: StatsScreenProps) {
  const overallAccuracy =
    overallStats.totalQuestions > 0
      ? ((overallStats.totalCorrect / overallStats.totalQuestions) * 100).toFixed(1)
      : '0';

  // Build person stats list, sorted by accuracy (ascending = needs most practice first)
  const personStatsList = Object.values(overallStats.personStats)
    .map((ps) => {
      // Try to find the person in the current list to ensure name is up to date
      const person = people.find((p) => p.id === ps.personId);
      return {
        ...ps,
        name: person?.name ?? ps.name,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="space-y-6">
      {/* Overall stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">סטטיסטיקות כלליות</h2>
          <button
            onClick={onClearStats}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            אפס סטטיסטיקות
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <OverallStatCard label="אימונים" value={overallStats.totalSessions} />
          <OverallStatCard label="שאלות" value={overallStats.totalQuestions} />
          <OverallStatCard label="תשובות נכונות" value={overallStats.totalCorrect} />
          <OverallStatCard label="דיוק כולל" value={`${overallAccuracy}%`} />
        </div>
      </div>

      {/* Per-person stats */}
      {personStatsList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            סטטיסטיקות לפי אדם
            <span className="text-sm font-normal text-slate-400 mr-2">
              (ממוין לפי צורך בתרגול)
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-2 px-3 font-medium text-slate-600">שם</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">נשאל</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">נכון</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">דיוק</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">מצב</th>
                </tr>
              </thead>
              <tbody>
                {personStatsList.map((ps) => (
                  <tr key={ps.personId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{ps.name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{ps.timesAsked}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{ps.timesCorrect}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-medium ${
                          ps.accuracy >= 80
                            ? 'text-emerald-600'
                            : ps.accuracy >= 50
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {ps.accuracy.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <AccuracyBadge accuracy={ps.accuracy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {personStatsList.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>אין סטטיסטיקות עדיין. התחל אימון כדי לראות נתונים.</p>
        </div>
      )}
    </div>
  );
}

function OverallStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  if (accuracy >= 80) {
    return (
      <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
        מצוין
      </span>
    );
  }
  if (accuracy >= 50) {
    return (
      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
        בינוני
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
      צריך תרגול
    </span>
  );
}
