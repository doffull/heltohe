import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Retour à l'accueil
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
          )}
        </header>

        <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-wide [&_h2]:uppercase [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-muted-foreground [&_ul]:space-y-1 [&_ul]:mb-4 [&_ul]:pl-4 [&_li]:list-disc [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
