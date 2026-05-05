import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: route inexistante:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="text-center max-w-md w-full">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase mb-4">
          // Erreur Système
        </p>
        <h1 className="mb-2 text-7xl sm:text-8xl font-bold tracking-tighter text-foreground">
          404
        </h1>
        <p className="mb-2 text-lg sm:text-xl font-bold uppercase tracking-wider">
          Page introuvable
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          La ressource demandée n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="rounded-none uppercase tracking-wider">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none uppercase tracking-wider">
            <Link to="/boutique">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Boutique
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
