import { DollarSign, Target, Clock, Users } from 'lucide-react';
import { useLeadStore } from '@/store/useLeadStore';

export function MetricsCards() {
  const { leads, getPipelineValue, getConversionRate, getAvgCloseTime } = useLeadStore();
  
  const pipelineValue = getPipelineValue();
  const conversionRate = getConversionRate();
  const avgCloseTime = getAvgCloseTime();
  const activeLeads = leads.filter(lead => lead.status !== 'Proposal Sent').length;

  const metrics = [
    {
      label: 'Pipeline Value',
      value: `$${(pipelineValue / 1000).toFixed(0)}K`,
      change: '+12% this month',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      change: '+3.2% vs last month',
      changeType: 'positive' as const,
      icon: Target,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Avg Close Time',
      value: `${avgCloseTime}d`,
      change: '-4 days improved',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      label: 'Active Leads',
      value: activeLeads.toString(),
      change: '+1 new this week',
      changeType: 'positive' as const,
      icon: Users,
      color: 'text-accent-foreground', 
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className={`text-xs ${
              metric.changeType === 'positive' ? 'text-success' : 'text-destructive'
            }`}>
              {metric.change}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}