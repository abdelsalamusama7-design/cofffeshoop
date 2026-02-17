import WorkerExpensesTab from '@/components/WorkerExpensesTab';
import { getCurrentUser } from '@/lib/store';
import { Navigate } from 'react-router-dom';

const WorkerExpensesPage = () => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground text-center">💰 مصروفي</h1>
      <WorkerExpensesTab />
    </div>
  );
};

export default WorkerExpensesPage;
