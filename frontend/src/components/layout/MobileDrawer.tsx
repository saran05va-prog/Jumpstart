import { NavLink } from "react-router-dom";
import { X, Settings, Flame, LogOut } from "lucide-react";
import clsx from "clsx";
import { navItems } from "./nav";
import { useAuthStore } from "../../store/auth";

export default function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user: authUser, logout } = useAuthStore();

  const displayName = authUser?.name ?? "User";
  const displayRole = authUser
    ? authUser.role.charAt(0) + authUser.role.slice(1).toLowerCase()
    : "";
  const initials = displayName.split(" ").map((n) => n[0]).join("");

  async function handleLogout() {
    onClose();
    await logout();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-[78%] max-w-[280px] bg-ink-900 border-r border-slate-700 flex flex-col animate-rise">
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
              <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] text-paper">Jumpstart</span>
          </div>
          <button onClick={onClose} className="text-mist-400 p-1" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium",
                  isActive ? "bg-slate-700 text-paper" : "text-mist-400 hover:bg-slate-800"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} className={isActive ? "text-ember-400" : "text-mist-500"} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to="/app/settings"
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium",
                isActive ? "bg-slate-700 text-paper" : "text-mist-400 hover:bg-slate-800"
              )
            }
          >
            <Settings size={19} className="text-mist-500" />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-moss-500 flex items-center justify-center text-[12px] font-semibold text-ink-900 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-mist-100 truncate">{displayName}</p>
              <p className="text-[11px] text-mist-500 truncate">{displayRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-[13px] text-mist-300 hover:text-ember-400 hover:border-slate-600 transition-colors"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
