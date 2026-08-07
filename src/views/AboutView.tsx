 import { useState } from 'react';
 import { Shield, Zap, Target, Cpu, Send, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Button } from '@/components/ui/button';
 import { useToast } from '@/hooks/use-toast';

const values = [
  {
    icon: Shield,
    titleFR: 'PROTECTION',
    titleEN: 'PROTECTION',
    descFR: 'Nos équipements sont conçus pour résister aux conditions les plus extrêmes.',
    descEN: 'Our equipment is designed to withstand the most extreme conditions.',
  },
  {
    icon: Zap,
    titleFR: 'PERFORMANCE',
    titleEN: 'PERFORMANCE',
    descFR: 'Chaque pièce est optimisée pour une mobilité et une efficacité maximales.',
    descEN: 'Every piece is optimized for maximum mobility and efficiency.',
  },
  {
    icon: Target,
    titleFR: 'PRÉCISION',
    titleEN: 'PRECISION',
    descFR: 'Attention méticuleuse aux détails dans chaque couture et finition.',
    descEN: 'Meticulous attention to detail in every stitch and finish.',
  },
  {
    icon: Cpu,
    titleFR: 'INNOVATION',
    titleEN: 'INNOVATION',
    descFR: 'Technologies de pointe intégrées pour une expérience utilisateur supérieure.',
    descEN: 'Cutting-edge technologies integrated for a superior user experience.',
  },
];

export function AboutView() {
  const { language } = useApp();
   const { toast } = useToast();
   const [formData, setFormData] = useState({ name: '', email: '', message: '' });
   const [isSending, setIsSending] = useState(false);
   const [sent, setSent] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.name || !formData.email || !formData.message) {
       toast({
         title: language === 'FR' ? 'Champs requis' : 'Required fields',
         description: language === 'FR' ? 'Veuillez remplir tous les champs' : 'Please fill all fields',
         variant: 'destructive',
       });
       return;
     }
     
     setIsSending(true);
     try {
       const { error } = await supabase.from('messages').insert({
         name: formData.name,
         email: formData.email,
         message: formData.message,
       });
       
       if (error) throw error;
       
       setSent(true);
       setFormData({ name: '', email: '', message: '' });
       toast({
         title: language === 'FR' ? 'Message envoyé' : 'Message sent',
         description: language === 'FR' ? 'Nous vous répondrons bientôt' : 'We will reply soon',
       });
     } catch (err) {
       console.error(err);
       toast({
         title: language === 'FR' ? 'Erreur' : 'Error',
         description: language === 'FR' ? 'Erreur de liaison. Réessayez.' : 'Connection error. Try again.',
         variant: 'destructive',
       });
     } finally {
       setIsSending(false);
     }
   };
  
  return (
    <div className="min-h-screen py-8">
      {/* Hero Section */}
      <section className="px-6 lg:px-12 py-16">
        <div className="max-w-4xl">
          <h1 className="hud-text text-xs text-primary tracking-[0.3em] mb-4">
            // {language === 'FR' ? 'À PROPOS' : 'ABOUT US'}
          </h1>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            {language === 'FR' ? 'HELVETICA-MP CONCEPT' : 'HELVETICA-MP CONCEPT'}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {language === 'FR' 
              ? 'Nous sommes une équipe d\'ingénieurs et de designers passionnés par l\'équipement tactique de nouvelle génération. Notre mission : fusionner style urbain et fonctionnalité militaire pour créer des vêtements qui transcendent les conventions.'
              : 'We are a team of engineers and designers passionate about next-generation tactical equipment. Our mission: to fuse urban style and military functionality to create clothing that transcends conventions.'
            }
          </p>
          <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full" />
        </div>
      </section>
      
      {/* Mission Statement */}
      <section className="px-6 lg:px-12 py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 chamfer-hud-sm mb-6">
            <span className="hud-text text-xs text-primary tracking-wider">
              {language === 'FR' ? 'NOTRE MISSION' : 'OUR MISSION'}
            </span>
          </div>
          <blockquote className="text-2xl lg:text-3xl font-light italic text-foreground/90">
            "{language === 'FR' 
              ? 'Équiper les individus pour qu\'ils affrontent demain avec confiance, style et protection absolue.'
              : 'Equipping individuals to face tomorrow with confidence, style, and absolute protection.'
            }"
          </blockquote>
        </div>
      </section>
      
      {/* Values */}
      <section className="px-6 lg:px-12 py-16">
        <div className="mb-12">
          <h3 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
            // {language === 'FR' ? 'NOS VALEURS' : 'OUR VALUES'}
          </h3>
          <h4 className="text-2xl font-bold">
            {language === 'FR' ? 'CE QUI NOUS DÉFINIT' : 'WHAT DEFINES US'}
          </h4>
          <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full mt-4" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div 
                key={index}
                className={cn(
                  "p-6 bg-card border border-border/30 chamfer-hud",
                  "transition-all duration-300 hover:border-primary/50 hover:shadow-hud",
                  "animate-slide-in-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center chamfer-hud-sm mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h5 className="hud-text text-sm font-bold mb-2">
                  {language === 'FR' ? value.titleFR : value.titleEN}
                </h5>
                <p className="text-sm text-muted-foreground">
                  {language === 'FR' ? value.descFR : value.descEN}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      
      {/* Stats */}
      <section className="px-6 lg:px-12 py-16 bg-secondary/20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: '2019', labelFR: 'FONDÉ EN', labelEN: 'FOUNDED' },
            { value: '50K+', labelFR: 'CLIENTS', labelEN: 'CUSTOMERS' },
            { value: '200+', labelFR: 'PRODUITS', labelEN: 'PRODUCTS' },
            { value: '15', labelFR: 'PAYS', labelEN: 'COUNTRIES' },
          ].map((stat, index) => (
            <div 
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="hud-text text-xs text-muted-foreground tracking-wider">
                {language === 'FR' ? stat.labelFR : stat.labelEN}
              </div>
            </div>
          ))}
        </div>
      </section>
       
       {/* Contact Form Section */}
       <section className="px-6 lg:px-12 py-16">
         <div className="max-w-2xl mx-auto">
           <div className="mb-8 text-center">
             <h3 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
               // {language === 'FR' ? 'TRANSMISSION DIRECTE' : 'DIRECT TRANSMISSION'}
             </h3>
             <h4 className="text-2xl font-bold">
               {language === 'FR' ? 'CONTACTER LE COMMANDEMENT' : 'CONTACT COMMAND'}
             </h4>
             <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent w-full mt-4" />
           </div>
           
           {sent ? (
             <div className="text-center p-12 bg-card border border-primary/30 chamfer-hud">
               <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4 animate-bounce" />
               <h5 className="text-xl font-bold mb-2">
                 {language === 'FR' ? 'TRANSMISSION RÉUSSIE' : 'TRANSMISSION SUCCESSFUL'}
               </h5>
               <p className="text-sm text-muted-foreground mb-6">
                 {language === 'FR' ? 'Message transmis au Secteur Alpha' : 'Message transmitted to Alpha Sector'}
               </p>
               <Button 
                 variant="outline" 
                 onClick={() => setSent(false)}
                 className="chamfer-hud-sm"
               >
                 {language === 'FR' ? 'Nouvelle Transmission' : 'New Transmission'}
               </Button>
             </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-card/50 border border-border/30 chamfer-hud">
               <div className="space-y-2">
                 <label className="hud-text text-xs text-muted-foreground tracking-wider">
                   {language === 'FR' ? 'IDENTIFIANT' : 'IDENTIFIER'}
                 </label>
                 <Input
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   placeholder={language === 'FR' ? 'VOTRE NOM' : 'YOUR NAME'}
                   className="bg-background/50 border-border/50 focus:border-primary chamfer-hud-sm uppercase text-xs font-bold tracking-wider"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="hud-text text-xs text-muted-foreground tracking-wider">
                   {language === 'FR' ? 'LIAISON EMAIL' : 'EMAIL LINK'}
                 </label>
                 <Input
                   type="email"
                   value={formData.email}
                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                   placeholder="VOTRE@EMAIL.COM"
                   className="bg-background/50 border-border/50 focus:border-primary chamfer-hud-sm uppercase text-xs font-bold tracking-wider"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="hud-text text-xs text-muted-foreground tracking-wider">
                   {language === 'FR' ? 'DONNÉES MESSAGE' : 'MESSAGE DATA'}
                 </label>
                 <Textarea
                   value={formData.message}
                   onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                   placeholder={language === 'FR' ? 'VOTRE RAPPORT...' : 'YOUR REPORT...'}
                   rows={5}
                   className="bg-background/50 border-border/50 focus:border-primary chamfer-hud-sm uppercase text-xs font-bold tracking-wider resize-none"
                 />
               </div>
               
               <Button
                 type="submit"
                 disabled={isSending}
                 className="w-full h-14 chamfer-hud text-sm font-black uppercase tracking-[0.3em] group"
               >
                 {isSending ? (
                   'SYNCHRONISATION...'
                 ) : (
                   <>
                     <Send className="h-4 w-4 mr-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                     {language === 'FR' ? 'ENVOYER RAPPORT' : 'SEND REPORT'}
                   </>
                 )}
               </Button>
             </form>
           )}
         </div>
       </section>
    </div>
  );
}
