import { Megaphone } from 'lucide-react';

export default function AdminMarketing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">MARKETING</h1>
        <p className="text-muted-foreground mt-1">Gérez vos campagnes et promotions</p>
      </div>

      <div className="chamfer-hud bg-card/50 p-12 text-center">
        <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Module Marketing à venir...</p>
      </div>
    </div>
  );
}
