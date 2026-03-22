import { useAppContext } from '@/context/AppContext';
import { CreatePlanForm } from './CreatePlanForm';
import { AdminTaskTable } from './AdminTaskTable';

export const AdminPanel = () => {
  const { plan } = useAppContext();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Admin Panel</h1>
      <p className="text-muted-foreground mb-6">Create and manage 6-week construction plans</p>
      {plan ? <AdminTaskTable /> : <CreatePlanForm />}
    </div>
  );
};
