import { NavLink } from "react-router-dom";
import { Settings, Flame, ChevronsLeft, LogOut } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { navItems as nav } from "./nav";
import clsx from "clsx";

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user: authUser, logout } = useAuthStore();

  const displayName = authUser?.name ?? "User";
  const displayRole = authUser
    ? authUser.role.charAt(0) + authUser.role.slice(1).toLowerCase()
    : "";
  const initials = displayName.split(" ").map((n) => n[0]).join("");

  async function handleLogout() {
    await logout();
  }

  return (
    <aside
      className={clsx(
        "hidden md:flex flex-col shrink-0 border-r border-slate-700 bg-ink-900/60 transition-[width] duration-200",
        sidebarCollapsed ? "w-[76px]" : "w-[244px]"
      )}
    >
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-slate-700">
        <div className="relative w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center shrink-0">
          <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <span className="font-display text-[18px] text-paper tracking-tight">Jumpstart</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        {nav.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-slate-700 text-paper"
                  : "text-mist-500 hover:text-mist-100 hover:bg-slate-800"
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={clsx(isActive ? "text-ember-400" : "text-mist-500 group-hover:text-mist-300")}
                />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors mb-2",
              isActive ? "bg-slate-700 text-paper" : "text-mist-500 hover:text-mist-100 hover:bg-slate-800"
            )
          }
        >
          <Settings size={18} className="text-mist-500" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft size={17} className={clsx("transition-transform", sidebarCollapsed && "rotate-180")} />
          {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
        </button>

        {sidebarCollapsed ? (
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-mist-500 hover:text-ember-400 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-moss-500 flex items-center justify-center text-[11px] font-semibold text-ink-900 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-mist-100 truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-mist-500 truncate leading-tight">{displayRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-mist-500 hover:text-ember-400 transition-colors p-1 shrink-0"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
