import { Progress } from '@/components/ui/progress';
import { useLeadStore } from '@/store/useLeadStore';

export function MonthlyGoalProgress() {
  const { getMonthlyProgress } = useLeadStore();
  const progress = getMonthlyProgress();
  
  const formatCurrency = (amount: number) => {
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Monthly Goal Progress</h3>
        <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
          {progress.percentage.toFixed(0)}%
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(progress.current)} of {formatCurrency(progress.target)} goal
          </span>
        </div>
        
        <Progress 
          value={progress.percentage} 
          className="h-3"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Goal Achievement</span>
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(progress.target - progress.current)} remaining
          </span>
        </div>
      </div>
    </div>
  );
}