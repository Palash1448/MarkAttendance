import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, MapPin } from "lucide-react";
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getFirebase } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  getAttendanceRange, getOfficeSettings,
} from "@/lib/attendance-db";
import {
  calcStatus, isWeekend, statusLabel, toDateId,
  type AttendanceDoc, type OfficeSettings, type Status,
} from "@/lib/attendance";
import { PunchButton } from "@/components/app/PunchButton";
import { DayDetailSheet } from "@/components/app/DayDetailSheet";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Attendance Tracker" }] }),
  component: CalendarPage,
});

const STATUS_CLASSES: Record<Status | "weekend" | "empty", string> = {
  present: "bg-status-present/70 text-status-present-fg",
  late: "bg-status-late/70 text-status-late-fg",
  half_day: "bg-status-halfday/70 text-status-halfday-fg",
  absent: "bg-status-absent/80 text-status-absent-fg",
  leave: "bg-status-leave/70 text-status-leave-fg",
  weekend: "bg-status-weekend text-status-weekend-fg",
  empty: "bg-card text-foreground",
};

function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [byDate, setByDate] = useState<Record<string, AttendanceDoc>>({});
  const [selected, setSelected] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const monthKey = format(month, "yyyy-MM");
  const uid = user?.uid;

  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const cfg = await getOfficeSettings(uid);
    setOffice(cfg);
    const from = toDateId(startOfMonth(subMonths(month, 1)));
    const to = toDateId(endOfMonth(addMonths(month, 1)));
    const docs = await getAttendanceRange(uid, from, to);
    const map: Record<string, AttendanceDoc> = {};
    for (const d of docs) map[d.date] = d;
    setByDate(map);
    setLoading(false);
  }, [uid, monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void reload(); }, [reload]);

  const days = useMemo(() => {
    const s = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const e = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = s; d <= e; d = new Date(d.getTime() + 24 * 3600 * 1000)) out.push(new Date(d));
    return out;
  }, [month]);

  const today = new Date();
  const todayDoc = byDate[toDateId(today)] ?? null;

  function signOutNow() {
    const { auth } = getFirebase();
    void signOut(auth);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance</p>
          <h1 className="text-2xl">{format(month, "MMMM yyyy")}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={signOutNow} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
        <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-7 gap-1"
        >
          {days.map((d) => {
            const id = toDateId(d);
            const doc = byDate[id];
            const inMonth = isSameMonth(d, month);
            const weekend = isWeekend(d);
            let status: Status | "weekend" | "empty" =
              doc ? calcStatus(doc, office ?? undefined as unknown as OfficeSettings) : (weekend ? "weekend" : (d < today ? "absent" : "empty"));
            if (!inMonth) status = "empty";
            const isToday = isSameDay(d, today);
            return (
              <button
                key={id}
                onClick={() => setSelected(d)}
                className={`relative aspect-square rounded-xl p-1 text-left text-xs transition ${STATUS_CLASSES[status]} ${
                  !inMonth ? "opacity-30" : "hover:brightness-105 active:scale-95"
                } ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                <span className="text-[13px] font-semibold">{d.getDate()}</span>
                {doc?.punchInVerified === false && (
                  <MapPin className="absolute right-1 top-1 h-3 w-3 opacity-70" />
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <Legend />

      <div className="sticky bottom-24 mt-2 rounded-3xl border border-border bg-card/95 p-4 shadow-lift backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Today</p>
            <p className="font-semibold">{format(today, "EEEE, MMM d")}</p>
          </div>
          <StatusPill status={todayDoc ? calcStatus(todayDoc, office ?? undefined as unknown as OfficeSettings) : (isWeekend(today) ? "leave" : "absent")} />
        </div>
        {office ? (
          <PunchButton today={todayDoc} office={office} onSaved={reload} />
        ) : (
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        )}
        {loading && <p className="mt-2 text-center text-[11px] text-muted-foreground">Syncing…</p>}
      </div>

      <DayDetailSheet
        date={selected}
        data={selected ? byDate[toDateId(selected)] ?? null : null}
        office={office ?? { latitude: 0, longitude: 0, radiusMeters: 150, workStart: "09:00", workEnd: "18:00", graceMinutes: 15, halfDayMinHours: 4, fullDayMinHours: 8 }}
        onClose={() => setSelected(null)}
        onSaved={reload}
      />
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const cls = STATUS_CLASSES[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{statusLabel(status)}</span>;
}

function Legend() {
  const items: { s: Status | "weekend"; label: string }[] = [
    { s: "present", label: "Present" },
    { s: "late", label: "Late" },
    { s: "half_day", label: "Half" },
    { s: "absent", label: "Absent" },
    { s: "leave", label: "Leave" },
    { s: "weekend", label: "Off" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(({ s, label }) => (
        <span key={s} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_CLASSES[s]}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
