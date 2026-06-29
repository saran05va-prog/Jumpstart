import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileDrawer from "./MobileDrawer";
import CommandPalette from "../ui/CommandPalette";
import AssistiveTouch from "../ui/AssistiveTouch";
import Toaster from "../ui/Toaster";

export default function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-800">
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} mobileMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
        </main>
      </div>
      <CommandPalette />
      <AssistiveTouch />
      <Toaster />
    </div>
  );
}
