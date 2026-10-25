import Link from "next/link";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import type { ArenaSession } from "../model/types";

const statusStyles = {
  "В процессе": "bg-[#17291f] text-[#7be0a5]",
  "На паузе": "bg-[#29251a] text-[#eac678]",
  "Запланирована": "bg-[#29251a] text-[#eac678]",
  "Завершена": "bg-[#1b222b] text-[#aab7c7]",
} as const;

export function SessionTable({ sessions }: { sessions: ArenaSession[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="hidden grid-cols-[minmax(230px,1.5fr)_minmax(170px,1fr)_100px_140px_120px_36px] gap-4 border-b border-[var(--border)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d8f] lg:grid"><span>Занятие</span><span>Дата</span><span>Команды</span><span>Раунд</span><span>Статус</span><span /></div>
      {sessions.map((session) => <Link key={session.id} href={`/teacher/sessions/${session.id}`} className="group grid gap-3 border-b border-[var(--border)] px-4 py-4 last:border-0 transition-colors hover:bg-[#111821] sm:px-5 lg:grid-cols-[minmax(230px,1.5fr)_minmax(170px,1fr)_100px_140px_120px_36px] lg:items-center lg:gap-4"><span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-[#edf2f7] group-hover:text-white">{session.title}</span><span className="mt-1 block truncate text-[11px] text-[#8190a2]">{session.course}</span></span><span className="text-xs text-[#a7b2bf]">{session.dateLabel}</span><span className="flex items-center gap-2 text-xs text-[#bac4cf]"><span className="size-1.5 rounded-full bg-[#7b8999]" />{session.teams} команд</span><span className="flex items-center gap-2"><span className="flex h-6 items-center rounded-md bg-[#1a222c] px-2 text-[11px] text-[#b4c0cd]">Раунд {session.round} из 3</span><span className="text-[10px] text-[#778598]">{session.submitted}/{session.teams || 0} отправили</span></span><span><span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-medium ${statusStyles[session.status]}`}>{session.status}</span></span><span className="hidden size-8 items-center justify-center rounded-md text-[#788698] group-hover:bg-[#202a36] group-hover:text-white lg:flex"><ArrowUpRight size={16} /></span><span className="flex items-center justify-between text-[10px] text-[#758395] lg:hidden"><span>{session.dateLabel} · {session.teams} команд</span><MoreHorizontal size={17} /></span></Link>)}
      {sessions.length === 0 && <div className="px-6 py-12 text-center text-sm text-[var(--muted)]">Занятий пока нет. Создайте первое, чтобы пригласить команды.</div>}
    </div>
  );
}
