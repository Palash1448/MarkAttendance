import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ClientOnly } from "@/components/app/ClientOnly";
import { AuthProvider, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <ClientOnly fallback={<Splash />}>
      <AuthProvider>
        <Redirector />
      </AuthProvider>
    </ClientOnly>
  );
}

function Redirector() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.navigate({ to: user ? "/calendar" : "/login" });
  }, [user, loading, router]);
  return <Splash />;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}
