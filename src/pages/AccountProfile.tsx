import { User } from 'lucide-react';

export default function AccountProfile() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold hud-text mb-6 sm:mb-8">MON PROFIL</h1>
        <div className="chamfer-hud bg-card/50 p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Formulaire de profil à venir...</p>
        </div>
      </div>
    </div>
  );
}
