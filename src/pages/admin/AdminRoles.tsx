import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldCheck, ShieldOff, Search, Loader2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, useRoleAuditLog, type AppRole } from '@/hooks/useUserRoles';

type FoundUser = { user_id: string; email: string; roles: AppRole[] };

export default function AdminRoles() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('admin');
  const [pending, setPending] = useState<null | 'grant' | 'revoke'>(null);
  const [busy, setBusy] = useState(false);
  const { data: audit, refetch: refetchAudit } = useRoleAuditLog();

  const search = async () => {
    const e = email.trim();
    if (!e) return;
    setSearching(true);
    setFound(null);
    setSearched(false);
    try {
      const { data, error } = await supabase.rpc('find_user_by_email', { p_email: e });
      if (error) throw error;
      const row = (data as any[])?.[0];
      setFound(row ? { user_id: row.user_id, email: row.email, roles: row.roles || [] } : null);
      setSearched(true);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Recherche impossible', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const confirm = async () => {
    if (!found || !pending) return;
    setBusy(true);
    try {
      if (pending === 'grant') {
        const { error } = await supabase.from('user_roles').insert({ user_id: found.user_id, role: selectedRole });
        if (error && !`${error.message}`.includes('duplicate')) throw error;
        toast({ title: `Rôle ${selectedRole} attribué`, description: found.email });
      } else {
        const { error } = await supabase.from('user_roles').delete()
          .eq('user_id', found.user_id).eq('role', selectedRole);
        if (error) throw error;
        toast({ title: `Rôle ${selectedRole} retiré`, description: found.email });
      }
      setPending(null);
      await search();
      qc.invalidateQueries({ queryKey: ['all-user-roles'] });
      refetchAudit();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Action impossible', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const isSelf = found?.user_id === user?.id;
  const hasRole = !!found?.roles?.includes(selectedRole);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold hud-text">GESTION DES RÔLES</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Attribuer ou retirer le rôle administrateur à un compte existant.
        </p>
      </div>

      <Card className="p-4 sm:p-6 space-y-4">
        <label className="text-sm font-medium">Rechercher un utilisateur par email</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={searching || !email.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2">Rechercher</span>
          </Button>
        </div>

        {searched && !found && (
          <p className="text-sm text-destructive">
            Aucun compte trouvé pour cet email. L'utilisateur doit d'abord créer un compte via /auth.
          </p>
        )}

        {found && (
          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-mono text-sm break-all">{found.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs break-all text-muted-foreground">{found.user_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rôles actuels</p>
              <div className="flex flex-wrap gap-2">
                {found.roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">Aucun rôle</span>
                ) : found.roles.map(r => (
                  <Badge key={r} variant="outline" className={ROLE_COLORS[r]}>{ROLE_LABELS[r]}</Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 items-stretch sm:items-center">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="auditor">Auditeur (lecture seule)</option>
                <option value="stock_manager">Resp. stock</option>
                <option value="preparator">Préparateur</option>
              </select>
              {!hasRole ? (
                <Button onClick={() => setPending('grant')} className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Attribuer
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setPending('revoke')}
                  disabled={isSelf && selectedRole === 'admin'}
                  className="gap-2"
                  title={isSelf && selectedRole === 'admin' ? 'Vous ne pouvez pas retirer votre propre rôle admin' : undefined}
                >
                  <ShieldOff className="h-4 w-4" /> Retirer
                </Button>
              )}
            </div>
            {isSelf && hasRole && selectedRole === 'admin' && (
              <p className="text-xs text-muted-foreground">Vous ne pouvez pas retirer votre propre rôle admin.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-bold mb-3">Activité récente</h2>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {(audit || []).slice(0, 30).map((row: any) => (
            <div key={row.id} className="text-xs font-mono flex flex-wrap gap-2 py-1 border-b border-border/50">
              <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString('fr-FR')}</span>
              <span className="font-semibold">{row.operation}</span>
              <span>{row.role}</span>
              <span className="text-muted-foreground break-all">→ {row.target_user_id}</span>
            </div>
          ))}
          {(!audit || audit.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucune activité</p>
          )}
        </div>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'grant' ? 'Promouvoir administrateur ?' : 'Retirer le rôle administrateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {pending === 'grant'
                    ? 'Ce compte aura accès complet à l\'administration du site.'
                    : 'Ce compte perdra l\'accès à l\'administration.'}
                </p>
                <p className="font-mono text-sm break-all bg-muted p-2 rounded">{found?.email}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
