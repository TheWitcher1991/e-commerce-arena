"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, LockKeyhole, Printer, Send, ShoppingBag, UsersRound, Zap } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Suspense, useEffect, useState } from "react";
import { getCurrentTeam, getTeamDefenseCard } from "@/entities/team";
import { getAudienceScreen } from "@/entities/session";
import { useSubmitTeamDecision } from "@/features/submit-decision";
import { ApiError } from "@/shared/api/http";

type DecisionPayload = {
  price?: number;
  cms_option?: "platform_basic" | "platform_extended";
  payment_option?: "payment_standard" | "payment_reserve";
  delivery_option?: "delivery_standard" | "delivery_express";
  marketing_channel?: "ads_search" | "ads_social";
  marketing_budget?: number;
  rationale?: string;
};

const initialDecision: DecisionPayload = {
  price: 3000,
  cms_option: "platform_basic",
  payment_option: "payment_standard",
  delivery_option: "delivery_standard",
  marketing_channel: "ads_search",
  marketing_budget: 18000,
  rationale: "",
};

function TeamRound() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId") ?? undefined;
  const router = useRouter();
  const teamQuery = useQuery({ queryKey: ["team", "me", sessionId], queryFn: () => getCurrentTeam(sessionId), retry: false, refetchInterval: 5_000 });
  const team = teamQuery.data;
  const sessionQuery = useQuery({ queryKey: ["audience-screen", team?.session_id], queryFn: () => getAudienceScreen(team!.session_id), enabled: Boolean(team?.session_id), refetchInterval: 5_000, staleTime: 0 });
  const cardQuery = useQuery({ queryKey: ["team-defense-card", team?.session_id], queryFn: () => getTeamDefenseCard(team?.session_id), enabled: Boolean(team?.session_id), refetchInterval: 5_000 });
  const submitMutation = useSubmitTeamDecision();
  const currentRound = team?.current_round ?? 0;
  const roundCard = cardQuery.data?.rounds.find((round) => round.round_number === currentRound);
  const [decisionState, setDecisionState] = useState<{ round: number; value: DecisionPayload }>({ round: 0, value: initialDecision });
  const decision = decisionState.round === currentRound ? decisionState.value : { ...initialDecision, ...(roundCard?.decision as DecisionPayload | null) };
  const setDecision: Dispatch<SetStateAction<DecisionPayload>> = (update) => setDecisionState((current) => ({
    round: currentRound,
    value: typeof update === "function" ? update(current.round === currentRound ? current.value : decision) : update,
  }));

  useEffect(() => {
    if (teamQuery.error instanceof ApiError && [401, 403].includes(teamQuery.error.status)) router.replace("/login");
  }, [router, teamQuery.error, teamQuery.isError]);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const secondsLeft = team?.round_deadline_at ? Math.max(0, Math.floor((new Date(team.round_deadline_at).getTime() - now) / 1000)) : null;
  const canEdit = Boolean(team?.can_submit_decision);

  if (teamQuery.isPending || !team) return <main className="grid min-h-screen place-items-center bg-[var(--bg)] text-sm text-[#8997a8]">Подключаем команду…</main>;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team.can_submit_decision) return;
    submitMutation.mutate({
      sessionId: team.session_id,
      round: team.current_round,
      teamName: team.team_name,
      selections: {
        price: String(decision.price),
        cms: decision.cms_option === "platform_extended" ? "Расширенная" : "Базовая",
        payment: decision.payment_option === "payment_reserve" ? "С резервом" : "Стандартная",
        delivery: decision.delivery_option === "delivery_express" ? "Ускоренная" : "Стандартная",
      },
      marketingBudget: decision.marketing_budget ?? 18000,
      marketingChannel: decision.marketing_channel ?? "ads_search",
      rationale: decision.rationale ?? "",
    });
  };

  const crisis = sessionQuery.data?.crisis;
  const displayRoundStatus = team.session_status === "paused" ? "занятие на паузе" : team.session_status === "completed" ? "занятие завершено" : team.session_status === "draft" ? "ожидаем преподавателя" : team.round_status === "open" ? "приём решений открыт" : team.round_status === "locked" ? "раунд закрыт" : "ожидаем начала раунда";

  return <main className="min-h-screen bg-[var(--bg)] text-white">
    <header className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-4 sm:px-8"><Link href="/" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)] text-[#06130d]"><Zap size={19} /></span><span className="leading-tight"><span className="block text-[12px] font-bold tracking-[0.14em]">E-COMMERCE</span><span className="block text-[10px] tracking-[0.28em] text-[var(--green)]">ARENA</span></span></Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[#8795a5] sm:block">{team.session_title}</span><span className="flex size-8 items-center justify-center rounded-full bg-[#263246] text-[10px] font-semibold">{team.leader_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span></div></header>
    <div className="mx-auto max-w-[1140px] px-4 py-6 sm:px-7 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><UsersRound size={14} className="text-[var(--green)]" /><span className="text-[11px] font-medium text-[#99a7b6]">{team.team_name}</span><span className="text-[#556374]">·</span><span className="text-[11px] text-[#7e8c9d]">Лидер: {team.leader_name}</span></div><h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">{currentRound ? `Раунд ${currentRound} из 3` : "Симуляция ещё не началась"}</h1><p className="mt-1 text-xs text-[#8997a8]">{displayRoundStatus}</p></div><span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-[10px] font-medium ${canEdit ? "bg-[#17291f] text-[#8de0ab]" : "bg-[#202a37] text-[#aab5c1]"}`}><span className={`size-1.5 rounded-full ${canEdit ? "animate-pulse bg-[var(--green)]" : "bg-[#788698]"}`} />{canEdit ? "Можно отправить решение" : "Только просмотр"}</span></div>

      {crisis && <section className="mb-6 border-l-2 border-[#d8aa52] bg-[#1a1710] p-4 sm:p-5"><div className="flex gap-3"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#e4bb68]" /><div><p className="text-xs font-semibold text-[#f1d79d]">Общее событие: {crisis.title}</p><p className="mt-1 text-xs leading-5 text-[#b4a88d]">Бюджет рекламы не меняется. Сравните стоимость перехода и объясните команде, какой компромисс выбираете.</p></div></div></section>}

      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto]"><section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-xs font-semibold text-white">Команда</h2><div className="mt-3 flex flex-wrap gap-2">{team.members.map((member) => <span key={member.id} className="rounded-full border border-[#2b3745] px-3 py-1.5 text-[10px] text-[#b8c3ce]">{member.display_name}{member.display_name === team.leader_name ? " · лидер" : ""}</span>)}</div><p className="mt-3 text-[10px] text-[#748194]">Обсуждайте варианты вместе. Отправить итог может лидер.</p></section><section className="flex min-w-[180px] items-center justify-between gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><div><p className="text-[10px] text-[#8997a8]">До закрытия приёма</p><p className="tabular-nums mt-1 text-xl font-semibold text-white">{secondsLeft === null ? "—" : `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}</p></div><Clock3 size={18} className="text-[#a1afbe]" /></section></div>

      {currentRound === 0 ? <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"><p className="text-sm font-semibold text-white">Ждём начала занятия</p><p className="mt-2 text-xs leading-5 text-[#8997a8]">Когда преподаватель запустит симуляцию, здесь появится брифинг и решение первого раунда.</p></section> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border-t border-[var(--border)]">
          <div className="flex items-end justify-between gap-3 border-b border-[var(--border)] py-4"><div><h2 className="text-sm font-semibold text-white">Решение команды</h2><p className="mt-1 text-[11px] text-[#8290a0]">Изменить и отправить ответ может только лидер до блокировки раунда.</p></div></div>
          <form onSubmit={onSubmit}>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <label className="border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Платформа<select value={decision.cms_option} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, cms_option: event.target.value as DecisionPayload["cms_option"] }))} className="mt-3 min-h-11 w-full rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 text-xs font-medium text-white outline-none focus:border-[var(--green)] disabled:opacity-70"><option value="platform_basic">Базовая — 10 000 ₽</option><option value="platform_extended">Расширенная — 13 000 ₽, +0,4 п.п. к конверсии</option></select></label>
              <label className="border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Цена товара<select value={decision.price} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, price: Number(event.target.value) }))} className="mt-3 min-h-11 w-full rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 text-xs font-medium text-white outline-none focus:border-[var(--green)] disabled:opacity-70"><option value={2700}>2 700 ₽ — +0,4 п.п. к конверсии</option><option value={3000}>3 000 ₽ — базовая цена</option><option value={3300}>3 300 ₽ — −0,4 п.п. к конверсии</option></select></label>
              <label className="border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Оплата<select value={decision.payment_option} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, payment_option: event.target.value as DecisionPayload["payment_option"] }))} className="mt-3 min-h-11 w-full rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 text-xs font-medium text-white outline-none focus:border-[var(--green)] disabled:opacity-70"><option value="payment_standard">Стандартная — комиссия 2%</option><option value="payment_reserve">С резервом — комиссия 2,7%</option></select></label>
              <label className="border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Доставка<select value={decision.delivery_option} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, delivery_option: event.target.value as DecisionPayload["delivery_option"] }))} className="mt-3 min-h-11 w-full rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 text-xs font-medium text-white outline-none focus:border-[var(--green)] disabled:opacity-70"><option value="delivery_standard">Стандартная — 200 ₽ на заказ</option><option value="delivery_express">Ускоренная — 320 ₽, +0,2 п.п. к конверсии</option></select></label>
              <label className="border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Рекламный канал<select value={decision.marketing_channel} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, marketing_channel: event.target.value as DecisionPayload["marketing_channel"] }))} className="mt-3 min-h-11 w-full rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 text-xs font-medium text-white outline-none focus:border-[var(--green)] disabled:opacity-70"><option value="ads_search">Поиск — 18 ₽ за переход, в кризисе +40%</option><option value="ads_social">Социальные сети — 22 ₽ за переход</option></select></label>
            </div>
            <div className="border-b border-[var(--border)] py-4"><div className="mb-3 flex items-center justify-between"><label htmlFor="budget" className="text-xs font-semibold text-[#e5ebf2]">Рекламный бюджет</label><span className="tabular-nums text-xs font-semibold text-white">{(decision.marketing_budget ?? 18000).toLocaleString("ru-RU")} ₽</span></div><input id="budget" type="range" min={8000} max={26000} step={2000} value={decision.marketing_budget ?? 18000} disabled={!canEdit} onChange={(event) => setDecision((current) => ({ ...current, marketing_budget: Number(event.target.value) }))} className="h-1.5 w-full cursor-pointer accent-[#00dc82] disabled:opacity-60" /><div className="mt-2 flex justify-between text-[10px] text-[#718092]"><span>8 000 ₽</span><span>26 000 ₽</span></div></div>
            <label className="block border-b border-[var(--border)] py-4 text-xs font-semibold text-[#e5ebf2]">Почему команда выбрала эту стратегию? <span className="font-normal text-[#8190a1]">(не менее 20 символов)</span><textarea value={decision.rationale ?? ""} onChange={(event) => setDecision((current) => ({ ...current, rationale: event.target.value }))} disabled={!canEdit} required minLength={20} maxLength={1000} rows={4} placeholder="Объясните ожидаемое влияние выбора на конверсию, затраты и прибыль…" className="mt-3 w-full resize-y rounded-lg border border-[#2c3947] bg-[#0e131b] px-3 py-3 text-xs leading-5 text-white outline-none placeholder:text-[#596677] focus:border-[var(--green)] disabled:opacity-70" /><span className="mt-1 block text-right text-[10px] font-normal text-[#748194]">{(decision.rationale ?? "").length}/1000</span></label>
            <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-[10px] text-[#7d8b9b]"><LockKeyhole size={13} />Решение и расчёт хранятся на сервере.</div>{canEdit && <button disabled={submitMutation.isPending || (secondsLeft !== null && secondsLeft <= 0)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 text-xs font-semibold text-[#06130d] hover:bg-[#2be99a] active:scale-[0.96] disabled:opacity-50"><Send size={14} />{submitMutation.isPending ? "Сохраняем…" : roundCard?.decision ? "Сохранить новую версию" : "Отправить решение"}</button>}</div>
            {submitMutation.isError && <p role="alert" className="mt-3 text-[11px] text-[#f0a29b]">{submitMutation.error.message}</p>}
            {submitMutation.isSuccess && <p role="status" className="mt-3 text-[11px] text-[#9aa99f]">Версия {submitMutation.data.revision} сохранена. Её можно изменить до блокировки раунда.</p>}
          </form>
        </section>
        <aside className="space-y-5 lg:sticky lg:top-[100px]">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold text-white">Итоги этого раунда</h2><span className="text-[9px] text-[#8492a3]">после публикации</span></div>{roundCard?.metrics ? <div className="mt-4 space-y-3">{[["Переходы", roundCard.metrics.visits], ["Оплаченные заказы", roundCard.metrics.paid_orders], ["CAC", roundCard.metrics.cac === null ? "—" : `${roundCard.metrics.cac.toLocaleString("ru-RU")} ₽`], ["Прибыль", `${roundCard.metrics.profit.toLocaleString("ru-RU")} ₽`]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-[#202a37] pb-2 last:border-0 last:pb-0"><span className="text-[11px] text-[#8795a5]">{label}</span><span className="tabular-nums text-xs font-semibold text-[#cad3dd]">{value}</span></div>)}</div> : <><p className="mt-4 text-[11px] leading-5 text-[#9aa7b6]">После блокировки преподаватель проверит расчёт, затем опубликует результаты для всех команд.</p><p className="mt-3 text-[10px] leading-4 text-[#748194]">Другие команды не увидят ваши финансовые показатели до публикации.</p></>}</section>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2"><ShoppingBag size={15} className="text-[var(--green)]" /><h2 className="text-xs font-semibold text-white">Условия сценария</h2></div><div className="mt-3 space-y-2 text-[10px] text-[#9aa7b6]"><p className="flex justify-between"><span>Товар</span><span className="text-[#d3dbe4]">Один виртуальный товар</span></p><p className="flex justify-between"><span>Базовая цена</span><span className="tabular-nums text-[#d3dbe4]">3 000 ₽</span></p><p className="flex justify-between"><span>Себестоимость</span><span className="tabular-nums text-[#d3dbe4]">1 450 ₽</span></p><p className="flex justify-between"><span>Базовая конверсия</span><span className="tabular-nums text-[#d3dbe4]">3%</span></p></div></section>
          <div className="flex items-start gap-2 px-1 text-[10px] leading-5 text-[#758395]"><LockKeyhole size={13} className="mt-0.5 shrink-0" />Только лидер может отправить итог. Решения других команд скрыты.</div>
        </aside>
      </div>}

      <section id="defense-card" className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 print:border-0 print:bg-white print:text-black print:shadow-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--green)] print:text-black">Итог команды</p><h2 className="mt-2 text-lg font-semibold text-white print:text-black">Карточка защиты</h2><p className="mt-1 text-xs text-[#8997a8] print:text-black">{team.session_title} · {team.team_name}</p></div><button onClick={() => window.print()} className="no-print inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs text-[#c4cdd7] hover:bg-[#17202b]"><Printer size={14} />Печать карточки</button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{cardQuery.data?.rounds.filter((round) => round.decision).map((round) => <article key={round.round_number} className="rounded-xl border border-[var(--border)] p-4 print:border-gray-300"><h3 className="text-xs font-semibold text-white print:text-black">Раунд {round.round_number}{round.crisis_title ? ` · ${round.crisis_title}` : ""}</h3><p className="mt-2 text-[10px] leading-5 text-[#8997a8] print:text-black">{String(round.decision?.rationale ?? "")}</p>{round.metrics && <p className="mt-3 text-[10px] font-semibold text-[var(--green)] print:text-black">{round.metrics.paid_orders} заказов · прибыль {round.metrics.profit.toLocaleString("ru-RU")} ₽</p>}</article>)}</div>
        <div className="mt-5 border-t border-[var(--border)] pt-4 print:border-gray-300"><h3 className="text-xs font-semibold text-white print:text-black">Вопросы для защиты</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-[10px] leading-5 text-[#9aa7b6] print:text-black">{cardQuery.data?.defense_questions.map((question) => <li key={question}>{question}</li>)}</ol></div>
      </section>
      <footer className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-4 text-[10px] text-[#6e7c8d]"><span>{team.session_title} · {team.team_name}</span><span>{team.members.length} участников</span></footer>
    </div>
  </main>;
}

export default function TeamPage() { return <Suspense fallback={<main className="min-h-screen bg-[var(--bg)]" />}><TeamRound /></Suspense>; }
