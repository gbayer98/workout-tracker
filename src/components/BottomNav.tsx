"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Bar */}
      <line x1="2" y1="12" x2="22" y2="12" />
      {/* Left plates */}
      <rect x="4" y="7" width="3" height="10" rx="0.5" />
      <rect x="7" y="8.5" width="2" height="7" rx="0.5" />
      {/* Right plates */}
      <rect x="17" y="7" width="3" height="10" rx="0.5" />
      <rect x="15" y="8.5" width="2" height="7" rx="0.5" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Scale body */}
      <rect x="3" y="5" width="18" height="16" rx="3" />
      {/* Display window */}
      <rect x="7" y="8" width="10" height="5" rx="1" />
      {/* Dial line */}
      <line x1="12" y1="9" x2="14.5" y2="11" />
      {/* Base/feet */}
      <line x1="6" y1="21" x2="8" y2="21" />
      <line x1="16" y1="21" x2="18" y2="21" />
    </svg>
  );
}

function RunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Head */}
      <circle cx="13" cy="3.5" r="2" />
      {/* Torso leaning forward */}
      <path d="M11 7l-2 6" />
      {/* Front arm (reaching forward) */}
      <path d="M11 7l3.5-1.5" />
      {/* Back arm (swinging back) */}
      <path d="M10.5 9l-3.5 1" />
      {/* Front leg (extended behind) */}
      <path d="M9 13l-3 4.5-2.5 1" />
      {/* Back leg (stepping forward) */}
      <path d="M9 13l2 4 3.5 3" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M6 3h12v6a6 6 0 0 1-12 0V3z" />
      <path d="M12 15v3" />
      <path d="M8 21h8" />
      <path d="M10 18h4" />
    </svg>
  );
}

const tabs = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/lifts", label: "Lifts", Icon: DumbbellIcon },
  { href: "/workouts", label: "Workouts", Icon: ClipboardIcon },
  { href: "/weight", label: "Weight", Icon: ScaleIcon },
  { href: "/movement", label: "Move", Icon: RunIcon },
  { href: "/leaderboard", label: "Board", Icon: TrophyIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border backdrop-blur-sm">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 min-h-[52px] justify-center transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              <tab.Icon />
              <span className="text-[10px] font-medium mt-1 tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
