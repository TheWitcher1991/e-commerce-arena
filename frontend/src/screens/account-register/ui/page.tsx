"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck, UsersRound, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerAccount } from "@/features/register-account";

type Role = "teacher" | "leader";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("teacher");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return <main className="min-h-screen bg-[#080b10]">
    <header className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-5 sm:px-9"><Link href="/" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-[#06130d]"><Zap size={19} /></span><span className="leading-tight"><span className="block text-[12px] font-bold tracking-[0.14em]">E-COMMERCE</span><span className="block text-[10px] tracking-[0.28em] text-[var(--green)]">ARENA</span></span></Link><Link href="/login" className="text-xs text-[#aab5c2] hover:text-white">Уже есть аккаунт? <span className="font-semibold text-[var(--green)]">Войти</span></Link></header>
    <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1120px] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] p-12 lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_25%,rgba(0,220,130,0.12),transparent_50%)]" /><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-[#28513d] bg-[#102019] px-3 py-1.5 text-[10px] text-[#a7d9ba]"><ShieldCheck size={13} />Учебное пространство</span><h1 className="mt-8 max-w-[380px] text-4xl font-semibold leading-[1.1] tracking-[-0.05em] text-white">Играйте в бизнес.<br /><span className="text-[var(--green)]">Учитесь на решениях.</span></h1><p className="mt-5 max-w-[350px] text-sm leading-6 text-[#92a0af]">Командный симулятор электронной коммерции для практических занятий и экономических экспериментов.</p></div><div className="relative grid grid-cols-2 gap-6 border-t border-[var(--border)] pt-6"><div><p className="text-lg font-semibold text-white">3 раунда</p><p className="mt-1 text-[11px] text-[#8190a1]">решений и последствий</p></div><div><p className="text-lg font-semibold text-white">1 сценарий</p><p className="mt-1 text-[11px] text-[#8190a1]">для командной игры</p></div></div></section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-[440px]">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-xs text-[#8997a8] hover:text-white lg:hidden"><ArrowLeft size={14} />На главную</Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Создание аккаунта</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Кто вы в Arena?</h2><p className="mt-2 text-xs leading-5 text-[#8997a8]">Выберите роль. Преподаватель управляет занятием, лидер создаёт и собирает команду.</p>
        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Выберите роль">
          <button type="button" role="radio" aria-checked={role === "teacher"} onClick={() => setRole("teacher")} className={`min-h-[104px] rounded-xl border p-4 text-left transition-colors ${role === "teacher" ? "border-[#39815c] bg-[#102019]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[#405063]"}`}><BookOpen size={18} className={role === "teacher" ? "text-[var(--green)]" : "text-[#8190a1]"} /><span className="mt-3 block text-xs font-semibold text-white">Преподаватель</span><span className="mt-1 block text-[10px] leading-4 text-[#8190a1]">Создавайте и ведите занятия</span></button>
          <button type="button" role="radio" aria-checked={role === "leader"} onClick={() => setRole("leader")} className={`min-h-[104px] rounded-xl border p-4 text-left transition-colors ${role === "leader" ? "border-[#39815c] bg-[#102019]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[#405063]"}`}><UsersRound size={18} className={role === "leader" ? "text-[var(--green)]" : "text-[#8190a1]"} /><span className="mt-3 block text-xs font-semibold text-white">Лидер команды</span><span className="mt-1 block text-[10px] leading-4 text-[#8190a1]">Создайте команду и пригласите ребят</span></button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError(""); try { const account = await registerAccount({ role, full_name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }); router.replace(account.role === "teacher" ? "/" : "/leader"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось создать аккаунт. Повторите попытку."); } finally { setPending(false); } }}>
          <div><label className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]" htmlFor="name">Имя и фамилия</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Как к вам обращаться" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#0e131b] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /></div>
          <div><label className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]" htmlFor="email">Электронная почта</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#0e131b] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /></div>
          <div><label className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]" htmlFor="password">Пароль</label><input id="password" type="password" autoComplete="new-password" required minLength={10} placeholder="Не менее 10 символов" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#0e131b] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /><p className="mt-1 text-[10px] text-[#748194]">Используйте не менее 10 символов.</p></div>
          {error && <p role="alert" className="text-xs leading-5 text-[#e4b96c]">{error}</p>}
          <button disabled={pending} className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] transition-colors hover:bg-[#2be99a] disabled:opacity-60">{pending ? "Создаём аккаунт…" : "Создать аккаунт"}<ArrowRight size={15} /></button>
          <p className="text-center text-[10px] leading-5 text-[#778597]">Продолжая, вы соглашаетесь с правилами использования учебной платформы.</p>
        </form>
      </div></section>
    </div>
  </main>;
}
