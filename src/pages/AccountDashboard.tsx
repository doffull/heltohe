import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Package, 
  MapPin, 
  Award, 
  LogOut,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';

export default function AccountDashboard() {
  const { user, signOut } = useAuth();

  const menuItems = [
    { 
      icon: Package, 
      label: 'Mes Commandes', 
      description: 'Suivre vos commandes et historique',
      href: '/compte/commandes' 
    },
    { 
      icon: User, 
      label: 'Mon Profil', 
      description: 'Gérer vos informations personnelles',
      href: '/compte/profil' 
    },
    { 
      icon: MapPin, 
      label: 'Mes Adresses', 
      description: 'Gérer vos adresses de livraison',
      href: '/compte/adresses' 
    },
    { 
      icon: Award, 
      label: 'Programme Fidélité', 
      description: 'Voir vos points et récompenses',
      href: '/compte/fidelite' 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold hud-text">MON COMPTE</h1>
            <p className="text-muted-foreground mt-1 text-sm truncate">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={signOut}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="chamfer-hud bg-card/50 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Commandes</p>
              </div>
            </div>
          </div>
          
          <div className="chamfer-hud bg-card/50 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Points fidélité</p>
              </div>
            </div>
          </div>
          
          <div className="chamfer-hud bg-card/50 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Adresses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid md:grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              to={item.href}
              className="chamfer-hud bg-card/50 p-6 flex items-center gap-4 hover:bg-card/70 transition-colors group"
            >
              <div className="p-3 bg-muted rounded-full">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold hud-text">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
