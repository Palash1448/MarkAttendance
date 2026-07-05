import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths, endOfMonth, format, startOfMonth, subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getAttendanceRange, getOfficeSettings,
} from "@/lib/attendance-db";
import {
  calcStatus, hoursBetween, isWeekend, toDateId,
  type AttendanceDoc, type OfficeSettings, type Status,
} from "@/lib/attendance";
import { exportPdf } from "@/lib/pdf-export";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Attendance Tracker" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [docs, setDocs] = useState<AttendanceDoc[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(toDateId(startOfMonth(new Date())));
  const [rangeTo, setRangeTo] = useState(toDateId(endOfMonth(new Date())));
  const uid = user?.uid;

  const reload = useCallback(async () => {
    if (!uid) return;
    const cfg = await getOfficeSettings(uid);
    setOffice(cfg);
    const from = toDateId(startOfMonth(month));
    const to = toDateId(endOfMonth(month));
    setDocs(await getAttendanceRange(uid, from, to));
  }, [uid, month]);

  useEffect(() => { void reload(); }, [reload]);

  const stats = useMemo(() => {
    if (!office) return { present: 0, late: 0, half: 0, absent: 0, leave: 0, totalHrs: 0, avgHrs: 0, workedDays: 0 };
    const byId: Record<string, AttendanceDoc> = {};
    for (const d of docs) byId[d.date] = d;
    let present = 0, late = 0, half = 0, absent = 0, leave = 0, totalHrs = 0, workedDays = 0;
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const now = new Date();
    for (let d = new Date(first); d <= last; d = new Date(d.getTime() + 86400000)) {
      if (d > now) break;
      const id = toDateId(d);
      const doc = byId[id];
      const weekend = isWeekend(d);
      const status: Status = doc ? calcStatus(doc, office) : (weekend ? "leave" : "absent");
      const hrs = hoursBetween(doc?.punchInTime, doc?.punchOutTime);
      if (hrs > 0) { totalHrs += hrs; workedDays += 1; }
      if (status === "present") present++;
      else if (status === "late") late++;
      else if (status === "half_day") half++;
      else if (status === "leave") leave++;
      else if (status === "absent" && !weekend) absent++;
    }
    return { present, late, half, absent, leave, totalHrs, avgHrs: workedDays ? totalHrs / workedDays : 0, workedDays };
  }, [docs, office, month]);

  async function doExport() {
    if (!uid || !office) return;
    const range = await getAttendanceRange(uid, rangeFrom, rangeTo);
    exportPdf({
      email: user?.email ?? "",
      fromDate: rangeFrom, toDate: rangeTo,
      docs: range, office,
    });
    setExportOpen(false);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Overview</p>
        <h1 className="text-2xl">Dashboard</h1>
      </header>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-2 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{format(month, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Present" value={stats.present} tone="present" />
        <StatCard label="Late" value={stats.late} tone="late" />
        <StatCard label="Half day" value={stats.half} tone="halfday" />
        <StatCard label="Absent" value={stats.absent} tone="absent" />
        <StatCard label="Total hours" value={stats.totalHrs.toFixed(1)} tone="present" />
        <StatCard label="Avg hrs/day" value={stats.avgHrs.toFixed(2)} tone="late" />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Export report</h2>
            <p className="mt-1 text-sm text-muted-foreground">Download a clean PDF for any range.</p>
          </div>
          <Button onClick={() => {
            setRangeFrom(toDateId(startOfMonth(month)));
            setRangeTo(toDateId(endOfMonth(month)));
            setExportOpen(true);
          }} className="h-11">
            <FileDown className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export attendance</DialogTitle>
            <DialogDescription>Pick the date range to include.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="mt-1 h-11" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={doExport}>Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone: "present" | "late" | "halfday" | "absent" }) {
  const bg = {
    present: "bg-status-present/40 text-status-present-fg",
    late: "bg-status-late/40 text-status-late-fg",
    halfday: "bg-status-halfday/40 text-status-halfday-fg",
    absent: "bg-status-absent/25 text-status-absent-fg",
  }[tone];
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${bg}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
