import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useGetUserProfile, useUpdateUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Bot, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AI_MODELS = [
  { value: "auto", label: "Auto (recommended)", desc: "System picks the best model" },
  { value: "gemini", label: "Gemini 2.5 Flash", desc: "Google's fastest reasoning model" },
  { value: "openrouter", label: "Llama 3.3 70B (Free)", desc: "Meta's open model via OpenRouter" },
  { value: "custom", label: "Custom OpenRouter model", desc: "Use any model on OpenRouter" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function Section({ title, children, delay }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay ?? 0}
      initial="hidden"
      animate="visible"
      className="rounded-2xl bg-card/40 border border-white/5 p-6 space-y-5"
    >
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </motion.div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { data: profile, isLoading, refetch } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const updateProfile = useUpdateUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [aiModel, setAiModel] = useState("auto");
  const [customModel, setCustomModel] = useState("");
  const [savingAi, setSavingAi] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setAiModel(profile.aiModel ?? "auto");
      setCustomModel(profile.customAiModel ?? "");
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: { displayName } }, {
      onSuccess: () => { toast({ title: "Profile updated" }); refetch(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  const handleSaveAi = async () => {
    setSavingAi(true);
    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel, customAiModel: aiModel === "custom" ? customModel : undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "AI settings saved" });
    } catch {
      toast({ title: "Failed to save AI settings", variant: "destructive" });
    } finally {
      setSavingAi(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and AI preferences.</p>
        </div>

        <Section title="Credits" delay={0}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold" data-testid="credits-balance">{profile?.credits ?? 0} credits remaining</p>
                <p className="text-xs text-muted-foreground">9 credits per pack (summary 1 + flashcards 5 + quiz 3)</p>
              </div>
            </div>
            <a href="/upgrade">
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                Buy more
              </Button>
            </a>
          </div>
        </Section>

        <Section title="Profile" delay={1}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{profile?.displayName || "No display name set"}</p>
              <p className="text-xs text-muted-foreground">Level {profile?.level ?? 1} &bull; {profile?.xp ?? 0} XP</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-card/40 border-white/8"
              data-testid="input-display-name"
            />
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full" data-testid="button-save-profile">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
            </Button>
          </div>
        </Section>

        <Section title="AI model" delay={2}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-accent" />
            <p className="text-sm text-muted-foreground">Controls which AI model generates your study packs.</p>
          </div>
          <div className="space-y-3">
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger className="bg-card/40 border-white/8 h-11" data-testid="select-ai-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {aiModel === "custom" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 overflow-hidden">
                <label className="text-sm text-muted-foreground">OpenRouter model slug</label>
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g. anthropic/claude-3.5-sonnet"
                  className="bg-card/40 border-white/8"
                  data-testid="input-custom-model"
                />
                <p className="text-xs text-muted-foreground">
                  Browse models at{" "}
                  <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                    openrouter.ai/models
                  </a>
                </p>
              </motion.div>
            )}

            <Button onClick={handleSaveAi} disabled={savingAi} className="w-full" data-testid="button-save-ai">
              {savingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save AI settings"}
            </Button>
          </div>
        </Section>
      </div>
    </AppLayout>
  );
}
