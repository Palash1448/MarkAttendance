export type Status = "present" | "late" | "half_day" | "absent" | "leave";

export interface OfficeSettings {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStart: string; // "HH:mm"
  workEnd: string;   // "HH:mm"
  graceMinutes: number;
  halfDayMinHours: number;
  fullDayMinHours: number;
}

export const DEFAULT_OFFICE: OfficeSettings = {
  latitude: 16.84673764732789,
  longitude: 74.59862801649298,
  radiusMeters: 150,
  workStart: "09:00",
  workEnd: "18:00",
  graceMinutes: 15,
  halfDayMinHours: 4,
  fullDayMinHours: 8,
};

export interface AttendanceDoc {
  date: string; // YYYY-MM-DD
  punchInTime?: string | null;   // ISO
  punchInLat?: number | null;
  punchInLng?: number | null;
  punchInVerified?: boolean | null;
  punchOutTime?: string | null;  // ISO
  punchOutLat?: number | null;
  punchOutLng?: number | null;
  punchOutVerified?: boolean | null;
  status?: Status | null;
  notes?: string | null;
  manualStatus?: Status | null;
}

export function hoursBetween(inIso?: string | null, outIso?: string | null): number {
  if (!inIso || !outIso) return 0;
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  return Math.max(0, ms / 3_600_000);
}

function minutesFromClock(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export function calcStatus(doc: AttendanceDoc, cfg: OfficeSettings): Status {
  if (doc.manualStatus) return doc.manualStatus;
  if (!doc.punchInTime) return "absent";
  const d = new Date(doc.punchInTime);
  const punchInMin = d.getHours() * 60 + d.getMinutes();
  const graceCutoff = minutesFromClock(cfg.workStart) + cfg.graceMinutes;
  const hrs = hoursBetween(doc.punchInTime, doc.punchOutTime ?? null);
  if (punchInMin > graceCutoff) return "late";
  if (doc.punchOutTime) {
    if (hrs >= cfg.fullDayMinHours) return "present";
    if (hrs >= cfg.halfDayMinHours) return "half_day";
    return "half_day";
  }
  return "present";
}

export function statusLabel(s: Status): string {
  return {
    present: "Present",
    late: "Late",
    half_day: "Half Day",
    absent: "Absent",
    leave: "Leave",
  }[s];
}

export function toDateId(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0;
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
