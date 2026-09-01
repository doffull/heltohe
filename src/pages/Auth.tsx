import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Mail, Lock, Eye, EyeOff, ChevronRight, Smartphone, KeyRound, Apple } from 'lucide-react';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Preserve a same-origin `next` path (used by the OAuth consent route so the
  // user comes back to /.lovable/oauth/consent after signing in).
  const rawNext = searchParams.get('next') || '';
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const redirectOrigin = window.location.origin + nextPath;

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Phone (SMS OTP) login
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(nextPath);
    }
  }, [user, navigate, nextPath]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Direct Supabase OAuth — uses the project's own Google provider
      // credentials (configured in backend Auth settings), so the Google
      // consent screen shows HELVETICA-MP branding instead of the managed
      // Lovable flow.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectOrigin,
          queryParams: {
            // Force account selection so returning users still pick an account.
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible de se connecter avec Google',
          variant: 'destructive',
        });
        setGoogleLoading(false);
        return;
      }

      // signInWithOAuth performs a full-page redirect to Google; if we reach
      // here the redirect is pending.
    } catch (e) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue avec Google',
        variant: 'destructive',
      });
    }
    setGoogleLoading(false);
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: redirectOrigin,
      });

      if (result.error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de se connecter avec Apple',
          variant: 'destructive',
        });
        setAppleLoading(false);
        return;
      }

      if (result.redirected) return;

      toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
      navigate(nextPath);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue avec Apple',
        variant: 'destructive',
      });
    }
    setAppleLoading(false);
  };

  const normalizePhone = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('0')) return '+33' + cleaned.slice(1);
    return '+' + cleaned;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizePhone(phone);
    if (target.length < 10) {
      toast({ title: 'Erreur', description: 'Numéro de mobile invalide', variant: 'destructive' });
      return;
    }
    setPhoneLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: target });
    setPhoneLoading(false);
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message.includes('not enabled')
          ? "La connexion par SMS n'est pas encore activée sur ce projet."
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    setOtpSent(true);
    toast({ title: 'Code envoyé', description: `Un SMS a été envoyé au ${target}` });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otpCode.trim(),
      type: 'sms',
    });
    setPhoneLoading(false);
    if (error) {
      toast({ title: 'Erreur', description: 'Code invalide ou expiré', variant: 'destructive' });
      return;
    }
    toast({ title: 'Connexion réussie', description: 'Bienvenue sur HELVETICA-MP' });
    navigate(nextPath);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: err.issues[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      let message = 'Erreur lors de la connexion';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou mot de passe incorrect';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Veuillez confirmer votre email avant de vous connecter';
      }
      
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur HELVETICA-MP',
      });
      navigate(nextPath);
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: err.issues[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, firstName, lastName);
    
    if (error) {
      let message = 'Erreur lors de l\'inscription';
      if (error.message.includes('User already registered')) {
        message = 'Un compte existe déjà avec cet email';
      }
      
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Inscription réussie',
        description: 'Vérifiez votre email pour confirmer votre compte',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="sr-only">Connexion à votre compte HELVETICA-MP</h1>
          <div className="inline-flex items-center gap-3 mb-4" aria-hidden="true">
            <Shield className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold tracking-wider hud-text">HELVETICA-MP</span>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide">
            CONNEXION À VOTRE ESPACE
          </p>
        </div>

        {/* Auth Card */}
        <div className="chamfer-hud bg-card/80 backdrop-blur-md border border-border/50 p-5 sm:p-8">
          {/* Google OAuth Button */}
          <Button
            variant="outline"
            className="w-full mb-4 gap-2"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
          </Button>

          <Button
            variant="outline"
            className="w-full mb-4 gap-2"
            onClick={handleAppleLogin}
            disabled={appleLoading}
          >
            <Apple className="h-4 w-4" />
            {appleLoading ? 'Connexion...' : 'Continuer avec Apple'}
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground hud-text">OU</span>
            <Separator className="flex-1" />
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login" className="hud-text text-[10px] sm:text-xs">
                CONNEXION
              </TabsTrigger>
              <TabsTrigger value="phone" className="hud-text text-[10px] sm:text-xs">
                MOBILE
              </TabsTrigger>
              <TabsTrigger value="signup" className="hud-text text-[10px] sm:text-xs">
                INSCRIPTION
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Saisissez l'adresse e-mail de votre compte : vous recevrez un lien pour
                    choisir un nouveau mot de passe.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-xs hud-text flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      EMAIL
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="bg-background/50"
                      required
                    />
                  </div>
                  {/* Champ piège anti-robot : invisible pour les humains. */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={forgotHoneypot}
                    onChange={(e) => setForgotHoneypot(e.target.value)}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <Button type="submit" className="w-full chamfer-hud-sm gap-2" disabled={forgotLoading}>
                    <KeyRound className="h-4 w-4" />
                    {forgotLoading ? 'ENVOI...' : 'RECEVOIR LE LIEN'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Retour à la connexion
                  </button>
                </form>
              ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-xs hud-text flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    EMAIL
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="operateur@helvetica-mp.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs hud-text flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    MOT DE PASSE
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-background/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(loginEmail); setForgotMode(true); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full chamfer-hud-sm group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'AUTHENTIFICATION...'
                  ) : (
                    <>
                      ACCÉDER AU SYSTÈME
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
              )}
            </TabsContent>


            <TabsContent value="phone">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone" className="text-xs hud-text flex items-center gap-2">
                      <Smartphone className="h-3 w-3" />
                      NUMÉRO DE MOBILE
                    </Label>
                    <Input
                      id="login-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="06 12 34 56 78"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background/50"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Format international accepté (ex. +33 6 12 34 56 78).
                    </p>
                  </div>

                  <Button type="submit" className="w-full chamfer-hud-sm group" disabled={phoneLoading}>
                    {phoneLoading ? 'ENVOI DU CODE...' : (
                      <>
                        RECEVOIR LE CODE SMS
                        <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-otp" className="text-xs hud-text flex items-center gap-2">
                      <KeyRound className="h-3 w-3" />
                      CODE REÇU PAR SMS
                    </Label>
                    <Input
                      id="login-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="bg-background/50 tracking-[0.3em] text-center"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full chamfer-hud-sm" disabled={phoneLoading}>
                    {phoneLoading ? 'VÉRIFICATION...' : 'VALIDER LE CODE'}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    >
                      ← Changer de numéro
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleSendOtp(e as unknown as React.FormEvent)}
                      disabled={phoneLoading}
                    >
                      Renvoyer le code
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="text-xs hud-text flex items-center gap-2">
                      <User className="h-3 w-3" />
                      PRÉNOM
                    </Label>
                    <Input
                      id="first-name"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name" className="text-xs hud-text">
                      NOM
                    </Label>
                    <Input
                      id="last-name"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs hud-text flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    EMAIL
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="operateur@helvetica-mp.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs hud-text flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    MOT DE PASSE
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="bg-background/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs hud-text flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    CONFIRMER MOT DE PASSE
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="bg-background/50"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full chamfer-hud-sm group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'CRÉATION DU PROFIL...'
                  ) : (
                    <>
                      CRÉER UN COMPTE
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← RETOUR À L'ACCUEIL
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 HELVETICA-MP. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
