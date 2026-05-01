import { Home, Table2, List, Lightbulb, Settings, LogOut, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isTeacher, isAdmin, isViewer, role } = useUserRole();
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Início', url: '/dashboard', icon: Home },
    { title: 'Minhas Matrizes', url: '/matrices', icon: Table2 },
    { title: 'Banco de Funções', url: '/functions-bank', icon: List },
    { title: 'Conceitos Gerados', url: '/concepts', icon: Lightbulb },
    ...(isTeacher ? [{ title: 'Gestão', url: '/management', icon: Users }] : []),
    { title: 'Configurações', url: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabel = isAdmin ? 'Admin' : isTeacher ? 'Professor' : isViewer ? 'Espectador' : 'Aluno';
  const roleClass = isAdmin
    ? 'bg-red-600 text-white hover:bg-red-600'
    : isTeacher
    ? 'bg-blue-600 text-white hover:bg-blue-600'
    : isViewer
    ? 'bg-gray-500 text-white hover:bg-gray-500'
    : 'bg-green-600 text-white hover:bg-green-600';

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Table2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">MorphoDesign</h1>
            <p className="text-xs text-muted-foreground">Matriz Morfológica</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn('flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.user_metadata?.name || user?.email || 'Usuário'}</p>
            <Badge variant={roleVariant} className="text-[10px] h-4 px-1.5 mt-0.5">{roleLabel}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
