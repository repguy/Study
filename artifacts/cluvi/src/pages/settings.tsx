import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useGetUserProfile, useUpdateUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Zap, Key, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function Section({ title, subtitle, children, delay }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay ?? 0}
      initial="hidden"
      animate="visible"
      className="rounded-2xl bg-card/40 border border-white/5 p-6 space-y-5"
    >
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

type ByokProvider = "gemini" | "openai" | "openrouter";

const BYOK_PROVIDERS: { id: ByokProvider; label: string; placeholder: string; hint: string }[] = [
  { id: "gemini",     label: "Google Gemini",  placeholder: "AIza...",  hint: "aistudio.google.com" },
  { id: "openai",     label: "OpenAI",         placeholder: "sk-...",   hint: "platform.openai.com" },
  { id: "openrouter", label: "OpenRouter",     placeholder: "sk-or-...", hint: "openrouter.ai/keys" },
];

interface ByokStatus {
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  hasOpenrouterKey: boolean;
}

interface ByokKeyRowProps {
  provider: ByokProvider;
  label: string;
  placeholder: string;
  hint: string;
  hasKey: boolean;
  onSaved: () => void;
}

function ByokKeyRow({ provider, label, placeholder, hint, hasKey, onSaved }: ByokKeyRowProps) {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/user/byok`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to save key");
      }
      toast({ title: "API key saved", description: "Encrypted and stored securely." });
      setKey("");
      setEditing(false);
      onSaved();
    } catch (e) {
      toast({ title: "Failed to save key", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE}/api/user/byok/${provider}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "API key removed" });
      onSaved();
    } catch {
      toast({ title: "Failed to remove key", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {hasKey ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" /> Not set
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasKey && !editing && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 hover:bg-white/5" onClick={() => setEditing(true)}>
              Replace
            </Button>
          )}
          {hasKey && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleClear} disabled={clearing}>
              {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
            </Button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {(!hasKey || editing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Input
                  type={show ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={placeholder}
                  className="bg-card/40 border-white/8 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={handleSave} disabled={!key.trim() || saving} className="shrink-0">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
              {editing && (
                <Button variant="outline" className="shrink-0 border-white/10" onClick={() => { setEditing(false); setKey(""); }}>
                  Cancel
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Get your key at <span className="text-primary">{hint}</span></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { data: profile, isLoading, refetch } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const updateProfile = useUpdateUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [byokStatus, setByokStatus] = useState<ByokStatus | null>(null);
  const [byokLoading, setByokLoading] = useState(true);

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName ?? "");
  }, [profile]);

  const fetchByokStatus = async () => {
    try {
      const res = await fetch(`${BASE}/api/user/byok`);
      if (res.ok) setByokStatus(await res.json() as ByokStatus);
    } catch {
      // silently fail
    } finally {
      setByokLoading(false);
    }
  };

  useEffect(() => { void fetchByokStatus(); }, []);

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: { displayName } }, {
      onSuccess: () => { toast({ title: "Profile updated" }); refetch(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-muted-foreground">Profile and API keys.</p>
        </div>

        <Section title="Credits" delay={0}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold" data-testid="credits-balance">{profile?.credits ?? 0} credits remaining</p>
                <p className="text-xs text-muted-foreground">Used per study pack — add your API key below to skip credits</p>
              </div>
            </div>
            <a href="/upgrade">
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0">
                Buy more
              </Button>
            </a>
          </div>
        </Section>

        <Section title="Profile" delay={1}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{profile?.displayName || "No display name set"}</p>
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

        <Section
          title="API Keys (BYOK)"
          subtitle="Use your own API key to generate study packs for free — no credits consumed."
          delay={2}
        >
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-500/5 border border-green-500/15 text-sm mb-1">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-green-400">Encrypted at rest</p>
              <p className="text-muted-foreground text-xs">Keys are AES-256-GCM encrypted before storage and never sent back to your browser.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 mt-1">
            <Key className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm text-muted-foreground">Set a key for any provider — it is masked and never displayed again.</p>
          </div>

          {byokLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-6 divide-y divide-white/5">
              {BYOK_PROVIDERS.map((p, i) => (
                <div key={p.id} className={i > 0 ? "pt-4" : ""}>
                  <ByokKeyRow
                    provider={p.id}
                    label={p.label}
                    placeholder={p.placeholder}
                    hint={p.hint}
                    hasKey={
                      p.id === "gemini" ? (byokStatus?.hasGeminiKey ?? false) :
                      p.id === "openai" ? (byokStatus?.hasOpenaiKey ?? false) :
                      (byokStatus?.hasOpenrouterKey ?? false)
                    }
                    onSaved={fetchByokStatus}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}
