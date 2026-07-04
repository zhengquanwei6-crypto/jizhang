import dayjs from "dayjs";

export function money(value: number | null | undefined, currency = "CNY"): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "--";
  }
  return dayjs(value).format("MM月DD日");
}

export function monthKey(date = new Date()): string {
  return dayjs(date).format("YYYY-MM");
}
