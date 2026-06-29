import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Flame, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { ApiError } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(name, email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "DUPLICATE_RESOURCE") {
          setError("An account with this email already exists.");
        } else if (err.fieldErrors) {
          setError(Object.values(err.fieldErrors).join(" "));
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-ink-800">
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 bg-gradient-to-br from-slate-900 to-ink-900 border-r border-slate-700">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
            <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
          </div>
          <span className="font-display text-[18px] text-paper">Jumpstart</span>
        </Link>
        <div>
          <p className="font-display text-[26px] text-paper leading-snug mb-3">
            Roadmaps, notes, and progress in one place — built for people who actually finish what they start.
          </p>
        </div>
        <p className="text-[11.5px] font-mono text-mist-700">© {new Date().getFullYear()} Jumpstart</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
              <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] text-paper">Jumpstart</span>
          </div>

          <h1 className="font-display text-[24px] text-paper mb-1.5">Create your account</h1>
          <p className="text-[13px] text-mist-500 mb-7">Free to start. No credit card.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Full name</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5">
                <User size={15} className="text-mist-500" />
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Asha Raman"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-paper placeholder:text-mist-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Email</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5">
                <Mail size={15} className="text-mist-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-paper placeholder:text-mist-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Password</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5">
                <Lock size={15} className="text-mist-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-paper placeholder:text-mist-500"
                />
              </div>
            </label>

            {error && <p className="text-[12px] text-ember-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-[12.5px] text-mist-500 mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-ember-400 hover:text-ember-200 font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
