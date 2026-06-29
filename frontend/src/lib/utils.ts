export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function pct(value: number, target: number) {
  return clamp(Math.round((value / target) * 100), 0, 100);
}

export function relativeTime(input: string | number | Date): string {
  const date = new Date(input);
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

export const colorMap = {
  moss: {
    text: "text-moss-400",
    bg: "bg-moss-500",
    bgSoft: "bg-moss-500/15",
    border: "border-moss-500/40",
    ring: "ring-moss-500/40",
  },
  ember: {
    text: "text-ember-400",
    bg: "bg-ember-500",
    bgSoft: "bg-ember-500/15",
    border: "border-ember-500/40",
    ring: "ring-ember-500/40",
  },
  gold: {
    text: "text-gold-400",
    bg: "bg-gold-500",
    bgSoft: "bg-gold-500/15",
    border: "border-gold-500/40",
    ring: "ring-gold-500/40",
  },
} as const;
