"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { navSections, type NavItem } from "./nav-items";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  indent,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  indent?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={clsx(
        "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
        indent ? "pl-11 pr-3" : "px-3",
        active ? "bg-green-50 text-green-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      {!indent && <Icon className="h-[18px] w-[18px]" />}
      {item.label}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const childActive = item.children!.some((child) => isActive(pathname, child.href));
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          childActive ? "bg-green-50 text-green-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-[18px] w-[18px]" />
          {item.label}
        </span>
        <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <li key={child.href}>
              <NavLink item={child} pathname={pathname} indent onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !user || canAccess(user, item.module)),
    }))
    .filter((section) => section.items.length > 0);

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
          <Image src="/logo-gmi.png" alt="GM AutoHub" width={36} height={36} className="h-9 w-9 object-cover" />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-bold tracking-tight text-zinc-900">GM AUTOHUB</p>
          <p className="text-[10px] font-medium tracking-wide text-zinc-400">
            WORKSHOP MANAGEMENT SYSTEM
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) =>
                item.children ? (
                  <NavGroup key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
                ) : (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} onNavigate={onClose} />
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex print:hidden">{content}</aside>

      {/* Mobile off-canvas sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
