import { RoleSwitcher } from './RoleSwitcher';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router-dom';

export const AppShell = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card sticky top-0 z-30 flex items-center justify-between px-4">
            <SidebarTrigger className="mr-2" />
            <RoleSwitcher />
          </header>
          <main className="flex-1 p-6">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
