import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogIn, LogOut, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getFirebase } from "@/lib/firebase";
import { saveAttendance } from "@/lib/attendance-db";
import { haversineMeters } from "@/lib/haversine";
import { calcStatus, toDateId, type AttendanceDoc, type OfficeSettings } from "@/lib/attendance";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  today: AttendanceDoc | null;
  office: OfficeSettings;
  onSaved: () => void;
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 12_000, maximumAge: 0,
    });
  });
}

export function PunchButton({ today, office, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    mode: "in" | "out"; distance: number; pos: GeolocationPosition;
  }>(null);

  const hasIn = !!today?.punchInTime;
  const hasOut = !!today?.punchOutTime;
  const mode: "in" | "out" | "done" = !hasIn ? "in" : !hasOut ? "out" : "done";

  async function attempt() {
    if (mode === "done" || busy) return;
    setBusy(true);
    try {
      const pos = await getPosition();
      const distance = haversineMeters(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { lat: office.latitude, lng: office.longitude },
      );
      if (distance <= office.radiusMeters) {
        await commit(mode, pos, true);
      } else {
        setConfirm({ mode, distance, pos });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Location failed");
    } finally {
      setBusy(false);
    }
  }

  async function commit(m: "in" | "out", pos: GeolocationPosition, verified: boolean) {
    const { auth } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const now = new Date();
    const dateId = toDateId(now);
    const payload: Partial<AttendanceDoc> =
      m === "in"
        ? {
            punchInTime: now.toISOString(),
            punchInLat: pos.coords.latitude,
            punchInLng: pos.coords.longitude,
            punchInVerified: verified,
          }
        : {
            punchOutTime: now.toISOString(),
            punchOutLat: pos.coords.latitude,
            punchOutLng: pos.coords.longitude,
            punchOutVerified: verified,
          };
    const merged: AttendanceDoc = { ...(today ?? { date: dateId }), ...payload };
    merged.status = calcStatus(merged, office);
    await saveAttendance(uid, dateId, { ...payload, status: merged.status });
    toast.success(m === "in" ? "Punched in" : "Punched out", {
      description: verified ? "GPS verified" : "Manual (outside geofence)",
    });
    onSaved();
  }

  const label = mode === "in" ? "Punch In" : mode === "out" ? "Punch Out" : "Done for today";
  const Icon = mode === "in" ? LogIn : mode === "out" ? LogOut : MapPin;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={attempt}
        disabled={mode === "done" || busy}
        className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-lift transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
        <span>{busy ? "Locating…" : label}</span>
      </motion.button>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-status-late/40">
              <AlertTriangle className="h-6 w-6 text-status-late-fg" />
            </div>
            <DialogTitle className="text-center">Outside office geofence</DialogTitle>
            <DialogDescription className="text-center">
              You're about <b>{confirm ? Math.round(confirm.distance) : 0}m</b> from the saved office
              location (allowed radius: {office.radiusMeters}m). Punch anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                if (!confirm) return;
                setBusy(true);
                try { await commit(confirm.mode, confirm.pos, false); } finally { setBusy(false); setConfirm(null); }
              }}
            >
              Punch anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
