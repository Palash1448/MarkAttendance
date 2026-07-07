import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getOfficeSettings, saveOfficeSettings } from "@/lib/attendance-db";
import { DEFAULT_OFFICE, type OfficeSettings } from "@/lib/attendance";
import { getFirebase } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Settings — Attendance Tracker" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<OfficeSettings>(DEFAULT_OFFICE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);


  useEffect(() => {
    if (!user) return;
    void getOfficeSettings(user.uid).then((c) => { setCfg(c); setLoading(false); });
  }, [user]);

  function set<K extends keyof OfficeSettings>(k: K, v: OfficeSettings[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await saveOfficeSettings(user.uid, cfg);
      toast.success("Settings saved");
    } finally { setSaving(false); }
  }

  async function captureLocation() {
    setCapturing(true);
    try {
      const pos: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 12_000, maximumAge: 0,
        });
      });
      set("latitude", pos.coords.latitude);
      set("longitude", pos.coords.longitude);
      toast.success("Office location captured", {
        description: `Accuracy: ±${Math.round(pos.coords.accuracy)}m`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Location failed");
    } finally { setCapturing(false); }
  }

  function signOutNow() { void signOut(getFirebase().auth); }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Configure</p>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-lg">Office location</h2>
        <p className="mt-1 text-sm text-muted-foreground">Stand at your office and capture, or edit coords manually.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" type="number" step="any" value={cfg.latitude}
              onChange={(e) => set("latitude", Number(e.target.value))} className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" type="number" step="any" value={cfg.longitude}
              onChange={(e) => set("longitude", Number(e.target.value))} className="mt-1 h-11" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="radius">Geofence radius (meters)</Label>
            <Input id="radius" type="number" min={20} max={2000} value={cfg.radiusMeters}
              onChange={(e) => set("radiusMeters", Number(e.target.value))} className="mt-1 h-11" />
          </div>
        </div>

        <Button variant="outline" className="mt-4 h-11 w-full" onClick={captureLocation} disabled={capturing}>
          {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {capturing ? "Capturing…" : "Capture current location"}
        </Button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-lg">Working hours</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ws">Start</Label>
            <Input id="ws" type="time" value={cfg.workStart} onChange={(e) => set("workStart", e.target.value)} className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="we">End</Label>
            <Input id="we" type="time" value={cfg.workEnd} onChange={(e) => set("workEnd", e.target.value)} className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="grace">Grace (minutes)</Label>
            <Input id="grace" type="number" value={cfg.graceMinutes} onChange={(e) => set("graceMinutes", Number(e.target.value))} className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="hd">Half-day min hrs</Label>
            <Input id="hd" type="number" step="0.5" value={cfg.halfDayMinHours} onChange={(e) => set("halfDayMinHours", Number(e.target.value))} className="mt-1 h-11" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="fd">Full-day min hrs</Label>
            <Input id="fd" type="number" step="0.5" value={cfg.fullDayMinHours} onChange={(e) => set("fullDayMinHours", Number(e.target.value))} className="mt-1 h-11" />
          </div>
        </div>
      </section>



      <Button className="h-12 w-full text-base" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>

      <Button variant="outline" className="h-11 w-full" onClick={signOutNow}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
