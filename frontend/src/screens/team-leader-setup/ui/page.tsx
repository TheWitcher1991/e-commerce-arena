"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Copy, UsersRound, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useCurrentAccount } from "@/entities/account";
import { useCreateTeam } from "@/features/create-team";
import { ApiError } from "@/shared/api/http";

function LeaderSetup() {
  const params = useSearchParams();
  const router = useRouter();
  const account = useCurrentAccount();
  const createTeam = useCreateTeam();
  const [sessionCode, setSessionCode] = useState(params.get("code") ?? "");
  const [teamName, setTeamName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (account.error instanceof ApiError && [401, 403].includes(account.error.status)) router.replace("/login");
    if (account.data?.role === "teacher") router.replace("/");
  }, [account.data?.role, account.error, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTeam.mutate({ joinCode: sessionCode.trim().toUpperCase(), teamName: teamName.trim() });
  };

  const invitation = createTeam.data?.invite_code;
  const inviteUrl = invitation && typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${encodeURIComponent(invitation)}`
    : "";

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (account.isPending || !account.data || account.data.role !== "leader") {
    return <main className="grid min-h-screen place-items-center bg-[var(--bg)] text-sm text-[#8997a8]">Проверяем доступ…</main>;
  }

  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,220,130,0.08),transparent_45%),var(--bg)] px-5 py-12">
    <section className="w-full max-w-[480px]">
      <Link href="/" className="mx-auto mb-10 flex w-fit items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-[#06130d]"><Zap size={19} /></span><span className="leading-tight"><span className="block text-[12px] font-bold tracking-[0.14em]">E-COMMERCE</span><span className="block text-[10px] tracking-[0.28em] text-[var(--green)]">ARENA</span></span></Link>
      <div className="rounded-2xl border border-[var(--border)] bg-[#0e131b] p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Кабинет лидера</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Подключите команду</h1>
        <p className="mt-2 text-xs leading-5 text-[#8997a8]">Введите личный код занятия от преподавателя. После подключения появится ссылка для команды.</p>
        {createTeam.isSuccess ? <div className="mt-6">
          <div role="status" className="flex items-center gap-2 text-sm font-semibold text-[#9fe1b8]"><Check size={17} />Команда «{createTeam.data.team_name}» подключена</div>
          <p className="mt-2 text-xs leading-5 text-[#9aa99f]">Передайте участникам код или ссылку. Участники входят без регистрации.</p>
          <div className="mt-5 rounded-xl border border-[#31533f] bg-[#101e16] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8da695]">Код для участников</p>
            <div className="mt-2 flex items-center justify-between"><code className="text-lg font-semibold tracking-[0.18em] text-[var(--green)]">{invitation}</code><button onClick={copyInvite} className="flex size-10 items-center justify-center rounded-md text-[#9aa8b8] hover:bg-[#193122] hover:text-white" aria-label="Скопировать приглашение">{copied ? <Check size={16} className="text-[var(--green)]" /> : <Copy size={15} />}</button></div>
            <p aria-live="polite" className="mt-2 min-h-4 text-[10px] text-[#9aada1]">{copied ? "Ссылка скопирована" : "Код действует только для этой команды и занятия."}</p>
          </div>
          <Link href={`/team?sessionId=${encodeURIComponent(createTeam.data.session_id)}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] hover:bg-[#2be99a]">Открыть рабочее место команды<ArrowRight size={15} /></Link>
          <button onClick={() => createTeam.reset()} className="mt-3 min-h-10 w-full text-xs text-[#8997a8] hover:text-white">Подключиться к другому занятию</button>
        </div> : <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><label htmlFor="session-code" className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]">Код занятия</label><input id="session-code" value={sessionCode} onChange={(event) => setSessionCode(event.target.value.toUpperCase())} required minLength={8} maxLength={24} autoCapitalize="characters" autoComplete="off" placeholder="Код из приглашения преподавателя" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#090d13] px-3 text-sm uppercase tracking-[0.12em] text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#596677] focus:border-[var(--green)]" /></div>
          <div><label htmlFor="team-name" className="mb-1.5 block text-[11px] font-medium text-[#cbd4de]">Название команды</label><input id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required minLength={2} maxLength={50} autoComplete="organization" placeholder="Например, МаркетLab" className="min-h-11 w-full rounded-lg border border-[#2b3745] bg-[#090d13] px-3 text-sm text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)]" /></div>
          {createTeam.isError && <p role="alert" className="rounded-lg border border-[#57322f] bg-[#211412] p-3 text-xs leading-5 text-[#f0a29b]">{createTeam.error.message}</p>}
          <button disabled={createTeam.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] disabled:opacity-60">{createTeam.isPending ? "Проверяем код…" : "Подключиться и создать команду"}<ArrowRight size={15} /></button>
        </form>}
      </div>
      <div className="mt-5 flex items-start gap-2 px-1 text-[10px] leading-5 text-[#748194]"><UsersRound size={13} className="mt-0.5 shrink-0" />В команду могут войти лидер и до четырёх участников. Итоговый ответ отправляет лидер.</div>
    </section>
  </main>;
}

export default function LeaderPage() { return <Suspense fallback={<main className="min-h-screen bg-[var(--bg)]" />}><LeaderSetup /></Suspense>; }
