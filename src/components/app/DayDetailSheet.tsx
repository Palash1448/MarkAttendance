import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getFirebase } from "@/lib/firebase";
import { saveAttendance } from "@/lib/attendance-db";
import {
  calcStatus, fmtTime, hoursBetween, statusLabel, toDateId,
  type AttendanceDoc, type OfficeSettings, type Status,
} from "@/lib/attendance";
import { CheckCircle2, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  date: Date | null;
  data: AttendanceDoc | null;
  office: OfficeSettings;
  onClose: () => void;
  onSaved: () => void;
};

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DayDetailSheet({ date, data, office, onClose, onSaved }: Props) {
  const open = !!date;
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [manual, setManual] = useState<Status | "auto">("auto");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInTime(toLocalInput(data?.punchInTime));
    setOutTime(toLocalInput(data?.punchOutTime));
    setManual((data?.manualStatus as Status) ?? "auto");
  }, [data, date]);

  if (!date) return null;
  const dateId = toDateId(date);
  const isToday = dateId === toDateId(new Date());
  const hrs = hoursBetween(data?.punchInTime, data?.punchOutTime);
  const status = data ? calcStatus(data, office) : "absent";

  async function save() {
    const { auth } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    try {
      const payload: Partial<AttendanceDoc> = {
        punchInTime: inTime ? new Date(inTime).toISOString() : null,
        punchOutTime: outTime ? new Date(outTime).toISOString() : null,
        manualStatus: manual === "auto" ? null : manual,
      };
      const merged: AttendanceDoc = { ...(data ?? { date: dateId }), ...payload };
      merged.status = calcStatus(merged, office);
      await saveAttendance(uid, dateId, { ...payload, status: merged.status });
      toast.success("Saved");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function clearDay() {
    const { auth } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    try {
      await saveAttendance(uid, dateId, {
        punchInTime: null, punchInLat: null, punchInLng: null, punchInVerified: null,
        punchOutTime: null, punchOutLat: null, punchOutLng: null, punchOutVerified: null,
        manualStatus: null, status: "absent",
      });
      toast.success("Day cleared");
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </SheetTitle>
          <SheetDescription>
            Status: <b>{statusLabel(status)}</b> · Hours: {hrs.toFixed(2)}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 px-4 pb-2">
          <VerifyChip label={`In ${fmtTime(data?.punchInTime)}`} verified={data?.punchInVerified} />
          <VerifyChip label={`Out ${fmtTime(data?.punchOutTime)}`} verified={data?.punchOutVerified} />
        </div>

        {isToday ? (
          <div className="grid gap-4 p-4 pt-2">
            <div>
              <Label htmlFor="in">Punch in</Label>
              <Input id="in" type="datetime-local" value={inTime}
                onChange={(e) => setInTime(e.target.value)} className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="out">Punch out</Label>
              <Input id="out" type="datetime-local" value={outTime}
                onChange={(e) => setOutTime(e.target.value)} className="mt-1 h-11" />
            </div>
            <div>
              <Label>Override status</Label>
              <Select value={manual} onValueChange={(v) => setManual(v as Status | "auto")}>
                <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (based on punches)</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">Leave / Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2 flex gap-2">
              <Button variant="outline" onClick={clearDay} disabled={busy} className="h-11">
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <Button onClick={save} disabled={busy} className="h-11 flex-1">
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Attendance records can only be updated on the current date.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function VerifyChip({ label, verified }: { label: string; verified?: boolean | null }) {
  if (verified === null || verified === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs ${
      verified ? "bg-status-present/40 text-status-present-fg" : "bg-status-late/40 text-status-late-fg"
    }`}>
      {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </div>
  );
}
