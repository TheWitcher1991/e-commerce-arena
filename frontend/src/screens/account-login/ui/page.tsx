"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Zap } from "lucide-react";
import { loginAccount } from "@/entities/account";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,220,130,0.08),transparent_45%),var(--bg)] px-5 py-12">
    <section className="w-full max-w-[420px]">
      <Link href="/" className="mx-auto mb-10 flex w-fit items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-[#06130d]"><Zap size={19} /></span><span className="leading-tight"><span className="block text-[12px] font-bold tracking-[0.14em]">E-COMMERCE</span><span className="block text-[10px] tracking-[0.28em] text-[var(--green)]">ARENA</span></span></Link>
      <div className="rounded-2xl border border-[var(--border)] bg-[#0e131b] p-6 sm:p-8"><span className="flex size-10 items-center justify-center rounded-xl bg-[#16251e] text-[var(--green)]"><KeyRound size={18} /></span><h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">С возвращением</h1><p className="mt-2 text-xs text-[#8997a8]">Войдите в кабинет преподавателя или лидера команды.</p>
        <form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setMessage(""); try { const account = await loginAccount({ email: String(form.get("email")), password: String(form.get("password")) }); router.replace(account.role === "teacher" ? "/" : "/leader"); } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось войти. Повторите попытку."); } finally { setPending(false); } }}><div><label htmlFor="email" className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]">Электронная почта</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#090d13] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /></div><div><div className="mb-1.5 flex justify-between"><label htmlFor="password" className="text-[11px] font-medium text-[#cbd4de]">Пароль</label></div><input id="password" name="password" type="password" autoComplete="current-password" required minLength={1} placeholder="Введите пароль" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#090d13] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /></div>{message && <p role="alert" className="rounded-lg border border-[#493d27] bg-[#211c12] p-3 text-xs leading-5 text-[#e5c16f]">{message}</p>}<button disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] disabled:opacity-60">{pending ? "Входим…" : "Войти"}<ArrowRight size={15} /></button></form>
        <div className="my-5 border-t border-[var(--border)]" />
        <Link href="/join" className="flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-medium text-[#c4cdd7] hover:bg-[#17202b]">Я участник — у меня есть код команды</Link>
        <p className="mt-5 text-center text-xs text-[#8997a8]">Нет аккаунта? <Link href="/register" className="font-semibold text-[var(--green)] hover:text-[#4af0a5]">Зарегистрироваться</Link></p>
      </div><Link href="/join" className="mt-5 block text-center text-xs text-[#8492a3] hover:text-white">Участник? Присоединиться к команде</Link>
    </section>
  </main>;
}
