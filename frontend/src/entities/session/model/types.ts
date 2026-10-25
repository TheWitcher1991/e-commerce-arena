export type SessionStatus = "В процессе" | "Запланирована" | "Завершена" | "На паузе";

export type ArenaSession = {
  id: string;
  title: string;
  course: string;
  scenarioVersion?: string;
  dateLabel: string;
  teams: number;
  submitted: number;
  round: number;
  status: SessionStatus;
  backendStatus?: "draft" | "active" | "paused" | "completed";
  leaderInvites?: LeaderInvite[];
  currentRound?: number;
  rounds?: ArenaRound[];
};

export type LeaderInvite = { code: string; claimed: boolean; team_name: string | null };
export type ArenaRound = {
  id: string;
  number: number;
  status: "pending" | "open" | "locked";
  results_published: boolean;
  opened_at: string | null;
  deadline_at: string | null;
  locked_at: string | null;
};
export type SessionTeam = { id: string; name: string; leader_name: string; member_count: number; submitted: boolean; invite_code: string };
export type SessionDetail = ArenaSession & { teamsList: SessionTeam[]; leaderInvites: LeaderInvite[]; rounds: ArenaRound[]; crisis: { event_type: string; activated_at: string } | null };
export type SessionAuditEvent = { id: string; actor_id: string; actor_role: string; action: string; payload: Record<string, unknown>; created_at: string };
export type TeamAssessment = { team_id: string; economics_score: number; technology_score: number; crisis_score: number; teamwork_score: number; reflection_score: number; comment: string | null; id: string; total_score: number };
export type MetricValues = { visits: number; paid_orders: number; revenue: number; unit_contribution: number; contribution_total: number; marketing_cost: number; fixed_cost: number; profit: number; cac: number | null; sales_margin_percent: number | null; break_even_orders: number | null };
export type TeamRoundResult = { team_id: string; team_name: string; round_number: number; model_version: string; metrics: MetricValues; trace: Record<string, number | string | null> };
export type AudienceScreen = { session_id: string; title: string; status: string; current_round: number; round_status: string | null; team_count: number; submitted_count: number; published: boolean; crisis: { event_type: string; title: string } | null; ranking: Array<{ place: number | null; team_name: string; paid_orders: number | null; profit: number | null; submitted: boolean }> };
