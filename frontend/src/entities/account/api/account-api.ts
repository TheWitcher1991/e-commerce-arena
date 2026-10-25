import { apiRequest, setAccessToken } from "@/shared/api";
import type { Account, AuthResponse } from "../model/types";

type Credentials = { email: string; password: string };

export async function registerAccount(input: Credentials & { full_name: string; role: "teacher" | "leader" }): Promise<Account> {
  const result = await apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  setAccessToken(result.access_token);
  return result.user;
}

export async function loginAccount(input: Credentials): Promise<Account> {
  const result = await apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
  setAccessToken(result.access_token);
  return result.user;
}

export function getCurrentAccount(): Promise<Account> {
  return apiRequest<Account>("/auth/me");
}
