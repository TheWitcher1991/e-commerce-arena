"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, UsersRound } from "lucide-react";
import { getTeacherSessions } from "@/entities/session";
import { getSessionTeams } from "@/entities/team";
import { TeacherShell } from "@/widgets/teacher-shell";

export default function TeamsPage() {
  const sessionsQuery = useQuery({ queryKey: ["teacher-sessions"], queryFn: getTeacherSessions });
  const sessions = sessionsQuery.data ?? [];
  const teamQueries = useQueries({ queries: sessions.map((session) => ({
    queryKey: ["session-teams", session.id],
    queryFn: () => getSessionTeams(session.id),
    refetchInterval: 5_000,
  })) });
  const rows = teamQueries.flatMap((query, index) => (query.data ?? []).map((team) => ({
    ...team,
    sessionId: sessions[index].id,
    sessionTitle: sessions[index].title,
    status: sessions[index].status,
  })));
  const isLoading = sessionsQuery.isPending || teamQueries.some((query) => query.isPending);

  return <TeacherShell><div className="mb-7"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Составы и участие</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Команды</h1><p className="mt-2 text-sm text-[#8997a8]">Состав, лидер и статус решения по всем вашим занятиям.</p></div>
    <div className="mb-5 flex items-center gap-2 text-xs text-[#8d9aaa]"><UsersRound size={14} />{rows.length} команд</div>
    {isLoading ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[#8997a8]">Загружаем команды…</div> : sessionsQuery.isError || teamQueries.some((query) => query.isError) ? <div role="alert" className="rounded-xl border border-[#57322f] bg-[#211412] p-5 text-sm text-[#f0a29b]">Не удалось загрузить команды. Обновите страницу.</div> : rows.length === 0 ? <div className="rounded-xl border border-dashed border-[#344252] px-5 py-10 text-center"><p className="text-sm font-medium text-white">Команд пока нет</p><p className="mt-2 text-xs text-[#8190a1]">Создайте занятие и отправьте четыре кода лидерам.</p><Link href="/teacher/sessions/new" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 text-xs font-semibold text-[#06130d]">Создать занятие<ArrowRight size={14} /></Link></div> : <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">{rows.map((team) => <Link href={`/teacher/sessions/${team.sessionId}`} key={team.id} className="grid gap-3 border-b border-[var(--border)] px-4 py-4 last:border-0 transition-colors hover:bg-[#111821] sm:grid-cols-[1fr_180px_1fr_90px_150px_24px] sm:items-center sm:gap-4 sm:px-5"><span className="text-[13px] font-semibold text-white">{team.name}<span className="mt-1 block text-[10px] font-normal text-[#8190a1] sm:hidden">Лидер: {team.leader} · {team.members} человек</span></span><span className="hidden text-xs text-[#aab5c1] sm:block">{team.leader}</span><span className="text-[11px] text-[#8d9aaa] sm:text-xs">{team.sessionTitle}</span><span className="hidden text-xs text-[#aab5c1] sm:block">{team.members} чел.</span><span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] ${team.submitted ? "bg-[#17291f] text-[#8de0ab]" : "bg-[#29251a] text-[#e5c16f]"}`}>{team.submitted ? "Ответ отправлен" : team.status === "В процессе" ? "Ожидает ответа" : team.status}</span><ArrowRight size={15} className="hidden text-[#718092] sm:block" /></Link>)}</div>}
  </TeacherShell>;
}
