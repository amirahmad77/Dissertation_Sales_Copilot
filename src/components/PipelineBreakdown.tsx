import { useLeadStore } from '@/store/useLeadStore';

export function PipelineBreakdown() {
  const { leads } = useLeadStore();
  
  const breakdown = [
    {
      stage: 'New Leads',
      count: leads.filter(lead => lead.status === 'New Leads').length,
      color: 'bg-blue-500'
    },
    {
      stage: 'Contacted', 
      count: leads.filter(lead => lead.status === 'Contacted').length,
      color: 'bg-yellow-500'
    },
    {
      stage: 'Proposals',
      count: leads.filter(lead => lead.status === 'Proposal Sent').length,
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Pipeline Breakdown</h3>
      
      <div className="space-y-4">
        {breakdown.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-foreground">{item.stage}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}