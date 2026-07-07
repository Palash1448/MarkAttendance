import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, LayoutDashboard, Settings, User } from "lucide-react";

const items = [
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm rounded-full border border-white/50 bg-card/45 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.5)] p-1.5 transition-all duration-300">
      <ul className="mx-auto grid grid-cols-3 gap-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to || (to === "/calendar" && path === "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-full text-xs font-semibold transition-all duration-300 ${
                  active
                    ? "text-primary bg-primary/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.03)] scale-[1.03]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/20"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-300 ${active ? "stroke-[2.4] scale-110" : "opacity-80"}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
