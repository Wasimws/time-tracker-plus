import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield, User, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  email: string;
  fullName: string;
  role: 'employee' | 'management';
  isOrgCreator: boolean;
  createdAt: string;
}

export function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      // Fetch all user roles with is_org_creator
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, is_org_creator');

      if (rolesError) throw rolesError;

      // Create a map of user roles
      const rolesMap = new Map<string, { role: 'employee' | 'management'; isOrgCreator: boolean }>();
      roles?.forEach(r => {
        rolesMap.set(r.user_id, { 
          role: r.role as 'employee' | 'management',
          isOrgCreator: r.is_org_creator || false
        });
      });

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const roleData = rolesMap.get(profile.id);
        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name || 'Brak nazwy',
          role: roleData?.role || 'employee',
          isOrgCreator: roleData?.isOrgCreator || false,
          createdAt: profile.created_at,
        };
      });

      // Sort: org creators first, then by creation date
      usersWithRoles.sort((a, b) => {
        if (a.isOrgCreator && !b.isOrgCreator) return -1;
        if (!a.isOrgCreator && b.isOrgCreator) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy użytkowników',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'employee' | 'management') => {
    // Prevent changing own role
    if (userId === user?.id) {
      toast({
        title: 'Błąd',
        description: 'Nie możesz zmienić własnej roli',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is org creator
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.isOrgCreator) {
      toast({
        title: 'Błąd',
        description: 'Nie można zmienić roli twórcy firmy. Twórca organizacji jest chroniony.',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingUserId(userId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );

      toast({
        title: 'Sukces',
        description: `Rola użytkownika została zmieniona na ${newRole === 'management' ? 'Zarząd' : 'Pracownik'}`,
      });
    } catch (error: unknown) {
      console.error('Error updating role:', error);
      
      // Check for creator protection or last management user error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCreatorError = errorMessage.includes('twórcy') || errorMessage.includes('creator');
      const isLastManagementError = errorMessage.includes('last management user') || 
        errorMessage.includes('ostatniego administratora');
      
      toast({
        title: 'Błąd',
        description: isCreatorError
          ? 'Nie można zmienić roli twórcy firmy. Twórca organizacji jest chroniony.'
          : isLastManagementError 
            ? 'Nie można usunąć ostatniego administratora. Organizacja musi mieć co najmniej jednego użytkownika z rolą Zarząd.'
            : 'Nie udało się zmienić roli użytkownika',
        variant: 'destructive',
      });
      
      // Refresh to get current state
      fetchUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const managementCount = users.filter(u => u.role === 'management').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wszyscy użytkownicy</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/50 rounded-full">
                <Shield className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zarząd</p>
                <p className="text-2xl font-bold">{managementCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-full">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pracownicy</p>
                <p className="text-2xl font-bold">{employeeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zarządzanie użytkownikami</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Brak użytkowników w systemie
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Data rejestracji</TableHead>
                    <TableHead>Rola</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(userItem => {
                    const isCurrentUser = userItem.id === user?.id;
                    const isUpdating = updatingUserId === userItem.id;
                    const canChangeRole = !isCurrentUser && !userItem.isOrgCreator;

                    return (
                      <TableRow key={userItem.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {userItem.fullName}
                            {userItem.isOrgCreator && (
                              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                Właściciel
                              </Badge>
                            )}
                            {isCurrentUser && !userItem.isOrgCreator && (
                              <Badge variant="outline" className="text-xs">Ty</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {userItem.email}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(userItem.createdAt), 'd MMM yyyy', { locale: pl })}
                        </TableCell>
                        <TableCell>
                          {!canChangeRole ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <Shield className="h-3 w-3" />
                              Zarząd
                              {userItem.isOrgCreator && <span className="text-xs">(chroniony)</span>}
                            </Badge>
                          ) : (
                            <Select
                              value={userItem.role}
                              onValueChange={(value) => handleRoleChange(userItem.id, value as 'employee' | 'management')}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-[140px]">
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Pracownik
                                  </div>
                                </SelectItem>
                                <SelectItem value="management">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Zarząd
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
