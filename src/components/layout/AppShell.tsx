"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccess, moduleForPath } from "@/lib/permissions";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLoginPage = pathname === "/login";
  const currentModule = moduleForPath(pathname);
  const allowed = !user || !currentModule || canAccess(user, currentModule);

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      router.replace("/login");
      return;
    }
    if (user && isLoginPage) {
      router.replace("/");
      return;
    }
    if (user && !allowed) {
      router.replace("/");
    }
  }, [loading, user, isLoginPage, allowed, router]);

  if (isLoginPage) return <>{children}</>;

  if (loading || !user || !allowed) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center text-sm text-zinc-400">Memuat…</div>
    );
  }

  return (
    <div className="flex min-h-full w-full">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex flex-1 flex-col overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
