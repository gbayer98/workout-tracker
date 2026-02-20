"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to Workout Tracker!",
    body: "Track your lifts, build workouts, and crush your goals. Here's a quick overview of how it works.",
  },
  {
    title: "1. Create Your Lifts",
    body: "Head to the Lifts tab to browse exercises or create your own custom lifts. Each lift tracks your history over time.",
  },
  {
    title: "2. Build Workouts",
    body: "Go to the Workouts tab and group your lifts into workouts like \"Push Day\" or \"Legs\". You can reorder lifts and add new ones anytime.",
  },
  {
    title: "3. Start a Session",
    body: "Tap \"Start\" on any workout to begin tracking. Log your weight and reps for each set \u2014 a rest timer starts automatically between sets.",
  },
  {
    title: "You're All Set!",
    body: "Check the Home tab for stats, the Leaderboard for friendly competition, and the Weight tab to track body weight. Now go lift something heavy!",
  },
];

export default function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-card-border w-full max-w-sm p-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-card-border"
              }`}
            />
          ))}
        </div>

        <h2 className="text-lg font-bold text-center mb-2">{current.title}</h2>
        <p className="text-sm text-muted text-center leading-relaxed mb-6">
          {current.body}
        </p>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 text-sm text-muted hover:text-foreground border border-card-border rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                onDismiss();
              } else {
                setStep(step + 1);
              }
            }}
            className="flex-1 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {isLast ? "Let's Go!" : "Next"}
          </button>
        </div>

        {!isLast && (
          <button
            onClick={onDismiss}
            className="w-full mt-2 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
