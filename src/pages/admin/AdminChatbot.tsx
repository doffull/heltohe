import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, MessageSquare, Save, Plus, Trash2, BarChart2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  useEffect(() => {
    if (config) {
      setSystemPrompt(config.system_prompt || '');
      setBotName(config.bot_name || 'Helvetica');
      setWelcomeMessage(config.welcome_message || '');
      setIsActive(config.is_active ?? true);
      const sug = config.suggestions;
      setSuggestions(Array.isArray(sug) ? sug as string[] : []);
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
        })
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
        <TabsList className="bg-muted/50 w-full overflow-x-auto justify-start">
          <TabsTrigger value="personality" className="gap-2 text-xs sm:text-sm"><Bot className="h-4 w-4" />Personnalité</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2 text-xs sm:text-sm"><MessageSquare className="h-4 w-4" />Suggestions</TabsTrigger>
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
