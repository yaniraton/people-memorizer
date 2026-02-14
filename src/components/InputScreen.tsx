import { useState, useCallback } from 'react';
import type { Person, ParseError } from '../types';
import { parsePeopleText } from '../utils/parser';

interface InputScreenProps {
  people: Person[];
  onSave: (people: Person[]) => void;
  onStartTraining: () => void;
  onClearAll: () => void;
}

export function InputScreen({ people, onSave, onStartTraining, onClearAll }: InputScreenProps) {
  const [text, setText] = useState('');
  const [parsedPeople, setParsedPeople] = useState<Person[] | null>(null);
  const [parseError, setParseError] = useState<ParseError | null>(null);

  const handleParse = useCallback(() => {
    const result = parsePeopleText(text);
    if (result.success) {
      setParsedPeople(result.people);
      setParseError(null);
    } else {
      setParsedPeople(null);
      setParseError(result.error);
    }
  }, [text]);

  const handleSave = useCallback(() => {
    if (parsedPeople) {
      onSave(parsedPeople);
      setParsedPeople(null);
      setText('');
    }
  }, [parsedPeople, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleParse();
      }
    },
    [handleParse]
  );

  return (
    <div className="space-y-6">
      {/* Existing saved people */}
      {people.length > 0 && !parsedPeople && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800">
              רשימה שמורה ({people.length} אנשים)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={onStartTraining}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                התחל אימון
              </button>
              <button
                onClick={onClearAll}
                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                נקה הכל
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">הזנת נתונים</h2>
        <p className="text-sm text-slate-500 mb-3">
          הדבק טקסט בפורמט: שם, הורים (מופרדים ברווח), אחים (מופרדים ברווח). כל אדם ב-3 שורות, מופרדים בשורה ריקה.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`זיו\nרותם טל\nנועה עמית\n\nשלומי\nרוני רן\nבן`}
          className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm font-mono resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          dir="rtl"
          aria-label="טקסט קלט אנשים"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            נתח טקסט
          </button>
          <span className="text-xs text-slate-400">Ctrl+Enter לניתוח מהיר</span>
        </div>
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5" role="alert">
          <h3 className="text-red-700 font-semibold mb-2">שגיאת ניתוח</h3>
          <p className="text-red-600 text-sm mb-3">{parseError.message}</p>
          {parseError.remainderLines.length > 0 && (
            <div className="bg-red-100 rounded-lg p-3">
              <p className="text-xs text-red-500 mb-1 font-medium">השורות הבעייתיות:</p>
              {parseError.remainderLines.map((line, i) => (
                <p key={i} className="text-sm text-red-700 font-mono">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parse results preview */}
      {parsedPeople && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-emerald-800 font-semibold">
              נטענו {parsedPeople.length} אנשים
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                שמור רשימה
              </button>
              <button
                onClick={() => {
                  handleSave();
                  onStartTraining();
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                התחל אימון
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {parsedPeople.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  return (
    <div className="bg-white/70 rounded-lg p-3 border border-slate-100">
      <div className="font-semibold text-slate-800">{person.name}</div>
      <div className="text-sm text-slate-500 mt-1">
        <span className="font-medium text-slate-600">הורים: </span>
        {person.parents.join(', ')}
      </div>
      <div className="text-sm text-slate-500">
        <span className="font-medium text-slate-600">אחים: </span>
        {person.siblings.length > 0 ? person.siblings.join(', ') : 'אין'}
      </div>
    </div>
  );
}
