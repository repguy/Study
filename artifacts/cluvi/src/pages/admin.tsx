import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/react";
import {
  Users, Crown, BookOpen, Brain, TrendingUp, Activity,
  RefreshCw, Shield, Zap, BarChart3, Search, Plus, Minus,
  Ban, CheckCircle, Trash2, Package, Edit3, X, Check,
  ChevronLeft, ChevronRight, Bot, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type TabId = "overview" | "users" | "credits" | "ai";

interface AdminUser {
  id: number;
  clerkId: string;
  displayName: string | null;
  isPro: boolean;
  isBanned: boolean;
  credits: number;
  xp: number;
  level: number;
  streak: number;
  referralCode: string | null;
  referralCount: number;
  createdAt: string;
}

interface CreditPack {
  id: number;
  name: string;
  credits: number;
  priceUsd: number;
  discountPercent: number;
  badge: string | null;
  isActive: boolean;
}

interface AdminStats {
  overview: {
    totalUsers: number; proUsers: number; freeUsers: number; bannedUsers: number;
    conversionRate: string; totalPacks: number; totalQuizzes: number; totalFlashcards: number;
  };
  recentUsers: AdminUser[];
  signupsByDay: { date: string; signups: string; pro_signups: string }[];
  topUsers: { id: number; display_name: string | null; clerk_id: string; is_pro: boolean; xp: number; streak: number; pack_count: string }[];
}

function StatCard({ label, value, sub, icon: Icon, color, delay }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
    >
      <div className={`absolute inset-0 opacity-5 ${color}`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color} bg-opacity-20`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function MiniBarChart({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const last14 = data.slice(-14);
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex h-20 items-end gap-1">
        {last14.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-sm bg-primary/60 transition-all" style={{ height: `${Math.round((d.value / max) * 100)}%`, minHeight: d.value > 0 ? 4 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{last14[0]?.date?.slice(5) ?? ""}</span>
        <span>{last14[last14.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

function CreditsModal({ user, onClose, onSave }: {
  user: AdminUser;
  onClose: () => void;
  onSave: (clerkId: string, newCredits: number) => void;
}) {
  const [delta, setDelta] = useState("");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [loading, setLoading] = useState(false);

  async function apply() {
    const n = Number(delta);
    if (isNaN(n) || n < 0) return;
    setLoading(true);
    try {
      const body = mode === "set" ? { set: n } : { delta: mode === "add" ? n : -n };
      const res = await fetch(`${BASE()}/api/admin/users/${user.clerkId}/credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json() as AdminUser;
        onSave(user.clerkId, updated.credits);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/95 backdrop-blur p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Manage Credits</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground">{user.displayName ?? user.clerkId.slice(0, 16) + "…"} · Current: <strong>{user.credits}</strong> credits</p>
        <div className="flex gap-1.5">
          {(["add", "remove", "set"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${mode === m ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder={mode === "set" ? "Set to amount" : "Amount"}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white border-0" onClick={apply} disabled={!delta || loading}>
            {loading ? "Saving…" : "Apply"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function PackEditModal({ pack, onClose, onSave }: {
  pack: CreditPack | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(pack?.name ?? "");
  const [credits, setCredits] = useState(String(pack?.credits ?? ""));
  const [priceUsd, setPriceUsd] = useState(String(pack?.priceUsd ?? ""));
  const [discount, setDiscount] = useState(String(pack?.discountPercent ?? "0"));
  const [badge, setBadge] = useState(pack?.badge ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const body = {
        name, credits: Number(credits), priceUsd: Number(priceUsd),
        discountPercent: Number(discount), badge: badge || null,
      };
      const url = pack ? `${BASE()}/api/admin/credit-packs/${pack.id}` : `${BASE()}/api/admin/credit-packs`;
      const method = pack ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { onSave(); onClose(); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/95 backdrop-blur p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{pack ? "Edit" : "Create"} Credit Pack</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Pack name", value: name, set: setName, placeholder: "e.g. Starter" },
            { label: "Credits", value: credits, set: setCredits, placeholder: "e.g. 50", type: "number" },
            { label: "Price (USD cents)", value: priceUsd, set: setPriceUsd, placeholder: "e.g. 499 = $4.99", type: "number" },
            { label: "Discount %", value: discount, set: setDiscount, placeholder: "0", type: "number" },
            { label: "Badge label (optional)", value: badge, set: setBadge, placeholder: "e.g. Best value" },
          ].map(({ label, value, set, placeholder, type = "text" }) => (
            <div key={label}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white border-0" onClick={save} disabled={!name || !credits || !priceUsd || loading}>
            {loading ? "Saving…" : pack ? "Save Changes" : "Create Pack"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

const PROVIDERS = [
  { id: "gemini",     label: "Google Gemini",  hint: "e.g. gemini-2.5-flash",      models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "openai",     label: "OpenAI",         hint: "e.g. gpt-4o",                models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { id: "openrouter", label: "OpenRouter",     hint: "e.g. openai/gpt-4o-mini",    models: ["openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3-5-sonnet", "google/gemini-2.5-flash"] },
  { id: "anthropic",  label: "Anthropic",      hint: "e.g. claude-3-5-sonnet-20241022", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"] },
] as const;

function AiConfigTab() {
  const [provider, setProvider] = useState<"gemini" | "openai" | "openrouter" | "anthropic">("gemini");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{ provider: string | null; model: string | null; hasKey: boolean } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saved, setSaved] = useState(false);

  async function fetchConfig() {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${BASE()}/api/admin/ai-config`);
      if (res.ok) setCurrentConfig(await res.json());
    } finally { setLoadingConfig(false); }
  }

  useEffect(() => { void fetchConfig(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE()}/api/admin/ai-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: model.trim(), key: key.trim() || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        setKey("");
        setTimeout(() => setSaved(false), 3000);
        fetchConfig();
      }
    } finally { setSaving(false); }
  }

  async function handleClear() {
    setClearing(true);
    try {
      const res = await fetch(`${BASE()}/api/admin/ai-config`, { method: "DELETE" });
      if (res.ok) { setCurrentConfig(null); fetchConfig(); }
    } finally { setClearing(false); }
  }

  const hintText = PROVIDERS.find((p) => p.id === provider)?.hint ?? "";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Default AI Configuration</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set the default AI provider, model, and API key for all users. Users with their own BYOK key bypass this.
        </p>
      </div>

      {/* Current config status */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">Current default</p>
        {loadingConfig ? (
          <div className="h-8 animate-pulse bg-white/5 rounded-lg" />
        ) : currentConfig?.provider ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium capitalize">{currentConfig.provider} — <span className="font-mono text-sm">{currentConfig.model}</span></p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {currentConfig.hasKey
                    ? <><CheckCircle2 className="w-3 h-3 text-green-400" /> API key saved</>
                    : <><span className="text-yellow-400">⚠</span> No API key set</>}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-xs text-destructive hover:text-destructive/80 border border-destructive/20 hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear config"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No default set — platform Gemini key will be used.</p>
        )}
      </div>

      {/* Config form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <p className="text-sm font-medium">Set new default</p>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Provider</label>
          <div className="flex gap-2 flex-wrap">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  provider === p.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Model slug</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={hintText}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PROVIDERS.find((p) => p.id === provider)?.models.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                  model === m
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-white/5 text-muted-foreground border-white/8 hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">
            API Key <span className="text-muted-foreground">(leave blank to keep existing key)</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste API key…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Key is AES-256-GCM encrypted before storage and never returned to the browser.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={!model.trim() || saving}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            saved
              ? "bg-green-500/20 text-green-400 border border-green-500/20"
              : "bg-gradient-to-r from-primary to-accent text-white disabled:opacity-50"
          }`}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save AI Configuration"}
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useUser();
  const [tab, setTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creditsModal, setCreditsModal] = useState<AdminUser | null>(null);
  const [editPack, setEditPack] = useState<CreditPack | "new" | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  async function fetchStats() {
    setRefreshing(true);
    try {
      const res = await fetch(`${BASE()}/api/admin/stats`);
      if (res.status === 403) {
        setError("Access denied. Your Clerk ID must be in ADMIN_CLERK_IDS environment variable.");
        setLoading(false); setRefreshing(false); return;
      }
      if (!res.ok) throw new Error("Failed");
      setStats(await res.json() as AdminStats);
      setError(null);
    } catch { setError("Failed to load stats"); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function fetchUsers() {
    const url = debouncedSearch
      ? `${BASE()}/api/admin/users?search=${encodeURIComponent(debouncedSearch)}&limit=50`
      : `${BASE()}/api/admin/users?limit=50`;
    const res = await fetch(url);
    if (res.ok) setAllUsers(await res.json() as AdminUser[]);
  }

  async function fetchCreditPacks() {
    const res = await fetch(`${BASE()}/api/admin/credit-packs`);
    if (res.ok) setCreditPacks(await res.json() as CreditPack[]);
  }

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (tab === "users") fetchUsers(); }, [tab, debouncedSearch]);
  useEffect(() => { if (tab === "credits") fetchCreditPacks(); }, [tab]);

  async function togglePro(clerkId: string, current: boolean) {
    setTogglingUser(clerkId);
    try {
      const res = await fetch(`${BASE()}/api/admin/users/${clerkId}/pro`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPro: !current }),
      });
      if (res.ok) {
        setAllUsers((prev) => prev.map((u) => u.clerkId === clerkId ? { ...u, isPro: !current } : u));
        if (stats) fetchStats();
      }
    } finally { setTogglingUser(null); }
  }

  async function toggleBan(clerkId: string, current: boolean) {
    setTogglingUser(clerkId + "ban");
    try {
      const res = await fetch(`${BASE()}/api/admin/users/${clerkId}/ban`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !current }),
      });
      if (res.ok) setAllUsers((prev) => prev.map((u) => u.clerkId === clerkId ? { ...u, isBanned: !current } : u));
    } finally { setTogglingUser(null); }
  }

  async function togglePackActive(pack: CreditPack) {
    const res = await fetch(`${BASE()}/api/admin/credit-packs/${pack.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pack.isActive }),
    });
    if (res.ok) setCreditPacks((prev) => prev.map((p) => p.id === pack.id ? { ...p, isActive: !pack.isActive } : p));
  }

  async function deletePack(id: number) {
    const res = await fetch(`${BASE()}/api/admin/credit-packs/${id}`, { method: "DELETE" });
    if (res.ok) setCreditPacks((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <RefreshCw className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Admin Access Required</h2>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-left text-xs font-mono text-muted-foreground">
          <p className="mb-1 font-bold text-foreground">Your Clerk ID:</p>
          <p className="select-all">{user?.id ?? "Not signed in"}</p>
        </div>
        <p className="text-xs text-muted-foreground">Set <code className="rounded bg-white/10 px-1">ADMIN_CLERK_IDS</code> to your Clerk ID in environment variables.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "credits", label: "Credit Packs", icon: Package },
    { id: "ai", label: "AI Config", icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/5 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
            <button onClick={fetchStats} disabled={refreshing} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6 lg:p-10">
        {/* OVERVIEW TAB */}
        {tab === "overview" && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Users" value={stats.overview.totalUsers} icon={Users} color="bg-blue-500" delay={0} />
              <StatCard label="Pro Subscribers" value={stats.overview.proUsers} sub={`${stats.overview.conversionRate}% conversion`} icon={Crown} color="bg-amber-500" delay={0.05} />
              <StatCard label="Free Users" value={stats.overview.freeUsers} icon={Zap} color="bg-emerald-500" delay={0.1} />
              <StatCard label="Banned Users" value={stats.overview.bannedUsers} icon={Ban} color="bg-red-500" delay={0.15} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Study Packs" value={stats.overview.totalPacks} icon={BookOpen} color="bg-purple-500" delay={0.2} />
              <StatCard label="Quizzes Taken" value={stats.overview.totalQuizzes} icon={Brain} color="bg-pink-500" delay={0.25} />
              <StatCard label="Flashcards Created" value={stats.overview.totalFlashcards} icon={Activity} color="bg-cyan-500" delay={0.3} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <h2 className="mb-4 text-base font-semibold">Signups — Last 14 Days</h2>
                {stats.signupsByDay.length > 0 ? (
                  <MiniBarChart data={stats.signupsByDay.map((d) => ({ date: d.date, value: Number(d.signups) }))} label="Daily signups" />
                ) : (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">No data yet</div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <h2 className="mb-4 text-base font-semibold">Top Users by XP</h2>
                <div className="space-y-2">
                  {stats.topUsers.slice(0, 5).map((u, i) => (
                    <div key={u.clerk_id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm">{u.display_name ?? u.clerk_id.slice(0, 12) + "…"}</span>
                        {u.is_pro && <Crown className="h-3 w-3 text-amber-400" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{u.xp} XP</span>
                        <span>{u.pack_count} packs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, Clerk ID, or referral code…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
                />
              </div>
              <span className="text-sm text-muted-foreground">{allUsers.length} users</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-white/10 bg-white/[0.03]">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Credits</th>
                      <th className="px-4 py-3 font-medium">XP / Lvl</th>
                      <th className="px-4 py-3 font-medium">Referrals</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allUsers.map((u) => (
                      <tr key={u.clerkId} className={`hover:bg-white/[0.03] transition-colors ${u.isBanned ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{u.displayName ?? "Anonymous"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.clerkId.slice(0, 16)}…</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.isBanned ? "bg-red-500/20 text-red-400" :
                            u.isPro ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-muted-foreground"
                          }`}>
                            {u.isBanned ? "Banned" : u.isPro ? <><Crown className="h-3 w-3" />Pro</> : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{u.credits}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.xp} XP · Lvl {u.level}</td>
                        <td className="px-4 py-3 text-xs">{u.referralCount ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCreditsModal(u)}
                              title="Manage credits"
                              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => togglePro(u.clerkId, u.isPro)}
                              disabled={togglingUser === u.clerkId}
                              title={u.isPro ? "Revoke Pro" : "Grant Pro"}
                              className={`rounded-lg p-1.5 transition-all disabled:opacity-50 ${u.isPro ? "text-amber-400 hover:bg-amber-500/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"}`}
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleBan(u.clerkId, u.isBanned)}
                              disabled={togglingUser === u.clerkId + "ban"}
                              title={u.isBanned ? "Unban" : "Ban"}
                              className={`rounded-lg p-1.5 transition-all disabled:opacity-50 ${u.isBanned ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"}`}
                            >
                              {u.isBanned ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allUsers.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AI CONFIG TAB */}
        {tab === "ai" && <AiConfigTab />}

        {/* CREDIT PACKS TAB */}
        {tab === "credits" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Credit Packs</h2>
                <p className="text-sm text-muted-foreground">Configure pricing shown on the upgrade page</p>
              </div>
              <Button
                className="bg-gradient-to-r from-primary to-accent text-white border-0"
                onClick={() => setEditPack("new")}
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Pack
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative rounded-2xl border p-5 space-y-3 ${pack.isActive ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}
                >
                  {pack.badge && (
                    <span className="absolute -top-2 left-4 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white">{pack.badge}</span>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{pack.name}</p>
                      <p className="text-3xl font-bold text-primary mt-1">{pack.credits} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${(pack.priceUsd / 100).toFixed(2)}</p>
                      {pack.discountPercent > 0 && (
                        <span className="text-xs text-green-400">{pack.discountPercent}% off</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setEditPack(pack)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => togglePackActive(pack)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${pack.isActive ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                    >
                      {pack.isActive ? <><Check className="h-3.5 w-3.5" /> Active</> : <><X className="h-3.5 w-3.5" /> Inactive</>}
                    </button>
                    <button
                      onClick={() => deletePack(pack.id)}
                      className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {creditPacks.length === 0 && (
                <div className="col-span-3 py-16 text-center rounded-2xl border border-dashed border-white/8">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground mb-3">No credit packs yet</p>
                  <Button size="sm" onClick={() => setEditPack("new")}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create First Pack
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {creditsModal && (
        <CreditsModal
          user={creditsModal}
          onClose={() => setCreditsModal(null)}
          onSave={(clerkId, newCredits) => setAllUsers((prev) => prev.map((u) => u.clerkId === clerkId ? { ...u, credits: newCredits } : u))}
        />
      )}

      {editPack !== null && (
        <PackEditModal
          pack={editPack === "new" ? null : editPack}
          onClose={() => setEditPack(null)}
          onSave={fetchCreditPacks}
        />
      )}
    </div>
  );
}
