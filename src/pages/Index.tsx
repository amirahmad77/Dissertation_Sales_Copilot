import { useLeadStore } from '@/store/useLeadStore';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { DealCanvas } from '@/components/DealCanvas';

const Index = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <main className="flex-1 p-6">
        <DashboardView />
      </main>

      {/* Deal Canvas Slide-over */}
      <DealCanvas />
    </div>
  );
};

export default Index;