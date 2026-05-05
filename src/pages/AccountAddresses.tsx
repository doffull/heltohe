import { MapPin } from 'lucide-react';

export default function AccountAddresses() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold hud-text mb-6 sm:mb-8">MES ADRESSES</h1>
        <div className="chamfer-hud bg-card/50 p-8 sm:p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Vous n'avez pas encore d'adresse enregistrée.</p>
        </div>
      </div>
    </div>
  );
}
