"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-sm ${className ?? "mb-2"}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-zinc-500 hover:text-green-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-zinc-900" : "text-zinc-500"}>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
