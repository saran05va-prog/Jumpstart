import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { type StudyDay } from "../../lib/types";

export default function TrendChart({ data }: { data: StudyDay[] }) {
  const monthMap = new Map<string, number>();
  for (const d of data) {
    const monthKey = d.date.substring(0, 7);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + d.hours);
  }

  const chartData = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([monthKey, hours]) => {
      const [y, m] = monthKey.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return { month: monthNames[parseInt(m) - 1] ?? m, hours: Math.round(hours * 10) / 10 };
    });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8743B" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#E8743B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#243036" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#5F716A", fontSize: 11, fontFamily: "IBM Plex Mono" }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#5F716A", fontSize: 11, fontFamily: "IBM Plex Mono" }} width={36} />
        <Tooltip contentStyle={{ background: "#1C262B", border: "1px solid #324047", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#ECEFE9" }} formatter={(v: number) => [`${v}h`, "Studied"]} />
        <Area type="monotone" dataKey="hours" stroke="#E8743B" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
