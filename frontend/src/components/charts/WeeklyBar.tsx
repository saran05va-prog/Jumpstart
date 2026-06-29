import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { type StudyDay } from "../../lib/types";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyBar({ data }: { data: StudyDay[] }) {
  const chartData = data.map((d) => {
    const dayIdx = new Date(d.date).getDay() === 0 ? 6 : new Date(d.date).getDay() - 1;
    return { day: dayNames[dayIdx] ?? "Mon", hours: d.hours };
  });

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#5F716A", fontSize: 11, fontFamily: "IBM Plex Mono" }} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#1C262B", border: "1px solid #324047", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#ECEFE9" }} itemStyle={{ color: "#F0935F" }} formatter={(v: number) => [`${v}h`, "Studied"]} />
        <Bar dataKey="hours" radius={[5, 5, 5, 5]} maxBarSize={28}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.hours >= 2 ? "#E8743B" : "#4C7A5E"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
