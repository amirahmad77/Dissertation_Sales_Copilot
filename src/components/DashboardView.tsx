import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { CreateLeadModal } from './CreateLeadModal';
import { MetricsCards } from './MetricsCards';
import { MonthlyGoalProgress } from './MonthlyGoalProgress';
import { PriorityActions } from './PriorityActions';
import { PipelineBreakdown } from './PipelineBreakdown';
import { AgentCoPilotCanvas } from './AgentCoPilotCanvas';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';

export function DashboardView() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mission Control</h1>
          <p className="text-muted-foreground mt-1">
            Sales intelligence and pipeline management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-primary hover:opacity-90 transition-opacity duration-200 shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Lead
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Progress & Actions */}
        <div className="space-y-6">
          <MonthlyGoalProgress />
          <PriorityActions />
        </div>

        {/* Right Column - Pipeline Breakdown */}
        <div className="lg:col-span-1">
          <PipelineBreakdown />
        </div>
      </div>

      {/* Kanban Board */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Actionable Pipeline</h2>
        <KanbanBoard />
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Agent Co-Pilot Canvas */}
      <AgentCoPilotCanvas />
    </div>
  );
}