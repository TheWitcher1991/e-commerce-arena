"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentAccount } from "../api/account-api";

export function useCurrentAccount() {
  return useQuery({ queryKey: ["auth", "me"], queryFn: getCurrentAccount, retry: false, staleTime: 60_000 });
}
