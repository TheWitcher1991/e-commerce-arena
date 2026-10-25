"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, CircleHelp, LockKeyhole, UsersRound } from "lucide-react";
import { useState } from "react";
import { TeacherShell } from "@/widgets/teacher-shell";
import { useCreateSession } from "@/features/create-session";

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const mutation = useCreateSession();
  return <TeacherShell>
    <Link href="/teacher/sessions" className="mb-5 inline-flex items-center gap-2 text-xs text-[#8c9aaa] hover:text-white"><ArrowLeft size={14} />Все занятия</Link>
    <div className="mx-auto max-w-[760px]">
      <div className="mb-8"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Настройка занятия · шаг 1 из 1</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Новое занятие</h1><p className="mt-2 max-w-[560px] text-sm leading-6 text-[#8d9aaa]">Создайте игровую сессию, затем пригласите команды по коду или ссылке.</p></div>
      <form className="space-y-7" onSubmit={(event) => { event.preventDefault(); mutation.mutate(title, { onSuccess: (session) => router.push(`/teacher/sessions/${session.id}`), onError: (e) => setError(e.message) }); }}>
        <section className="border-b border-[var(--border)] pb-7">
          <label htmlFor="session-title" className="mb-2 block text-sm font-semibold text-[#e7edf4]">Название занятия</label>
          <p className="mb-3 text-xs text-[#8593a4]">Название увидят участники, которым вы отправите приглашение.</p>
          <input id="session-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} minLength={3} required placeholder="Например, Запуск интернет-магазина" className="min-h-12 w-full rounded-xl border border-[#293544] bg-[#0e131b] px-4 text-sm text-white outline-none placeholder:text-[#5f6c7d] focus:border-[var(--green)]" />
          <div className="mt-1.5 flex justify-between text-[10px] text-[#697789]"><span>От 3 до 80 символов</span><span className="tabular-nums">{title.length}/80</span></div>
          {error && <p role="alert" className="mt-3 text-xs text-[#ee938b]">{error}</p>}
        </section>
        <section className="border-b border-[var(--border)] pb-7">
          <h2 className="text-sm font-semibold text-[#e7edf4]">Сценарий</h2><p className="mt-1 text-xs text-[#8593a4]">Для первой версии доступен базовый учебный сценарий.</p>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#31533f] bg-[#101e16] p-4"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[#07150c]"><Check size={13} strokeWidth={3} /></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white">Запуск интернет-магазина</h3><span className="rounded-full bg-[#1d392b] px-2 py-0.5 text-[9px] font-medium text-[#9fe1b8]">3 раунда · 45 минут</span></div><p className="mt-1 text-xs leading-5 text-[#9aa99f]">Выбор платформы, цены, оплаты, доставки и рекламы. Во втором раунде — общий кризис: стоимость клика растёт на 40%.</p></div><CircleHelp size={16} className="text-[#819189]" /></div>
        </section>
        <section className="border-b border-[var(--border)] pb-7">
          <h2 className="text-sm font-semibold text-[#e7edf4]">Доступ и участие</h2><p className="mt-1 text-xs text-[#8593a4]">Условия доступа к занятию.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2"><div className="flex gap-3"><LockKeyhole size={17} className="mt-0.5 text-[#9aabbc]" /><div><p className="text-xs font-medium text-[#d9e1e9]">Вход по приглашению</p><p className="mt-1 text-[11px] leading-5 text-[#8391a1]">Код и ссылка будут доступны после создания. Решения команд друг другу скрыты.</p></div></div><div className="flex gap-3"><UsersRound size={17} className="mt-0.5 text-[#9aabbc]" /><div><p className="text-xs font-medium text-[#d9e1e9]">Команды создаются лидерами</p><p className="mt-1 text-[11px] leading-5 text-[#8391a1]">Участники присоединяются по приглашению команды, итоговый ответ отправляет лидер.</p></div></div></div>
        </section>
        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p className="text-[10px] leading-5 text-[#748194]">Занятие и приглашения будут сохранены на сервере.</p><div className="flex justify-end gap-2"><Link href="/teacher/sessions" className="flex min-h-11 items-center rounded-lg px-4 text-xs text-[#aeb8c5] hover:bg-[var(--surface)]">Отмена</Link><button disabled={mutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] transition-colors hover:bg-[#2be99a] disabled:opacity-60">{mutation.isPending ? "Создаём…" : "Создать занятие"}<ChevronRight size={15} /></button></div></div>
      </form>
    </div>
  </TeacherShell>;
}
