import { BarChart3, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("bg-sidebar text-sidebar-foreground w-64 min-h-screen p-6", className)}>
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
          <Target className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-sidebar-foreground">Agent Co-Pilot</h1>
          <p className="text-sm text-sidebar-foreground/70">Sales Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-sidebar-accent text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent-hover">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </button>
        
        <button className="flex items-center gap-3 w-full p-3 rounded-lg text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Users className="w-5 h-5" />
          <span className="font-medium">Leads</span>
        </button>
      </nav>

      {/* Stats Section */}
      <div className="mt-8 p-4 bg-sidebar-accent/50 rounded-lg">
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-3">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-sidebar-foreground/70">Active Leads</span>
            <span className="font-semibold text-sidebar-foreground">24</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-sidebar-foreground/70">Conversions</span>
            <span className="font-semibold text-sidebar-foreground">18%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}