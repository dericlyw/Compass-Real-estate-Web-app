"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Overview"],
  ["/project", "Project Intelligence"],
  ["/campaign", "Campaign Plan"],
  ["/engine", "Content Engine"],
  ["/approvals", "Approval Queue"],
  ["/launch-kit", "Launch Kit"],
  ["/leads", "Lead Inbox"],
  ["/appointments", "Appointments"],
  ["/report", "Leadership Report"],
  ["/audit", "Audit Log"],
  ["/settings", "Settings"],
] as const;

export function Nav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map(([href, label]) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
              active ? "bg-ink-700 text-gold" : "text-bone-muted hover:bg-ink-800 hover:text-bone"
            }`}
          >
            <span>{label}</span>
            {counts[href] ? <span className="ml-3 rounded-full bg-gold/15 px-2 text-[11px] text-gold">{counts[href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
