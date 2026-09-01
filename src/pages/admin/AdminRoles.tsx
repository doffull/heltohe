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
import { ShieldCheck, ShieldOff, Search, Loader2, Save, UserPlus, KeyRound, Mail, Trash2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, useRoleAuditLog, type AppRole } from '@/hooks/useUserRoles';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_SECTIONS } from '@/config/adminSections';
import { useRolePermissions, useSaveRolePermissions, DEFAULT_ROLE_ROUTES } from '@/hooks/useRolePermissions';

const MANAGED_ROLES: Exclude<AppRole, 'admin'>[] = ['stock_manager', 'preparator', 'order_validator', 'auditor'];

/** Liste des comptes porteurs d'un rôle (via RPC sécurisée). */
function RoleMembersCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['role-members'],
    queryFn: async () => {
      const out: { role: AppRole; users: { user_id: string; email: string }[] }[] = [];
      for (const role of ['admin', ...MANAGED_ROLES] as AppRole[]) {
        const { data, error } = await supabase.rpc('list_users_by_role', { p_role: role });
        if (error) throw error;
        out.push({ role, users: (data as any[]) || [] });
      }
      return out;
    },
  });

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Administrateurs & membres</h2>
        <p className="text-xs text-muted-foreground">Comptes ayant un rôle attribué</p>
      </div>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      <div className="space-y-4">
        {(data || []).map(({ role, users }) => (
          <div key={role} className="space-y-1">
            <Badge variant="outline" className={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
            {users.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun compte</p>
            ) : (
              <ul className="text-sm font-mono space-y-0.5">
                {users.map((u) => <li key={u.user_id} className="break-all">{u.email}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Grille de permissions : quelles sections du tableau de bord chaque rôle voit. */
function RolePermissionsCard() {
  const { data: perms, isLoading } = useRolePermissions();
  const save = useSaveRolePermissions();
  const [role, setRole] = useState<Exclude<AppRole, 'admin'>>('preparator');
  const [draft, setDraft] = useState<string[] | null>(null);

  const current = draft ?? perms?.[role] ?? DEFAULT_ROLE_ROUTES[role];
  const checked = new Set(current);

  const toggle = (href: string) => {
    const next = new Set(checked);
    if (next.has(href)) next.delete(href); else next.add(href);
    next.add('/admin'); // le tableau de bord reste toujours accessible
    setDraft(Array.from(next));
  };

  const persist = async () => {
    try {
      await save.mutateAsync({ role, routes: Array.from(checked) });
      setDraft(null);
      toast({ title: 'Permissions enregistrées', description: ROLE_LABELS[role] });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Permissions par rôle</h2>
        <p className="text-xs text-muted-foreground">
          Cochez les sections visibles pour ce rôle. Le Super Admin voit tout et n'est pas modifiable.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value as any); setDraft(null); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MANAGED_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <Button onClick={persist} disabled={!draft || save.isPending} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-96 overflow-y-auto pr-1">
          {ADMIN_SECTIONS.map((s) => (
            <label key={s.href} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={checked.has(s.href)}
                disabled={s.href === '/admin'}
                onCheckedChange={() => toggle(s.href)}
              />
              <span className={s.href === '/admin' ? 'text-muted-foreground' : ''}>{s.label}</span>
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}


/** Création de compte, gestion du mot de passe et envoi du lien de définition. */
function TeamAccessCard() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('preparator');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);


  const call = async (action: string, payload: Record<string, unknown> = {}) => {
    const mail = email.trim().toLowerCase();
    if (!mail) {
      toast({ title: 'E-mail requis', variant: 'destructive' });
      return null;
    }
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: {
          action,
          email: mail,
          redirectTo: `${window.location.origin}/reset-password`,
          ...payload,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      qc.invalidateQueries({ queryKey: ['role-members'] });
      qc.invalidateQueries({ queryKey: ['all-user-roles'] });
      return data as any;
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    const res = await call('create', { role, password: password || undefined });
    if (!res) return;
    setPassword('');
    setManualLink(res.mailError ? res.resetLink || null : null);
    toast({
      title: res.created ? 'Compte créé' : 'Compte mis à jour',
      description: res.mailError
        ? `Rôle attribué, mais l'e-mail n'est pas parti : ${res.mailError}`
        : `Lien de définition du mot de passe envoyé à ${email.trim()}`,
      variant: res.mailError ? 'destructive' : undefined,
    });
  };


  const setPwd = async () => {
    if (password.length < 8) {
      toast({ title: 'Mot de passe trop court', description: '8 caractères minimum.', variant: 'destructive' });
      return;
    }
    const res = await call('set_password', { password });
    if (res) {
      setPassword('');
      toast({ title: 'Mot de passe modifié', description: email.trim() });
    }
  };

  const sendLink = async () => {
    const res = await call('send_link');
    if (!res) return;
    if (res.mailError) {
      setManualLink(res.resetLink || null);
      toast({
        title: "E-mail non envoyé",
        description: `${res.mailError} — Le lien est affiché ci-dessous, vous pouvez le transmettre manuellement.`,
        variant: 'destructive',
      });
      return;
    }
    setManualLink(null);
    toast({ title: 'Lien envoyé', description: email.trim() });
  };


  const clearPwd = async () => {
    setConfirmClear(false);
    const res = await call('clear_password');
    if (res) {
      setManualLink(res.mailError ? res.resetLink || null : null);
      toast({

        title: 'Mot de passe supprimé',
        description: res.mailError
          ? `Le compte ne peut plus se connecter. E-mail non envoyé : ${res.mailError}`
          : 'Un lien de redéfinition a été envoyé.',
        variant: res.mailError ? 'destructive' : undefined,
      });
    }
  };

  const spin = (a: string) => busy === a;

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Accès & mot de passe</h2>
        <p className="text-xs text-muted-foreground">
          Créez le compte d'un membre, définissez ou supprimez son mot de passe, et envoyez-lui un
          lien pour le choisir lui-même (valable 24 h, usage unique).
        </p>
      </div>

      {manualLink && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs font-medium">
            L'envoi automatique a échoué (domaine d'expédition non encore vérifié). Transmettez ce
            lien au membre — valable 24 h, usage unique :
          </p>
          <div className="flex gap-2">
            <Input readOnly value={manualLink} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(manualLink);
                toast({ title: 'Lien copié' });
              }}
            >
              Copier
            </Button>
          </div>
        </div>
      )}



      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">E-mail du membre</label>
          <Input type="email" placeholder="membre@exemple.com" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Rôle à attribuer</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="auditor">Auditeur (lecture seule)</option>
            <option value="stock_manager">Resp. stock</option>
            <option value="preparator">Préparateur</option>
            <option value="order_validator">Valideur commandes</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            Mot de passe (optionnel — laissez vide pour que le membre le choisisse)
          </label>
          <Input type="text" autoComplete="new-password" placeholder="8 caractères minimum"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={create} disabled={!!busy || !email.trim()} className="gap-2">
          {spin('create') ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Créer l'accès + envoyer le lien
        </Button>
        <Button variant="outline" onClick={setPwd} disabled={!!busy || !email.trim() || !password} className="gap-2">
          {spin('set_password') ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Modifier le mot de passe
        </Button>
        <Button variant="outline" onClick={sendLink} disabled={!!busy || !email.trim()} className="gap-2">
          {spin('send_link') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Envoyer un lien
        </Button>
        <Button variant="destructive" onClick={() => setConfirmClear(true)} disabled={!!busy || !email.trim()} className="gap-2">
          {spin('clear_password') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Supprimer le mot de passe
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Les e-mails partent depuis le domaine d'envoi vérifié du site (SPF/DKIM), avec version texte
        et adresse de réponse réelle — les réglages qui évitent le dossier « courriers indésirables ».
      </p>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le membre ne pourra plus se connecter avec son mot de passe actuel. Un lien de
              redéfinition lui sera envoyé automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={clearPwd}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

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
                <option value="order_validator">Valideur commandes</option>
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

      <TeamAccessCard />

      <RoleMembersCard />


      <RolePermissionsCard />

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
