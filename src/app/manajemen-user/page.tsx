"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { useAuth } from "@/lib/auth-context";
import { USER_ROLE_LABELS, User, UserRole } from "@/lib/types";
import { formatDateLong } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { TambahUserModal } from "@/components/user/TambahUserModal";
import { SortableTh, SortResetButton } from "@/components/ui/SortableTh";
import { useSort, compareMulti } from "@/lib/useSort";

type UserSortKey = "nama" | "email" | "role" | "dibuat" | "status";

const ROLE_ORDER: Record<UserRole, number> = {
  superadmin: 0,
  admin: 1,
  staff: 2,
};

export default function ManajemenUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [modalState, setModalState] = useState<{ open: boolean; edit?: User }>({ open: false });
  const [error, setError] = useState<string | null>(null);
  const { criteria, toggleSort, resetSort, isDefault } = useSort<UserSortKey>("nama", "asc");

  function sortValue(u: User, key: UserSortKey): string | number {
    switch (key) {
      case "nama":
        return u.nama.toLowerCase();
      case "email":
        return u.email.toLowerCase();
      case "role":
        return ROLE_ORDER[u.role];
      case "dibuat":
        return new Date(u.createdAt).getTime();
      case "status":
        return u.aktif ? 0 : 1;
    }
  }

  const sortedUsers = useMemo(() => {
    if (!users) return null;
    return [...users].sort((a, b) => compareMulti(a, b, criteria, sortValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, criteria]);

  function refresh() {
    api.users().then(setUsers).catch(() => setUsers([]));
  }

  useEffect(() => {
    if (currentUser && currentUser.role !== "superadmin") {
      router.replace("/");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function handleDelete(item: User) {
    if (!(await confirmDelete(`Hapus user "${item.nama}"?`))) return;
    setError(null);
    try {
      await api.deleteUser(item.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus user");
    }
  }

  if (currentUser && currentUser.role !== "superadmin") {
    return null;
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Manajemen User"
        subtitle="Kelola akun pengguna yang dapat mengakses aplikasi ini"
        action={
          <button
            type="button"
            onClick={() => setModalState({ open: true })}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Tambah User
          </button>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mb-4 flex justify-end">
          <SortResetButton visible={!isDefault} onReset={resetSort} />
        </div>

        {!sortedUsers ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : sortedUsers.length === 0 ? (
          <EmptyState label="Belum ada user" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <SortableTh label="Nama" sortKey="nama" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Email" sortKey="email" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Role" sortKey="role" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Dibuat" sortKey="dibuat" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" criteria={criteria} onSort={toggleSort} />
                  <th className="py-2 pr-0 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">
                      <span className="flex items-center gap-2">
                        {u.nama}
                        {u.id === currentUser?.id && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            Anda
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                          u.role === "superadmin"
                            ? "bg-violet-50 text-violet-600"
                            : u.role === "admin"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {u.role === "superadmin" && <ShieldCheck className="h-3 w-3" />}
                        {USER_ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          u.aktif ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                        )}
                      >
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 pr-0">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${u.nama}`}
                          onClick={() => setModalState({ open: true, edit: u })}
                          className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${u.nama}`}
                          onClick={() => handleDelete(u)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalState.open && (
        <TambahUserModal
          user={modalState.edit}
          onClose={() => setModalState({ open: false })}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
