"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home", icon: "\u{1F3E0}" },
  { href: "/lifts", label: "Lifts", icon: "\u{1F4AA}" },
  { href: "/workouts", label: "Workouts", icon: "\u{1F4CB}" },
  { href: "/weight", label: "Weight", icon: "\u2696\uFE0F" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[56px] justify-center transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
