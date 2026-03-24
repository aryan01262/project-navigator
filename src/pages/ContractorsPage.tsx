import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users } from 'lucide-react';
import type { Contractor } from '@/types/planner';

const ContractorsPage = () => {
  const { contractors, addContractor } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [contact, setContact] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addContractor({ id: crypto.randomUUID(), name: name.trim(), specialization, contact });
    setName(''); setSpecialization(''); setContact('');
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Contractors
          </h1>
          <p className="text-muted-foreground">{contractors.length} contractors registered</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Contractor
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="font-semibold">#</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Specialization</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.specialization || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.contact || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Contractor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Adhiraj Construction" className="mt-1" /></div>
            <div><Label>Specialization</Label><Input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Structural" className="mt-1" /></div>
            <div><Label>Contact</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone or email" className="mt-1" /></div>
            <Button onClick={handleAdd} disabled={!name.trim()} className="w-full">Add Contractor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractorsPage;
