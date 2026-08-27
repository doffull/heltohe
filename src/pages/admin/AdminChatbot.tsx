import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, MessageSquare, Save, Plus, Trash2, BarChart2, ToggleLeft, ToggleRight, Sparkles, KeyRound, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGeminiKeyStatus, useSaveGeminiKey, useDeleteGeminiKey, useTestAiModel } from '@/hooks/useAiKeys';
import { AI_TEST_SCOPE_LABELS, formatAiTestDate, readAiTests, saveAiTest, type AiTestRecord } from '@/lib/aiTestHistory';


const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_VISION_MODEL = 'google/gemini-2.5-pro';

/** Modèles Gemini disponibles via la passerelle IA intégrée (aucune clé à saisir). */
const GEMINI_MODELS: { id: string; label: string; hint: string }[] = [
  { id: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash', hint: 'Dernière génération, rapide et très bon en raisonnement' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', hint: 'Qualité maximale, plus lent et plus coûteux' },
  { id: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', hint: 'Le plus économique, pour les tâches simples' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Équilibré (valeur par défaut historique)' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'Multimodal robuste (images, PDF, catalogues)' },
];

function ModelSelect({
  label, description, value, onChange, onTest,
}: { label: string; description: string; value: string; onChange: (v: string) => void; onTest?: (model: string) => void }) {
  const known = GEMINI_MODELS.some(m => m.id === value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="hud-text text-xs">{label}</Label>
        {onTest && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => onTest(value)}>
            Tester
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <select
        value={known ? value : '__custom'}
        onChange={e => onChange(e.target.value === '__custom' ? value : e.target.value)}
        className="w-full h-10 px-3 bg-secondary/50 border border-border/30 rounded-md text-sm"
      >
        {GEMINI_MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.label} — {m.hint}</option>
        ))}
        <option value="__custom">Autre modèle (saisie manuelle)</option>
      </select>
      {!known && (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="google/gemini-2.5-flash"
          className="bg-secondary/50 border-border/30 font-mono text-xs"
        />
      )}
    </div>
  );
}

export default function AdminChatbot() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['bot-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bot_config').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['chat-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const [systemPrompt, setSystemPrompt] = useState('');
  const [botName, setBotName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [chatModel, setChatModel] = useState(DEFAULT_MODEL);
  const [voiceModel, setVoiceModel] = useState(DEFAULT_MODEL);
  const [aiDefaultModel, setAiDefaultModel] = useState(DEFAULT_MODEL);
  const [aiVisionModel, setAiVisionModel] = useState(DEFAULT_VISION_MODEL);

  // Clé Gemini + tests
  const keyStatus = useGeminiKeyStatus();
  const saveKey = useSaveGeminiKey();
  const deleteKey = useDeleteGeminiKey();
  const testModel = useTestAiModel();
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; scope: string } | null>(null);
  const [testingScope, setTestingScope] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<Record<string, AiTestRecord>>({});

  useEffect(() => {
    setTestHistory(readAiTests());
  }, []);

  const runTest = (scope: string, model: string) => {
    setTestingScope(scope);
    setTestResult(null);
    const record = (ok: boolean, message: string) => {
      setTestResult({ ok, message, scope });
      setTestHistory(saveAiTest({ scope, model, ok, message, at: new Date().toISOString() }));
    };
    testModel.mutate(
      { model, apiKey: geminiKey.trim() || undefined },
      {
        onSuccess: (res) => record(true, res.message),
        onError: (e: Error) => record(false, e.message),
        onSettled: () => setTestingScope(null),
      },
    );
  };


  const handleSaveKey = () => {
    saveKey.mutate(
      { apiKey: geminiKey.trim(), model: aiDefaultModel },
      {
        onSuccess: (res) => {
          setGeminiKey('');
          toast({ title: 'Clé Gemini enregistrée ✓', description: res.message });
        },
        onError: (e: Error) => toast({ title: 'Clé refusée', description: e.message, variant: 'destructive' }),
      },
    );
  };

  useEffect(() => {
    if (config) {
      setSystemPrompt(config.system_prompt || '');
      setBotName(config.bot_name || 'Helvetica');
      setWelcomeMessage(config.welcome_message || '');
      setIsActive(config.is_active ?? true);
      const sug = config.suggestions;
      setSuggestions(Array.isArray(sug) ? sug as string[] : []);
      setChatModel((config as any).chat_model || DEFAULT_MODEL);
      setVoiceModel((config as any).voice_model || DEFAULT_MODEL);
      setAiDefaultModel((config as any).ai_default_model || DEFAULT_MODEL);
      setAiVisionModel((config as any).ai_vision_model || DEFAULT_VISION_MODEL);
    }
  }, [config]);

  const updateConfig = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('bot_config')
        .update({
          system_prompt: systemPrompt,
          bot_name: botName,
          welcome_message: welcomeMessage,
          is_active: isActive,
          suggestions: suggestions,
          chat_model: chatModel,
          voice_model: voiceModel,
          ai_default_model: aiDefaultModel,
          ai_vision_model: aiVisionModel,
        } as any)
        .eq('id', config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-config'] });
      queryClient.invalidateQueries({ queryKey: ['bot-config-widget'] });
      toast({ title: 'Configuration sauvegardée ✓' });
    },
    onError: () => toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const addSuggestion = () => {
    if (!newSuggestion.trim()) return;
    setSuggestions(prev => [...prev, newSuggestion.trim()]);
    setNewSuggestion('');
  };

  const removeSuggestion = (i: number) => {
    setSuggestions(prev => prev.filter((_, idx) => idx !== i));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold hud-text flex items-center gap-2 sm:gap-3">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            CHATBOT
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Gérez votre assistant virtuel</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            {isActive ? (
              <><ToggleRight className="h-5 w-5 text-primary" /><span className="text-primary text-xs sm:text-sm">Actif</span></>
            ) : (
              <><ToggleLeft className="h-5 w-5 text-muted-foreground" /><span className="text-muted-foreground text-xs sm:text-sm">Inactif</span></>
            )}
          </button>
          <Button
            onClick={() => updateConfig.mutate()}
            disabled={updateConfig.isPending || !config}
            className="chamfer-hud-sm"
            size="sm"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {updateConfig.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="personality">
        <TabsList className="bg-muted/50 admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="personality" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" />Personnalité</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2 text-xs sm:text-sm"><MessageSquare className="h-4 w-4" />Suggestions</TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 text-xs sm:text-sm"><Sparkles className="h-4 w-4" />Modèles IA</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2 text-xs sm:text-sm"><BarChart2 className="h-4 w-4" />Statistiques</TabsTrigger>
        </TabsList>

        {/* PERSONALITY */}
        <TabsContent value="personality" className="space-y-4 mt-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">NOM DU BOT</Label>
                <Input
                  value={botName}
                  onChange={e => setBotName(e.target.value)}
                  placeholder="Helvetica"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">STATUT</Label>
                <div className={`h-10 flex items-center px-3 rounded-md border text-sm font-medium ${isActive ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-muted-foreground bg-secondary/50'}`}>
                  {isActive ? '● En ligne' : '○ Hors ligne'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="hud-text text-xs">MESSAGE D'ACCUEIL</Label>
              <Input
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                placeholder="Bonjour ! Je suis Helvetica..."
                className="bg-secondary/50 border-border/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="hud-text text-xs">PERSONNALITÉ & INSTRUCTIONS SYSTÈME</Label>
              <p className="text-xs text-muted-foreground">
                Définissez le comportement, le ton et les connaissances du bot. Plus les instructions sont précises, meilleure sera la qualité des réponses.
              </p>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={16}
                className="bg-secondary/50 border-border/30 font-mono text-xs"
                placeholder="Tu es Helvetica, expert mode de HELVETICA-MP..."
              />
              <p className="text-xs text-muted-foreground">
                {systemPrompt.length} caractères
              </p>
            </div>
          </div>
        </TabsContent>

        {/* SUGGESTIONS */}
        <TabsContent value="suggestions" className="space-y-4 mt-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold hud-text mb-1">SUGGESTIONS RAPIDES</h3>
              <p className="text-xs text-muted-foreground">Ces chips s'affichent au démarrage du chat pour guider les utilisateurs.</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={newSuggestion}
                onChange={e => setNewSuggestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSuggestion(); } }}
                placeholder="Nouvelle suggestion..."
                className="bg-secondary/50 border-border/30"
              />
              <Button variant="outline" onClick={addSuggestion}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune suggestion configurée</p>
              ) : (
                suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 px-3 py-2 chamfer-hud-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm">{s}</span>
                    <button
                      onClick={() => removeSuggestion(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* MODELES IA */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          {/* CLÉ GEMINI */}
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold hud-text mb-1">CLÉ API GEMINI</h3>
                <p className="text-xs text-muted-foreground">
                  Facultatif : saisissez votre propre clé Google AI Studio. Dès qu'elle est enregistrée, elle est
                  utilisée automatiquement pour <strong>toutes</strong> les fonctionnalités IA du site (chatbot,
                  commande vocale, textes produit, vision/PDF). Sans clé, la passerelle IA intégrée est utilisée.
                </p>
              </div>
            </div>

            <div className="text-xs">
              {keyStatus.isLoading ? (
                <span className="text-muted-foreground">Vérification…</span>
              ) : keyStatus.data?.configured ? (
                <span className="text-primary">
                  ● Clé active (••••{keyStatus.data.last4 || '????'})
                  {keyStatus.data.source === 'env' ? ' — variable serveur' : ''}
                  {keyStatus.data.updatedAt ? ` — maj ${new Date(keyStatus.data.updatedAt).toLocaleString('fr-FR')}` : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">○ Aucune clé enregistrée — passerelle IA intégrée utilisée</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  className="bg-secondary/50 border-border/30 font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveKey} disabled={geminiKey.trim().length < 20 || saveKey.isPending} size="sm">
                {saveKey.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Vérifier & enregistrer
              </Button>
              {keyStatus.data?.source === 'database' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteKey.mutate(undefined, {
                    onSuccess: () => toast({ title: 'Clé supprimée' }),
                    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
                  })}
                  disabled={deleteKey.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Supprimer
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              La clé est validée auprès de Google avant d'être stockée de façon chiffrée côté serveur ; elle n'est
              jamais renvoyée au navigateur. Les boutons « Tester » ci-dessous utilisent la clé saisie si le champ
              est rempli, sinon la clé enregistrée.
            </p>
          </div>

          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold hud-text mb-1">MODÈLES GEMINI DU SITE</h3>
              <p className="text-xs text-muted-foreground">
                Choisissez le modèle Gemini utilisé pour chaque usage, puis vérifiez-le avec « Tester » avant
                d'enregistrer. La modification est prise en compte en moins d'une minute.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ModelSelect
                label="CHATBOT (IGRA)"
                description="Assistant conversationnel du site (widget de chat)."
                value={chatModel}
                onChange={setChatModel}
                onTest={m => runTest('chat', m)}
              />
              <ModelSelect
                label="COMMANDE VOCALE"
                description="Recherche vocale, recommandations et actions panier."
                value={voiceModel}
                onChange={setVoiceModel}
                onTest={m => runTest('voice', m)}
              />
              <ModelSelect
                label="TEXTES & GÉNÉRATEURS IA"
                description="Descriptions produit, titres, CTA, conseils de taille, vérifications."
                value={aiDefaultModel}
                onChange={setAiDefaultModel}
                onTest={m => runTest('default', m)}
              />
              <ModelSelect
                label="VISION (IMAGES, PDF, MAQUETTES)"
                description="Import de catalogues PDF/Excel, analyse d'images et de maquettes."
                value={aiVisionModel}
                onChange={setAiVisionModel}
                onTest={m => runTest('vision', m)}
              />
            </div>

            {testingScope && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Test en cours…
              </div>
            )}
            {testResult && !testingScope && (
              <div className={`flex items-start gap-2 text-xs p-3 chamfer-hud-sm ${testResult.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="border-t border-border/40 pt-4 space-y-2">
              <h4 className="text-xs font-bold hud-text">DERNIERS TESTS</h4>
              {Object.keys(AI_TEST_SCOPE_LABELS).map((scope) => {
                const rec = testHistory[scope];
                return (
                  <div
                    key={scope}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs p-2 chamfer-hud-sm bg-muted/30"
                  >
                    <span className="font-bold w-40 flex-shrink-0">{AI_TEST_SCOPE_LABELS[scope]}</span>
                    {!rec ? (
                      <span className="text-muted-foreground">Jamais testé</span>
                    ) : (
                      <>
                        <span className={`flex items-center gap-1 flex-shrink-0 ${rec.ok ? 'text-primary' : 'text-destructive'}`}>
                          {rec.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {rec.ok ? 'OK' : 'Échec'}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">{formatAiTestDate(rec.at)}</span>
                        <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{rec.model}</span>
                        <span className={`sm:truncate ${rec.ok ? 'text-muted-foreground' : 'text-destructive'}`} title={rec.message}>
                          {rec.message}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>



            <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
              Astuce : Flash pour la rapidité et le coût, Pro pour les tâches complexes (extraction de catalogues,
              analyse d'images). Le bouton « Sauvegarder » en haut de page enregistre ces réglages.
            </p>
          </div>
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="chamfer-hud bg-card/50 p-6 text-center">
              <p className="text-3xl font-bold hud-text text-primary">{logs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">CONVERSATIONS</p>
            </div>
            <div className="chamfer-hud bg-card/50 p-6 text-center">
              <p className="text-3xl font-bold hud-text">{new Set(logs.map((l: any) => l.session_id)).size}</p>
              <p className="text-xs text-muted-foreground mt-1">SESSIONS UNIQUES</p>
            </div>
            <div className="chamfer-hud bg-card/50 p-6 text-center">
              <p className={`text-3xl font-bold hud-text ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {isActive ? 'ON' : 'OFF'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">STATUT</p>
            </div>
          </div>

          <div className="chamfer-hud bg-card/50 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold hud-text">DERNIERS ÉCHANGES</h3>
            </div>
            {logsLoading ? (
              <div className="p-8 text-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Aucun échange pour l'instant</div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {logs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{log.session_id?.slice(0, 8)}...</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm"><span className="text-primary font-medium">Q:</span> {log.user_message}</p>
                    {log.bot_response && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <span className="font-medium">R:</span> {log.bot_response}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
