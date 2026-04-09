import { useAppContext } from '@/context/AppContext';
import type { Role } from '@/types/planner';
import { Shield, HardHat, Wrench } from 'lucide-react';

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'bg-primary text-primary-foreground' },
  supervisor: { label: 'Supervisor', icon: <HardHat className="w-4 h-4" />, color: 'bg-secondary text-secondary-foreground' },
  engineer: { label: 'Engineer', icon: <Wrench className="w-4 h-4" />, color: 'bg-accent text-accent-foreground' },
};

export const RoleSwitcher = () => {
  const { role } = useAppContext();
  const r = roleConfig[role];

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${r.color} shadow-sm`}>
        {r.icon}
        <span>{r.label}</span>
      </div>
    </div>
  );
};
