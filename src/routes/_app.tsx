import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClientOnly } from "@/components/app/ClientOnly";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/app/BottomNav";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <ClientOnly fallback={<Splash />}>
      <AuthProvider>
        <Gate>
          <div className="mx-auto min-h-dvh max-w-lg pb-24">
            <Outlet />
          </div>
          <BottomNav />
          <Toaster position="top-center" richColors />
        </Gate>
      </AuthProvider>
    </ClientOnly>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/login" });
  }, [user, loading, router]);
  if (loading || !user) return <Splash />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}
