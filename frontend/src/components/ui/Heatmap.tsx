import { type StudyDay } from "../../lib/types";

const levelColor = ["bg-slate-700", "bg-moss-500/30", "bg-moss-500/55", "bg-moss-500/80", "bg-ember-500"];
const days = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function intensityLevel(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 0.5) return 1;
  if (hours < 1.5) return 2;
  if (hours < 3) return 3;
  return 4;
}

export default function Heatmap({ data }: { data: StudyDay[] }) {
  const weeks: StudyDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-[3px] pt-[2px] text-[9.5px] text-mist-700 font-mono">
        {days.map((d, i) => (
          <span key={i} className="h-[11px] leading-[11px]">{d}</span>
        ))}
      </div>
      <div className="flex gap-[3px] overflow-x-auto scrollbar-none">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d, di) => {
              const level = intensityLevel(d.hours);
              return (
                <div
                  key={di}
                  title={`${d.date}: ${d.hours.toFixed(1)}h, ${d.sessions} sessions`}
                  className={`w-[11px] h-[11px] rounded-[2px] ${levelColor[level]} ${level === 4 ? "animate-pulseRing" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
