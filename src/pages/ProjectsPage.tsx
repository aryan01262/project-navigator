import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FolderKanban, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types/planner';

const ProjectsPage = () => {
  const { projects, createProject, role } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!name.trim()) return;
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description,
      createdAt: new Date().toISOString(),
      sixWeekPlans: [],
    };
    createProject(project);
    setName(''); setDescription('');
    setShowCreate(false);
    navigate(`/projects/${project.id}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" /> Projects
          </h1>
          <p className="text-muted-foreground">{projects.length} project(s)</p>
        </div>
        {role === 'admin' && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first project to start planning</p>
          {role === 'admin' && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Project</Button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(`/projects/${p.id}`)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {p.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.description || 'No description'}</p>
                <p className="text-xs text-muted-foreground mt-2">{p.sixWeekPlans.length} plan(s) · Created {new Date(p.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tower B Construction" className="mt-1" /></div>
            <div><Label>Description (optional)</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief project description" className="mt-1" /></div>
            <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create Project</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
