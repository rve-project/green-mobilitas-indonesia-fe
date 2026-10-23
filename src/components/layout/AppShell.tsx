"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccess, moduleForPath } from "@/lib/permissions";
import { navSections } from "./nav-items";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** First sidebar link (in on-screen order) whose module this user actually has -- where a
 * user without dashboard access lands instead of being stuck on "/", and where a user on
 * some other now-disallowed page lands too. Null means the user has no menu access at all. */
function firstAccessibleHref(user: Parameters<typeof canAccess>[0]): string | null {
  for (const section of navSections) {
    for (const item of section.items) {
      if (canAccess(user, item.module)) return item.href;
    }
  }
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLoginPage = pathname === "/login";
  const currentModule = moduleForPath(pathname);
  const allowed = !user || !currentModule || canAccess(user, currentModule);
  const fallbackHref = user ? firstAccessibleHref(user) : null;

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      router.replace("/login");
      return;
    }
    if (user && isLoginPage) {
      router.replace(fallbackHref ?? "/");
      return;
    }
    if (user && !allowed && fallbackHref && fallbackHref !== pathname) {
      router.replace(fallbackHref);
    }
  }, [loading, user, isLoginPage, allowed, fallbackHref, pathname, router]);

  if (isLoginPage) return <>{children}</>;

  // No menu access at all is a real, if unusual, state (e.g. every module unchecked) --
  // show it plainly with a way out, rather than a spinner that never resolves.
  if (user && !allowed && !fallbackHref) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 text-sm text-zinc-500">
        <p>Akun ini belum diberi akses ke menu manapun.</p>
        <p className="text-zinc-400">Hubungi admin untuk mengatur akses, atau logout dan masuk dengan akun lain.</p>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Logout
        </button>
      </div>
    );
  }

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
        {/* overflow-x-hidden alone computes overflow-y to "auto" per the CSS spec (one
            axis non-visible forces the other to auto), and combined with the min-h-full/
            min-h-screen flex chain above, that gives `main` a DEFINITE height equal to the
            viewport -- fine for the normal dashboard (content scrolls, sidebar stays put),
            but it also clips/cuts off anything printed from inside it, since the print
            engine renders the box at that fixed height instead of letting content flow
            across pages. Reset both for print so a page's @page/print CSS can paginate the
            full content instead of just whatever fit in one viewport-height. */}
        <main className="flex flex-1 flex-col overflow-x-hidden print:h-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
