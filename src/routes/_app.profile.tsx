import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Calendar, Key, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getFirebase } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail, signOut } from "firebase/auth";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Attendance Tracker" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  if (!user) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  // Get initials for avatar placeholder
  const getInitials = () => {
    if (displayName) {
      const parts = displayName.split(" ");
      return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
    }
    return user.email ? user.email.slice(0, 2).toUpperCase() : "U";
  };

  // Format member since date
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile(user, { displayName });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  }

  async function handlePasswordReset() {
    if (!user.email) return;
    setSendingReset(true);
    try {
      const { auth } = getFirebase();
      await sendPasswordResetEmail(auth, user.email);
      toast.success("Password reset email sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  }

  function handleSignOut() {
    const { auth } = getFirebase();
    void signOut(auth);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Manage Account</p>
        <h1 className="text-2xl">Profile</h1>
      </header>

      {/* Avatar Card */}
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-lift">
          {getInitials()}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {user.displayName || "User"}
          </h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Profile Details Form */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-lg mb-4">Edit Profile</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="pl-10 h-11"
              />
            </div>
          </div>

          <Button type="submit" disabled={updating} className="h-11 w-full text-base">
            {updating ? "Saving Changes…" : "Save Changes"}
          </Button>
        </form>
      </section>

      {/* Account Info details */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4">
        <h3 className="text-lg">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Mail className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="text-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Since</p>
              <p className="text-foreground">{memberSince}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Actions */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4">
        <h3 className="text-lg">Security & Sessions</h3>
        <p className="text-xs text-muted-foreground">
          Update security settings and log out of the session.
        </p>

        <Button
          variant="outline"
          className="h-11 w-full justify-start gap-2"
          onClick={handlePasswordReset}
          disabled={sendingReset}
        >
          <Key className="h-4 w-4 text-primary" />
          <span>{sendingReset ? "Sending Reset Email…" : "Send Password Reset Email"}</span>
        </Button>

        <Button
          variant="destructive"
          className="h-11 w-full justify-start gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </section>
    </div>
  );
}
