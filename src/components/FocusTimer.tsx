import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save, Flame, Clock, Sparkles, Check, Target, Maximize2, Minimize2 } from 'lucide-react';
import { Note } from '../types';

interface FocusTimerProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onToggleFullFocusMode?: () => void;
  isFullFocusMode?: boolean;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  note,
  onUpdateNote,
  onToggleFullFocusMode,
  isFullFocusMode = false
}) => {
  const [isActive, setIsActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalSavedSeconds, setTotalSavedSeconds] = useState(note.focus_time_seconds || 0);
  const [targetMinutes, setTargetMinutes] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync prop note updates
  useEffect(() => {
    if (note) {
      setTotalSavedSeconds(note.focus_time_seconds || 0);
    }
  }, [note.id, note.focus_time_seconds]);

  // Timer interval tick
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Save focus session to SQLite database
  const handleSaveSession = async () => {
    if (sessionSeconds === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    const newTotalSeconds = totalSavedSeconds + sessionSeconds;

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_time_seconds: newTotalSeconds
        })
      });

      const data = await response.json();
      if (data.success && data.note) {
        onUpdateNote(data.note);
        setTotalSavedSeconds(newTotalSeconds);
        setSessionSeconds(0);
        setIsActive(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Error saving focus timer session:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSession = () => {
    setIsActive(false);
    setSessionSeconds(0);
  };

  const targetSeconds = targetMinutes * 60;
  const progressPercent = Math.min(100, Math.round((sessionSeconds / targetSeconds) * 100));

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isActive 
        ? 'bg-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-950/40' 
        : 'bg-slate-950/80 border-slate-800'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isActive 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' 
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}>
            <Flame className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5">
                Focus Mode Reading Timer
              </h3>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold animate-pulse">
                  Session Active
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Total Focused Reading: <span className="text-emerald-400 font-semibold">{formatTime(totalSavedSeconds)}</span>
            </p>
          </div>
        </div>

        {/* Center / Right Live Stopwatch & Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* Stopwatch Display */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono font-bold text-lg sm:text-xl text-emerald-300 shadow-inner min-w-[90px] text-center">
            {formatTime(sessionSeconds)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer shadow-md ${
                isActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start Focus
                </>
              )}
            </button>

            {sessionSeconds > 0 && (
              <>
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition cursor-pointer shadow-md disabled:opacity-50"
                  title="Save current reading session duration to SQLite database"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Time'}
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetSession}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                  title="Reset session timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            {onToggleFullFocusMode && (
              <button
                onClick={onToggleFullFocusMode}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isFullFocusMode
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-100 border-slate-800'
                }`}
                title={isFullFocusMode ? 'Exit Full Focus Mode' : 'Toggle Distraction-Free Focus Overlay'}
              >
                {isFullFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Target Progress Bar when Session is active */}
      {sessionSeconds > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-400" /> Goal: {targetMinutes} min study session
            </span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
