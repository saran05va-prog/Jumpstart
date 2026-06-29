import { LayoutDashboard, Route, Library, NotebookPen, Target, BarChart3, Award, FolderGit2, Calendar } from "lucide-react";

export const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/roadmaps", label: "Roadmaps", icon: Route },
  { to: "/app/resources", label: "Resources", icon: Library },
  { to: "/app/notes", label: "Notes", icon: NotebookPen },
  { to: "/app/schedule", label: "Schedule", icon: Calendar },
  { to: "/app/goals", label: "Goals", icon: Target },
  { to: "/app/progress", label: "Progress", icon: BarChart3 },
  { to: "/app/certifications", label: "Certifications", icon: Award },
  { to: "/app/projects", label: "Projects", icon: FolderGit2 },
];
