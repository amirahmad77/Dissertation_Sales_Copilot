import { CheckCircle, Circle, Clock, Phone, Mail } from 'lucide-react';
import { useState } from 'react';

interface Action {
  id: string;
  title: string;
  type: 'call' | 'email' | 'follow-up';
  completed: boolean;
  leadName: string;
  priority: 'High' | 'Medium' | 'Low';
}

export function PriorityActions() {
  const [actions, setActions] = useState<Action[]>([
    {
      id: '1',
      title: 'Follow up on proposal',
      type: 'call',
      completed: false,
      leadName: 'Style Boutique',
      priority: 'High'
    },
    {
      id: '2', 
      title: 'Send pricing information',
      type: 'email',
      completed: false,
      leadName: 'Fresh Bites Cafe',
      priority: 'High'
    },
    {
      id: '3',
      title: 'Schedule demo call',
      type: 'follow-up',
      completed: true,
      leadName: 'Tech Solutions Inc',
      priority: 'Medium'
    }
  ]);

  const toggleAction = (actionId: string) => {
    setActions(prev => prev.map(action => 
      action.id === actionId ? { ...action, completed: !action.completed } : action
    ));
  };

  const getActionIcon = (type: Action['type']) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'follow-up':
        return Clock;
    }
  };

  const pendingActions = actions.filter(action => !action.completed);
  const completedActions = actions.filter(action => action.completed);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Priority Actions</h3>
        {completedActions.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedActions.length} completed today
          </span>
        )}
      </div>

      <div className="space-y-3">
        {pendingActions.length === 0 && completedActions.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">
              All high-priority actions completed!
            </span>
          </div>
        )}

        {pendingActions.map((action) => {
          const ActionIcon = getActionIcon(action.type);
          return (
            <div
              key={action.id}
              className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
              onClick={() => toggleAction(action.id)}
            >
              <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
              <ActionIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.leadName}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                action.priority === 'High' 
                  ? 'bg-destructive/10 text-destructive'
                  : action.priority === 'Medium'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {action.priority}
              </span>
            </div>
          );
        })}

        {completedActions.map((action) => {
          const ActionIcon = getActionIcon(action.type);
          return (
            <div
              key={action.id}
              className="flex items-center gap-3 p-3 opacity-60"
            >
              <CheckCircle className="w-4 h-4 text-success" />
              <ActionIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm line-through text-muted-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.leadName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}