import { Link } from "react-router-dom";
import { Flame, Route, BarChart3, NotebookPen, ArrowRight, Check } from "lucide-react";

const features = [
  { icon: Route, title: "Trail-map roadmaps", desc: "See prerequisite order, difficulty, and estimated hours laid out as an actual path, not a checklist." },
  { icon: BarChart3, title: "Progress you can see", desc: "Streaks, heatmaps, and skill coverage update automatically as you complete topics." },
  { icon: NotebookPen, title: "Notes that stay with the work", desc: "Every note is attached to the roadmap it came from — nothing gets lost in a separate app." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-800">
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
              <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] text-paper">Jumpstart</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[13px] text-mist-300 hover:text-paper px-3 py-1.5">Log in</Link>
            <Link to="/register" className="text-[13px] bg-ember-500 text-ink-900 font-medium px-4 py-2 rounded-lg hover:bg-ember-400">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="eyebrow mb-4 justify-center flex">Learning operating system</p>
        <h1 className="font-display text-[40px] md:text-[52px] text-paper leading-[1.1] mb-5">
          Plan the roadmap.<br />Keep the streak.<br /><span className="text-ember-400">Finish the thing.</span>
        </h1>
        <p className="text-[15px] text-mist-400 max-w-xl mx-auto mb-8">
          Jumpstart turns scattered tutorials, bookmarks, and notes into one ordered path — with the progress tracking to prove you're actually moving.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register" className="flex items-center gap-2 bg-ember-500 text-ink-900 font-medium px-5 py-3 rounded-lg text-[14px] hover:bg-ember-400">
            Start your first roadmap <ArrowRight size={15} />
          </Link>
          <Link to="/login" className="px-5 py-3 rounded-lg text-[14px] text-mist-300 border border-slate-700 hover:border-slate-600">
            Log in
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-5">
        {features.map((f) => (
          <div key={f.title} className="panel p-5">
            <div className="w-10 h-10 rounded-lg bg-ember-500/15 flex items-center justify-center mb-4">
              <f.icon size={18} className="text-ember-400" />
            </div>
            <h3 className="text-[14.5px] font-semibold text-paper mb-1.5">{f.title}</h3>
            <p className="text-[12.5px] text-mist-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="panel p-8 text-center">
          <h2 className="font-display text-[22px] text-paper mb-2">Free to start, no credit card</h2>
          <p className="text-[13px] text-mist-500 mb-6">Built for students, bootcamp cohorts, and self-taught engineers alike.</p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-7 text-[12.5px] text-mist-400">
            {["Unlimited roadmaps", "Progress analytics", "Resource library", "Certifications tracker"].map((f) => (
              <li key={f} className="flex items-center gap-1.5"><Check size={13} className="text-moss-400" /> {f}</li>
            ))}
          </ul>
          <Link to="/register" className="inline-flex items-center gap-2 bg-ember-500 text-ink-900 font-medium px-5 py-3 rounded-lg text-[14px] hover:bg-ember-400">
            Create your account <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-700 py-6 text-center text-[11.5px] font-mono text-mist-700">
        © {new Date().getFullYear()} Jumpstart
      </footer>
    </div>
  );
}
