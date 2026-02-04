import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">PARAMÈTRES</h1>
        <p className="text-muted-foreground mt-1">Configuration de la boutique</p>
      </div>

      <div className="chamfer-hud bg-card/50 p-12 text-center">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Module Paramètres à venir...</p>
      </div>
    </div>
  );
}
