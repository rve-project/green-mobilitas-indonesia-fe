"use client";

import { FormEvent, useMemo, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS, User, UserRole } from "@/lib/types";
import { MODULE_KEYS, MODULE_LABELS, MODULE_ROLES } from "@/lib/permissions";
import { Select } from "@/components/ui/Select";

const SELECTABLE_MODULES = MODULE_KEYS;

interface TambahUserModalProps {
  user?: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}

export function TambahUserModal({ user, onClose, onSaved }: TambahUserModalProps) {
  const isEdit = Boolean(user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState(user?.nama ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "staff");
  const [aktif, setAktif] = useState(user?.aktif ?? true);

  const availableModules = useMemo(() => SELECTABLE_MODULES.filter((m) => MODULE_ROLES[m].includes(role)), [role]);

  const [modules, setModules] = useState<Set<string>>(() => {
    const forRole = SELECTABLE_MODULES.filter((m) => MODULE_ROLES[m].includes(user?.role ?? "staff"));
    if (user?.allowedModules) {
      const allowed = new Set(user.allowedModules);
      return new Set(forRole.filter((m) => allowed.has(m)));
    }
    return new Set(forRole);
  });

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);
    setModules(new Set(SELECTABLE_MODULES.filter((m) => MODULE_ROLES[m].includes(nextRole))));
  }

  function toggleModule(m: string) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const allowedModules = Array.from(modules);
      const saved = isEdit
        ? await api.updateUser(user!.id, {
            nama,
            email,
            role,
            aktif,
            allowedModules,
            ...(password ? { password } : {}),
          })
        : await api.createUser({ nama, email, password, role, aktif, allowedModules });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit User" : "Tambah User"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Nama <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bengkelku.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Password {isEdit ? <span className="text-zinc-400">(kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}
            </span>
            <input
              required={!isEdit}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Masukkan password baru" : "Masukkan password"}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Role</span>
            <Select
              value={role}
              onChange={(v) => handleRoleChange(v as UserRole)}
              options={USER_ROLE_OPTIONS.map((r) => ({ value: r, label: USER_ROLE_LABELS[r] }))}
            />
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">Akses Menu</span>
              <div className="flex gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setModules(new Set(availableModules))}
                  className="text-green-600 hover:underline"
                >
                  Pilih Semua
                </button>
                <button type="button" onClick={() => setModules(new Set())} className="text-zinc-400 hover:underline">
                  Kosongkan
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-zinc-200 p-3">
              {availableModules.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={modules.has(m)}
                    onChange={() => toggleModule(m)}
                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                  />
                  {MODULE_LABELS[m]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Menu yang tidak dicentang tidak akan tampil untuk user ini.</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
            />
            Aktif
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : isEdit ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
