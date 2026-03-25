import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-muted text-muted-foreground border-border' },
  assigned:  { label: 'Assigned',  className: 'bg-primary/10 text-primary border-primary/20' },
  forwarded: { label: 'Forwarded', className: 'bg-secondary/10 text-secondary border-secondary/20' },
  logged:    { label: 'Logged',    className: 'bg-accent/10 text-accent border-accent/20' },
  submitted: { label: 'Submitted', className: 'bg-primary/20 text-primary border-primary/30' },
  confirmed: { label: 'Confirmed', className: 'bg-accent text-accent-foreground border-accent/20' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
};
