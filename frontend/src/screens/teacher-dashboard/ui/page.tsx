"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, ArrowUpRight, BookOpenCheck, Plus, Radio, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { TeacherShell } from "@/widgets/teacher-shell";
import { getTeacherSession, getTeacherSessions, SessionTable } from "@/entities/session";
import { useCurrentAccount } from "@/entities/account";
import { useCreateSession } from "@/features/create-session";

export default function TeacherDashboard() {
  const [newTitle, setNewTitle] = useState("");
  const [formError, setFormError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: sessions = [], isLoading, isError } = useQuery({ queryKey: ["teacher-sessions"], queryFn: getTeacherSessions });
  const account = useCurrentAccount();
  const activeSession = sessions.find((session) => session.backendStatus === "active" || session.backendStatus === "paused");
  const activeSessionDetail = useQuery({
    queryKey: ["teacher-session", activeSession?.id],
    queryFn: () => getTeacherSession(activeSession!.id),
    enabled: Boolean(activeSession?.id),
    refetchInterval: 5_000,
  });
  const createMutation = useCreateSession();

  const active = sessions.filter((session) => session.status === "В процессе" || session.status === "На паузе").length;
  const teamCount = sessions.reduce((total, session) => total + session.teams, 0);
  const upcomingCount = sessions.filter((session) => session.status === "Запланирована").length;

  return <TeacherShell>
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[var(--green)]">Рабочее пространство преподавателя</p><h1 className="text-wrap-balance text-[27px] font-semibold tracking-[-0.04em] text-white sm:text-[34px]">Добрый день, {account.data?.full_name.split(" ")[0] ?? ""}</h1><p className="mt-2 text-sm text-[#8d9aaa]">Создавайте занятие, подключайте команды и ведите симуляцию по раундам.</p></div>
      <button onClick={() => { setFormError(""); setShowCreate(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-[13px] font-semibold text-[#04130b] transition-colors hover:bg-[#2be99a] active:scale-[0.96]"><Plus size={17} strokeWidth={2.4} />Создать занятие</button>
    </div>

    <section aria-label="Сводка кабинета" className="mb-8 grid gap-5 sm:grid-cols-3">
      <div className="border-l-2 border-[var(--green)] pl-4 py-1"><div className="flex items-center gap-2 text-xs text-[#8b99aa]"><Radio size={15} className="text-[var(--green)]" />Активные занятия</div><div className="mt-3 flex items-end gap-2"><span className="tabular-nums text-[30px] font-semibold tracking-tight text-white">{active}</span><span className="mb-1 text-[11px] text-[#708092]">сейчас</span></div></div>
      <div className="border-l-2 border-[#44576e] pl-4 py-1"><div className="flex items-center gap-2 text-xs text-[#8b99aa]"><UsersRound size={15} className="text-[#92a5bb]" />Команды в занятиях</div><div className="mt-3 flex items-end gap-2"><span className="tabular-nums text-[30px] font-semibold tracking-tight text-white">{teamCount}</span><span className="mb-1 text-[11px] text-[#708092]">во всех сессиях</span></div></div>
      <div className="border-l-2 border-[#b88d47] pl-4 py-1"><div className="flex items-center gap-2 text-xs text-[#8b99aa]"><BookOpenCheck size={15} className="text-[#d7af67]" />Предстоит провести</div><div className="mt-3 flex items-end gap-2"><span className="tabular-nums text-[30px] font-semibold tracking-tight text-white">{upcomingCount}</span><span className="mb-1 text-[11px] text-[#708092]">запланировано</span></div></div>
    </section>

    {activeSession ? <section className="mb-9 overflow-hidden rounded-2xl border border-[#1e4734] bg-[#0d1a14]">
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6 sm:py-5">
        <div className="flex gap-4"><div className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-[#153b2a] text-[var(--green)] sm:flex"><Activity size={20} /></div><div><div className="mb-1 flex items-center gap-2"><span className="size-1.5 animate-pulse rounded-full bg-[var(--green)]" /><p className="text-xs font-semibold text-[var(--green)]">{activeSession.status === "На паузе" ? "НА ПАУЗЕ" : "ЗАНЯТИЕ ИДЁТ"}</p></div><h2 className="text-base font-semibold text-white sm:text-lg">{activeSession.title}</h2><p className="mt-1 text-xs text-[#91a399]">{activeSession.teams} из 4 команд · Раунд {activeSession.currentRound || 1} из 3</p></div></div>
        <Link href={`/teacher/sessions/${activeSession.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#2d5d44] px-3 text-xs font-medium text-[#b9e8cd] transition-colors hover:bg-[#173424]">Открыть управление<ArrowRight size={15} /></Link>
      </div>
      <div className="flex flex-col gap-2 border-t border-[#1d392b] px-5 py-3 text-[11px] text-[#9aada1] sm:flex-row sm:items-center sm:justify-between sm:px-6"><span><strong className="font-semibold text-white">{activeSessionDetail.data?.teamsList.filter((team) => team.submitted).length ?? 0} из {activeSession.teams}</strong> команд отправили решение</span><span>Текущий этап: {activeSession.status.toLowerCase()}</span></div>
    </section> : <section className="mb-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="text-base font-semibold text-white">Проведите первую симуляцию</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[#8997a8]">Создайте занятие. Система подготовит четыре кода для лидеров команд; после подключения всех команд можно будет начать три раунда.</p><Link href="/teacher/sessions/new" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 text-xs font-semibold text-[#06130d]">Создать занятие<ArrowRight size={14} /></Link></section>}

    <section>
      <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-white">Ваши занятия</h2><p className="mt-1 text-xs text-[#8492a3]">Управляйте сессиями и смотрите командные результаты.</p></div><Link href="/teacher/sessions" className="hidden items-center gap-1 text-xs font-medium text-[#aeb9c6] transition-colors hover:text-[var(--green)] sm:flex">Все занятия<ArrowUpRight size={14} /></Link></div>
      {isLoading ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--muted)]">Загружаем занятия…</div> : isError ? <div role="alert" className="rounded-2xl border border-[#57322f] bg-[#211412] px-5 py-6 text-sm text-[#f0a29b]">Не удалось загрузить занятия. Обновите страницу и попробуйте снова.</div> : <SessionTable sessions={sessions.slice(0, 3)} />}
    </section>

    <section className="mt-9 border-t border-[var(--border)] pt-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d2430] text-[#9eb3ca]"><Sparkles size={16} /></span><div><p className="text-xs font-semibold text-[#d7dfe8]">Подготовьте учебную сессию</p><p className="mt-1 text-[11px] text-[#8190a1]">Создайте занятие и пригласите команды по короткому коду.</p></div></div><Link href="/teacher/sessions/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[#c5ced8] transition-colors hover:border-[#405063] hover:bg-[var(--surface)]">Настроить занятие<ArrowRight size={14} /></Link></div>
    </section>

    {showCreate && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[#111821] p-6 shadow-2xl">
        <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Новое занятие</p><h2 id="create-title" className="mt-2 text-xl font-semibold text-white">Создать занятие</h2><p className="mt-1 text-xs leading-5 text-[#8997a8]">Будет создано занятие по базовому сценарию на три раунда.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); createMutation.mutate(newTitle, { onSuccess: () => { setNewTitle(""); setFormError(""); setShowCreate(false); }, onError: (error) => setFormError(error.message) }); }}>
          <label htmlFor="session-name" className="mb-2 block text-xs font-medium text-[#cbd4de]">Название занятия</label>
          <input autoFocus id="session-name" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={80} placeholder="Например, E-commerce: практика" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#0b1017] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" />
          <div className="mt-2 min-h-5 text-xs text-[#ee938b]" role="alert">{formError}</div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="min-h-10 rounded-lg px-4 text-xs text-[#aab5c2] hover:bg-[#1b2430]">Отмена</button><button disabled={createMutation.isPending} className="min-h-10 rounded-lg bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] transition-colors hover:bg-[#2be99a] disabled:cursor-not-allowed disabled:opacity-60">{createMutation.isPending ? "Создаём…" : "Создать сессию"}</button></div>
        </form>
      </section>
    </div>}
  </TeacherShell>;
}
