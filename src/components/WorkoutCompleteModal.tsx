"use client";

import { useEffect, useState } from "react";

interface WorkoutSummary {
  workoutName: string;
  durationMin: number;
  totalSets: number;
  massMoved: number;
  bodyweightReps: number;
  leaderboardPositions: Array<{
    category: string;
    position: number;
    value: string;
  }>;
}

const MEDAL = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

function formatMass(lbs: number): string {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k`;
  return lbs.toLocaleString();
}

export default function WorkoutCompleteModal({
  summary,
  onDone,
}: {
  summary: WorkoutSummary;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    // Staggered entrance
    requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setShowStats(true), 400);
    const t2 = setTimeout(() => setShowLeaderboard(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Modal */}
      <div
        className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">
            {summary.leaderboardPositions.length > 0 ? "\u{1F525}" : "\u{1F4AA}"}
          </div>
          <h2 className="text-xl font-bold">Workout Complete!</h2>
          <p className="text-muted text-sm mt-1">{summary.workoutName}</p>
        </div>

        {/* Stats */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: showStats ? 1 : 0,
            transform: showStats ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-input-bg rounded-xl">
              <p className="text-2xl font-bold">{summary.durationMin}</p>
              <p className="text-xs text-muted">minutes</p>
            </div>
            <div className="text-center p-3 bg-input-bg rounded-xl">
              <p className="text-2xl font-bold">{summary.totalSets}</p>
              <p className="text-xs text-muted">sets</p>
            </div>
            {summary.massMoved > 0 && (
              <div className="text-center p-3 bg-input-bg rounded-xl col-span-2">
                <p className="text-3xl font-bold text-primary">
                  {formatMass(summary.massMoved)}
                </p>
                <p className="text-xs text-muted">lbs moved</p>
              </div>
            )}
            {summary.bodyweightReps > 0 && (
              <div className="text-center p-3 bg-input-bg rounded-xl col-span-2">
                <p className="text-3xl font-bold text-success">
                  {summary.bodyweightReps}
                </p>
                <p className="text-xs text-muted">bodyweight reps</p>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard positions */}
        {summary.leaderboardPositions.length > 0 && (
          <div
            className="transition-all duration-500 mb-4"
            style={{
              opacity: showLeaderboard ? 1 : 0,
              transform: showLeaderboard ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <div className="border-t border-card-border pt-4">
              <p className="text-sm font-semibold text-center mb-3 text-amber-400">
                Leaderboard Update
              </p>
              <div className="space-y-2">
                {summary.leaderboardPositions.map((pos) => (
                  <div
                    key={pos.category}
                    className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{MEDAL[pos.position - 1]}</span>
                      <span className="font-medium text-sm">{pos.category}</span>
                    </div>
                    <span className="text-sm font-bold">{pos.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors text-lg"
        >
          Nice!
        </button>
      </div>
    </div>
  );
}
