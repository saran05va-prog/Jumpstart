import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

import { type RoadmapProgress } from "../../lib/types";
import { colorThemeToTone } from "../../lib/types";
import { colorMap } from "../../lib/utils";

export default function SkillRadar({ data }: { data: RoadmapProgress[] }) {
  const chartData = data.map((r) => {
    const tone = colorThemeToTone(r.colorTheme);
    return { skill: r.title.length > 12 ? r.title.slice(0, 12) + "…" : r.title, value: r.progressPercent, tone };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={chartData} outerRadius="72%">
        <PolarGrid stroke="#324047" />
        <PolarAngleAxis dataKey="skill" tick={{ fill: "#8A9A93", fontSize: 11 }} />
        <Radar dataKey="value" stroke="#E8743B" fill="#E8743B" fillOpacity={0.22} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
