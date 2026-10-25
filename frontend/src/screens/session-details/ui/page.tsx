"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, ExternalLink, Pause, Play, Radio, RotateCcw, ShieldAlert, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  activateSessionCrisis, downloadSessionExport, getSessionAssessments, getSessionAudit, getSessionRoundResults,
  getTeacherSession, lockTeacherRound, openTeacherRound, pauseTeacherSession, publishSessionResults,
  resumeTeacherSession, saveTeamAssessment, startTeacherSession,
} from "@/entities/session";
import type { SessionTeam, TeamAssessment } from "@/entities/session";
import { TeacherShell } from "@/widgets/teacher-shell";

const assessmentFields = [
  { key: "economics_score", label: "Экономическое обоснование", max: 4 },
  { key: "technology_score", label: "Выбор технологий", max: 4 },
  { key: "crisis_score", label: "Реакция на кризис", max: 4 },
  { key: "teamwork_score", label: "Командная работа", max: 2 },
  { key: "reflection_score", label: "Выводы и рефлексия", max: 2 },
] as const;

function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function TeamAssessmentForm({ team, assessment, onSave }: {
  team: SessionTeam; assessment?: TeamAssessment; onSave: (payload: Parameters<typeof saveTeamAssessment>[1]) => void;
}) {
  return <form onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      team_id: team.id,
      economics_score: Number(form.get("economics_score")),
      technology_score: Number(form.get("technology_score")),
      crisis_score: Number(form.get("crisis_score")),
      teamwork_score: Number(form.get("teamwork_score")),
      reflection_score: Number(form.get("reflection_score")),
      comment: String(form.get("comment") ?? "").trim(),
    });
  }} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[#0b1017] p-4 sm:grid-cols-[1fr_repeat(5,78px)_auto] sm:items-end">
    <div className="sm:pb-2"><p className="text-xs font-semibold text-white">{team.name}</p><p className="mt-1 text-[10px] text-[#8190a1]">Максимум 16 баллов</p></div>
    {assessmentFields.map((field) => <label key={field.key} className="text-[10px] text-[#8d9aaa]">{field.label}<span className="mt-1 flex items-center gap-1"><input name={field.key} type="number" min="0" max={field.max} required defaultValue={assessment?.[field.key] ?? 0} className="min-h-9 w-full rounded-md border border-[#2b3745] bg-[#090d13] px-2 text-xs text-white outline-none focus:border-[var(--green)]" /><span className="text-[#617184]">/{field.max}</span></span></label>)}
    <button className="min-h-9 rounded-md bg-[var(--green)] px-3 text-[10px] font-semibold text-[#06130d]">Сохранить</button>
    <label className="sm:col-span-full text-[10px] text-[#8d9aaa]">Комментарий преподавателя<input name="comment" maxLength={2000} defaultValue={assessment?.comment ?? ""} placeholder="Короткая обратная связь команде" className="mt-1 min-h-9 w-full rounded-md border border-[#2b3745] bg-[#090d13] px-3 text-xs text-white outline-none focus:border-[var(--green)]" /></label>
  </form>;
}

export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: ["teacher-session", sessionId], queryFn: () => getTeacherSession(sessionId), refetchInterval: 5_000 });
  const session = sessionQuery.data;
  const currentRound = session?.rounds.find((round) => round.number === session.currentRound);
  const timer = useCountdown(currentRound?.status === "open" ? currentRound.deadline_at : null);
  const auditQuery = useQuery({ queryKey: ["session-audit", sessionId], queryFn: () => getSessionAudit(sessionId), refetchInterval: 5_000 });
  const assessmentQuery = useQuery({ queryKey: ["session-assessments", sessionId], queryFn: () => getSessionAssessments(sessionId) });
  const roundQueries = useQueries({ queries: (session?.rounds ?? []).filter((round) => round.status === "locked").map((round) => ({
    queryKey: ["session-results", sessionId, round.number],
    queryFn: () => getSessionRoundResults(sessionId, round.number),
    retry: false,
  })) });
  const [actionError, setActionError] = useState("");
  const controlMutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      setActionError("");
      void queryClient.invalidateQueries({ queryKey: ["teacher-session", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["teacher-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["session-audit", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["session-results", sessionId] });
    },
    onError: (error) => setActionError(error.message),
  });
  const assessmentMutation = useMutation({
    mutationFn: (payload: Parameters<typeof saveTeamAssessment>[1]) => saveTeamAssessment(sessionId, payload),
    onSuccess: () => {
      setActionError("");
      void queryClient.invalidateQueries({ queryKey: ["session-assessments", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["session-audit", sessionId] });
    },
    onError: (error) => setActionError(error.message),
  });
  const assessmentByTeam = useMemo(() => new Map((assessmentQuery.data ?? []).map((item) => [item.team_id, item])), [assessmentQuery.data]);

  const runControl = (action: () => Promise<unknown>) => controlMutation.mutate(action);
  const isDraft = session?.backendStatus === "draft";
  const isActive = session?.backendStatus === "active";
  const isPaused = session?.backendStatus === "paused";
  const allTeamsJoined = (session?.leaderInvites.filter((invite) => invite.claimed).length ?? 0) === 4;
  const canOpenNext = isActive && currentRound?.status === "locked" && (session?.currentRound ?? 0) < 3;
  const hasUnpublishedLockedRounds = Boolean(session?.rounds.some((round) => round.status === "locked" && !round.results_published));

  const copyText = async (value: string) => {
    try { await navigator.clipboard.writeText(value); }
    catch { setActionError("Не удалось скопировать. Выделите и скопируйте код вручную."); }
  };

  const renderAssessment = (team: SessionTeam) => <TeamAssessmentForm key={team.id} team={team} assessment={assessmentByTeam.get(team.id)} onSave={(payload) => assessmentMutation.mutate(payload)} />;

  if (sessionQuery.isPending) return <TeacherShell><p className="py-12 text-center text-sm text-[#8997a8]">Загружаем занятие…</p></TeacherShell>;
  if (sessionQuery.isError || !session) return <TeacherShell><div role="alert" className="rounded-xl border border-[#57322f] bg-[#211412] p-5 text-sm text-[#f0a29b]">{sessionQuery.error?.message ?? "Не удалось загрузить занятие."}<Link className="ml-3 underline" href="/teacher/sessions">Вернуться к занятиям</Link></div></TeacherShell>;

  return <TeacherShell>
    <Link href="/teacher/sessions" className="mb-5 inline-flex items-center gap-2 text-xs text-[#8c9aaa] hover:text-white"><ArrowLeft size={14} />Все занятия</Link>
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="mb-2 flex items-center gap-2"><span className={`size-1.5 rounded-full ${isActive ? "bg-[var(--green)]" : "bg-[#d7af67]"}`} /><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--green)]">{session.status}</span></div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">{session.title}</h1><p className="mt-2 text-sm text-[#8997a8]">{session.course} · Сценарий {session.scenarioVersion ?? "1.0"}</p></div><div className="flex flex-wrap gap-2"><Link href={`/screen/${sessionId}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs text-[#c4cdd7] hover:bg-[var(--surface)]"><ExternalLink size={14} />Экран аудитории</Link><button onClick={() => controlMutation.mutate(() => downloadSessionExport(sessionId))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs text-[#c4cdd7] hover:bg-[var(--surface)] disabled:opacity-50"><Download size={14} />Скачать CSV</button></div></div>

    {actionError && <p role="alert" className="mb-5 rounded-lg border border-[#57322f] bg-[#211412] p-3 text-xs text-[#f0a29b]">{actionError}</p>}

    <section className="mb-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8492a3]">Состояние симуляции</p><p className="mt-2 text-lg font-semibold text-white">{session.currentRound ? `Раунд ${session.currentRound} из 3` : "Ожидает запуска"}</p><p className="mt-1 text-xs text-[#8997a8]">{session.teams} из 4 команд подключены</p></div>{currentRound?.status === "open" && <div className="rounded-xl border border-[#51442b] bg-[#211c12] px-4 py-3 text-right"><p className="text-[10px] text-[#c7ae7b]">До конца раунда</p><p className="tabular-nums mt-1 text-2xl font-semibold text-[#f2d597]">{timer ?? "--:--"}</p></div>}</div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          {isDraft && <button disabled={!allTeamsJoined || controlMutation.isPending} onClick={() => runControl(() => startTeacherSession(sessionId))} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 text-xs font-semibold text-[#06130d] disabled:cursor-not-allowed disabled:opacity-50"><Play size={14} />{allTeamsJoined ? "Начать симуляцию" : "Ожидаем все 4 команды"}</button>}
          {isActive && <button onClick={() => runControl(() => pauseTeacherSession(sessionId))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs text-[#c4cdd7] disabled:opacity-50"><Pause size={14} />Пауза</button>}
          {isPaused && <button onClick={() => runControl(() => resumeTeacherSession(sessionId))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 text-xs font-semibold text-[#06130d] disabled:opacity-50"><Play size={14} />Продолжить</button>}
          {isActive && currentRound?.status === "open" && currentRound.number === 2 && !session.crisis && <button onClick={() => runControl(() => activateSessionCrisis(sessionId))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#6c5127] px-3 text-xs text-[#f0cf89] disabled:opacity-50"><ShieldAlert size={14} />Объявить общий кризис</button>}
          {isActive && currentRound?.status === "open" && <button onClick={() => runControl(() => lockTeacherRound(sessionId, currentRound.number))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#6b3e3e] px-3 text-xs text-[#f0aaa1] disabled:opacity-50">Закрыть раунд {currentRound.number}</button>}
          {canOpenNext && <button onClick={() => runControl(() => openTeacherRound(sessionId, (session.currentRound ?? 0) + 1))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 text-xs font-semibold text-[#06130d] disabled:opacity-50"><RotateCcw size={14} />Открыть раунд {(session.currentRound ?? 0) + 1}</button>}
          {hasUnpublishedLockedRounds && <button onClick={() => runControl(() => publishSessionResults(sessionId))} disabled={controlMutation.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#31533f] bg-[#102019] px-3 text-xs font-semibold text-[#9fe1b8] disabled:opacity-50"><Radio size={14} />Опубликовать результаты</button>}
        </div>
        {session.currentRound === 2 && <p className="mt-3 text-[10px] leading-5 text-[#8997a8]">Во втором раунде объявите общий кризис: стоимость клика в поиске вырастет на 40%. Команды увидят одинаковое условие.</p>}
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8492a3]">Коды для лидеров</p><p className="mt-1 text-xs text-[#8997a8]">Четыре кода — по одному на команду</p></div><UsersRound size={17} className="text-[#8c9aaa]" /></div><div className="mt-4 space-y-2">{session.leaderInvites.map((invite, index) => <div key={invite.code} className="flex items-center justify-between gap-3 rounded-lg border border-[#283442] bg-[#0a0e14] px-3 py-2"><span className="min-w-0"><span className="mr-2 text-[10px] text-[#6f7d8f]">{index + 1}</span><code className="text-xs font-semibold tracking-[0.12em] text-[var(--green)]">{invite.code}</code><span className="ml-2 text-[10px] text-[#8190a1]">{invite.claimed ? `Команда ${invite.team_name}` : "Не использован"}</span></span><button onClick={() => copyText(`${window.location.origin}/leader?code=${invite.code}`)} className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#9aa8b8] hover:bg-[#19222d] hover:text-white" aria-label={`Скопировать приглашение лидеру ${index + 1}`}><Copy size={14} /></button></div>)}</div></div>
    </section>

    <section className="mb-8"><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-white">Команды</h2><p className="mt-1 text-xs text-[#8492a3]">Участники вступают по коду своей команды, до пяти человек вместе с лидером.</p></div><span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[11px] text-[#aab6c4]"><UsersRound size={14} />{session.teamsList.length}/4</span></div>
      {session.teamsList.length === 0 ? <div className="rounded-xl border border-dashed border-[#344252] px-5 py-9 text-center text-xs text-[#8290a0]">После ввода лидерского кода команда появится здесь.</div> : <div className="grid gap-3 md:grid-cols-2">{session.teamsList.map((team) => <div key={team.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{team.name}</p><p className="mt-1 text-[10px] text-[#8997a8]">Лидер: {team.leader_name} · участников: {team.member_count + 1}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${team.submitted ? "bg-[#17291f] text-[#8de0ab]" : "bg-[#29251a] text-[#e5c16f]"}`}>{team.submitted ? "Решение отправлено" : "Ожидает решение"}</span></div><div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3"><span className="text-[10px] text-[#8190a1]">Код участников</span><button onClick={() => copyText(`${window.location.origin}/join?code=${team.invite_code}`)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--border)] px-2.5 text-[10px] text-[var(--green)]"><code>{team.invite_code}</code><Copy size={12} /></button></div></div>)}</div>}
    </section>

    <section className="mb-8"><div className="mb-4"><h2 className="text-base font-semibold text-white">Результаты раундов</h2><p className="mt-1 text-xs text-[#8492a3]">Расчёт виден вам после закрытия раунда и появится на экране только после публикации.</p></div>
      {session.rounds.filter((round) => round.status === "locked").length === 0 ? <div className="rounded-xl border border-dashed border-[#344252] px-5 py-7 text-xs text-[#8290a0]">Сначала команды должны отправить решения, затем закройте раунд.</div> : session.rounds.filter((round) => round.status === "locked").map((round) => {
        const lockedRoundIndex = session.rounds.filter((item) => item.status === "locked").findIndex((item) => item.number === round.number);
        const query = roundQueries[lockedRoundIndex];
        return <div key={round.number} className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3"><p className="text-xs font-semibold text-white">Раунд {round.number} {round.results_published && <span className="ml-2 text-[10px] font-normal text-[var(--green)]">· результаты опубликованы</span>}</p><span className="text-[10px] text-[#8190a1]">{round.locked_at ? new Date(round.locked_at).toLocaleString("ru-RU") : "Закрыт"}</span></div>{query?.data?.length ? <div className="divide-y divide-[var(--border)]">{query.data.map((result) => <div key={result.team_id} className="grid grid-cols-2 gap-3 px-4 py-3 text-xs sm:grid-cols-5"><span className="font-medium text-white">{result.team_name}</span><span className="text-[#9aa7b6]">Переходы: {result.metrics.visits}</span><span className="text-[#9aa7b6]">Заказы: {result.metrics.paid_orders}</span><span className="text-[#9aa7b6]">CAC: {result.metrics.cac?.toLocaleString("ru-RU") ?? "—"} ₽</span><strong className={result.metrics.profit >= 0 ? "text-[var(--green)]" : "text-[#f0aaa1]"}>{result.metrics.profit.toLocaleString("ru-RU")} ₽</strong></div>)}</div> : <p className="px-4 py-4 text-xs text-[#8190a1]">У команд нет сохранённых решений в этом раунде.</p>}</div>;
      })}
    </section>

    <section className="mb-8"><div className="mb-4"><h2 className="text-base font-semibold text-white">Оценивание защиты</h2><p className="mt-1 text-xs text-[#8492a3]">Оцените экономику, выбор технологий, антикризисное решение, командную работу и выводы — максимум 16 баллов.</p></div><div className="space-y-3">{session.teamsList.map(renderAssessment)}{session.teamsList.length === 0 && <p className="text-xs text-[#8190a1]">Оценивание появится после подключения команд.</p>}</div></section>

    <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"><summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-white">Журнал занятия ({auditQuery.data?.length ?? 0})</summary><div className="max-h-72 overflow-auto border-t border-[var(--border)] px-4">{auditQuery.data?.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] py-3 last:border-0"><span className="text-[10px] text-[#c4cdd7]">{event.action} {Object.entries(event.payload).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</span><time className="text-[10px] text-[#748194]">{new Date(event.created_at).toLocaleString("ru-RU")}</time></div>)}</div></details>
  </TeacherShell>;
}
