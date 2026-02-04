import { Users } from 'lucide-react';

export default function AdminCustomers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">CLIENTS</h1>
        <p className="text-muted-foreground mt-1">Gestion de votre base clients</p>
      </div>

      <div className="chamfer-hud bg-card/50 p-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Module CRM à venir...</p>
      </div>
    </div>
  );
}
