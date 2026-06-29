import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Flame, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("demo@jumpstart.dev");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/app";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "INVALID_CREDENTIALS"
            ? "Invalid email or password."
            : err.message,
        );
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
            "Twenty-four days in, and I finally believe I'll actually finish this roadmap."
          </p>
          <p className="text-[13px] text-mist-500">Asha Raman · Backend Systems Engineering</p>
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

          <h1 className="font-display text-[24px] text-paper mb-1.5">Welcome back</h1>
          <p className="text-[13px] text-mist-500 mb-7">Log in to pick up your streak where you left off.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-mist-500">Password</span>
                <button type="button" className="text-[11.5px] text-ember-400 hover:text-ember-200">Forgot?</button>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5">
                <Lock size={15} className="text-mist-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? <Loader2 size={15} className="animate-spin" /> : <>Log in <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-[12.5px] text-mist-500 mt-6 text-center">
            New to Jumpstart?{" "}
            <Link to="/register" className="text-ember-400 hover:text-ember-200 font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
