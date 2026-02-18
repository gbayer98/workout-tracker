"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  username: string;
  value: number;
  unit: string;
  date?: string;
  isCurrentUser: boolean;
}

interface LeaderboardCategory {
  id: string;
  name: string;
  metric: string;
  rule: string;
  entries: LeaderboardEntry[];
}

export default function LeaderboardClient() {
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setCategories(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Loading leaderboards...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Leaderboard</h2>
        <p className="text-sm text-muted mt-1">
          Compete across all accounts. Personal bests tracked automatically.
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-4 bg-card rounded-xl border border-card-border"
          >
            <div className="mb-3">
              <h3 className="font-semibold text-lg">{cat.name}</h3>
              <p className="text-xs text-muted mt-0.5">{cat.rule}</p>
            </div>

            {cat.entries.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">
                No qualifying entries yet. Be the first!
              </p>
            ) : (
              <div className="space-y-1.5">
                {cat.entries.map((entry, i) => {
                  const medal =
                    i === 0
                      ? "\u{1F947}"
                      : i === 1
                      ? "\u{1F948}"
                      : i === 2
                      ? "\u{1F949}"
                      : `#${i + 1}`;

                  return (
                    <div
                      key={`${entry.username}-${i}`}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${
                        entry.isCurrentUser
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-input-bg"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-8 text-center">
                          {medal}
                        </span>
                        <span
                          className={`font-medium ${
                            entry.isCurrentUser ? "text-primary" : ""
                          }`}
                        >
                          {entry.username}
                          {entry.isCurrentUser && (
                            <span className="text-xs ml-1 text-primary/70">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {entry.value} {entry.unit}
                        </p>
                        {entry.date && (
                          <p className="text-xs text-muted">{entry.date}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
