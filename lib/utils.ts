import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  // PostgreSQL date fields are calendar dates, not instants. Parsing
  // YYYY-MM-DD with Date() uses UTC and can display the prior local day.
  if (typeof date === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(date);
    if (dateOnly) return dateOnly[3] + "/" + dateOnly[2] + "/" + dateOnly[1];
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
