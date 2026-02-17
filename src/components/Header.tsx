"use client";

import { signOut } from "next-auth/react";

export default function Header({ username }: { username: string }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-card">
      <h1 className="text-lg font-bold">Workout Tracker</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">{username}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-danger hover:text-danger-hover transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
