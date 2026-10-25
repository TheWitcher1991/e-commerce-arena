"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CircleHelp, LayoutDashboard, LogOut, Menu, Plus, Settings2, UsersRound, X, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@/entities/account";
import { clearAccessToken } from "@/shared/api";
import { ApiError } from "@/shared/api/http";

const navigation = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/teacher/sessions", label: "Мои занятия", icon: BookOpen },
  { href: "/teacher/teams", label: "Команды", icon: UsersRound },
];

export function TeacherShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (account.error instanceof ApiError && [401, 403].includes(account.error.status)) router.replace("/login");
    if (account.data?.role === "leader") router.replace("/leader");
  }, [account.data?.role, account.error, router]);

  if (account.isPending || !account.data || account.data.role !== "teacher") {
    return <main className="grid min-h-screen place-items-center bg-[var(--bg)] text-sm text-[#8997a8]">Проверяем доступ…</main>;
  }

  const signOut = () => {
    clearAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {mobileOpen && <button aria-label="Закрыть меню" className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[var(--border)] bg-[#0b1017] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[var(--border)] px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="E-Commerce Arena, главная">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-[#06130d]"><Zap size={19} strokeWidth={2.6} /></span>
            <span className="leading-tight"><span className="block text-[13px] font-bold tracking-[0.14em] text-white">E-COMMERCE</span><span className="block text-[11px] tracking-[0.28em] text-[var(--green)]">ARENA</span></span>
          </Link>
          <button className="flex size-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] md:hidden" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню"><X size={18} /></button>
        </div>
        <div className="px-4 pt-7">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#647286]">Рабочее пространство</p>
          <nav className="space-y-1" aria-label="Основная навигация">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors ${active ? "bg-[#14231e] text-[var(--green)]" : "text-[#a5b0bd] hover:bg-[var(--surface-hover)] hover:text-white"}`}><Icon size={17} strokeWidth={1.8} />{label}{active && <span className="ml-auto size-1.5 rounded-full bg-[var(--green)]" />}</Link>;
            })}
          </nav>
        </div>
        <div className="mt-8 px-4">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#647286]">Быстрый доступ</p>
          <Link href="/teacher/sessions/new" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] text-[#a5b0bd] transition-colors hover:bg-[var(--surface-hover)] hover:text-white"><Plus size={17} />Новое занятие</Link>
          <Link href="/teacher/teams" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] text-[#a5b0bd] transition-colors hover:bg-[var(--surface-hover)] hover:text-white"><UsersRound size={17} />Составы команд</Link>
        </div>
        <div className="mt-auto p-4">
          <div className="mb-3 rounded-xl border border-[#314b3e] bg-[#102019] p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[var(--green)]"><span className="size-1.5 rounded-full bg-[var(--green)]" />Рабочая сессия</div>
            <p className="text-xs leading-5 text-[#aab6b0]">Занятия и результаты сохраняются на сервере.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#263246] text-xs font-semibold text-white">{account.data.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{account.data.full_name}</span><span className="block text-[10px] text-[var(--muted)]">Преподаватель</span></span>
            <button onClick={signOut} className="flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white" aria-label="Выйти из аккаунта"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[var(--border)] bg-[#080b10]/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="flex size-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] md:hidden" aria-label="Открыть меню"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-xs text-[var(--muted)] sm:flex"><span>Кабинет преподавателя</span><span className="text-[#465365]">/</span><span className="text-[#e4e9ef]">{navigation.find((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))?.label ?? "Занятие"}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/join" className="hidden min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs text-[#c6ced8] transition-colors hover:border-[#405063] hover:bg-[var(--surface)] sm:flex"><UsersRound size={15} />Войти как участник</Link>
            <button aria-label="Справка" className="flex size-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white"><CircleHelp size={18} /></button>
            <Link href="/register" aria-label="Настройки аккаунта" className="flex size-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white"><Settings2 size={18} /></Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-9 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
