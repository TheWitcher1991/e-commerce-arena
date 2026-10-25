"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { TeacherShell } from "@/widgets/teacher-shell";
import { getTeacherSessions, SessionTable } from "@/entities/session";

export default function SessionsPage() {
  const { data: sessions = [], isLoading, isError } = useQuery({ queryKey: ["teacher-sessions"], queryFn: getTeacherSessions });
  return <TeacherShell>
    <div className="mb-7"><Link href="/" className="mb-5 inline-flex items-center gap-2 text-xs text-[#8c9aaa] hover:text-white"><ArrowLeft size={14} />К обзору</Link><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">Мои занятия</h1><p className="mt-2 text-sm text-[#8997a8]">Сессии, которые вы создали и проводите.</p></div><Link href="/teacher/sessions/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-[13px] font-semibold text-[#06130d] hover:bg-[#2be99a]"><Plus size={17} />Создать занятие</Link></div></div>
    <div className="mb-4 flex items-center gap-2 text-xs text-[#8d9aaa]"><span className="tabular-nums text-white">{sessions.length}</span> занятий</div>
    {isLoading ? <div className="surface rounded-2xl p-10 text-center text-sm text-[var(--muted)]">Загружаем…</div> : isError ? <div role="alert" className="rounded-xl border border-[#57322f] bg-[#211412] p-5 text-sm text-[#f0a29b]">Не удалось загрузить занятия.</div> : <SessionTable sessions={sessions} />}
  </TeacherShell>;
}
