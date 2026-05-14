import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/react";
import {
  Users,
  Crown,
  BookOpen,
  Brain,
  TrendingUp,
  Activity,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Shield,
  Zap,
  BarChart3,
} from "lucide-react";

interface AdminStats {
  overview: {
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    conversionRate: string;
    totalPacks: number;
    totalQuizzes: number;
    totalFlashcards: number;
  };
  recentUsers: {
    id: number;
    clerkId: string;
    displayName: string | null;
    isPro: boolean;
    xp: number;
    streak: number;
    createdAt: string;
  }[];
  signupsByDay: { date: string; signups: string; pro_signups: string }[];
  topUsers: { id: number; display_name: string | null; clerk_id: string; is_pro: boolean; xp: number; streak: number; pack_count: string }[];
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
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
  const last7 = data.slice(-14);

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex h-20 items-end gap-1">
        {last7.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-primary/60 transition-all"
              style={{ height: `${Math.round((d.value / max) * 100)}%`, minHeight: d.value > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{last7[0]?.date?.slice(5) ?? ""}</span>
        <span>{last7[last7.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  async function fetchStats() {
    setRefreshing(true);
    try {
      const res = await fetch(`${BASE}/api/admin/stats`);
      if (res.status === 403) {
        setError("Access denied. Your Clerk ID must be added to the ADMIN_CLERK_IDS environment variable.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json() as AdminStats;
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function togglePro(clerkId: string, currentPro: boolean) {
    setTogglingUser(clerkId);
    try {
      const res = await fetch(`${BASE}/api/admin/users/${clerkId}/pro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPro: !currentPro }),
      });
      if (res.ok) await fetchStats();
    } finally {
      setTogglingUser(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Admin Access Required</h2>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-left text-xs font-mono text-muted-foreground">
          <p className="mb-1 font-bold text-foreground">Your Clerk ID:</p>
          <p className="select-all">{user?.id ?? "Not signed in"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Set <code className="rounded bg-white/10 px-1">ADMIN_CLERK_IDS</code> to your Clerk ID in environment variables.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, recentUsers, signupsByDay, topUsers } = stats;

  const signupsChartData = signupsByDay.map((d) => ({
    date: d.date,
    value: Number(d.signups),
  }));

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Cluvi platform analytics & user management</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard label="Total Users" value={overview.totalUsers} icon={Users} color="bg-blue-500" delay={0} />
          <StatCard
            label="Pro Subscribers"
            value={overview.proUsers}
            sub={`${overview.conversionRate}% conversion`}
            icon={Crown}
            color="bg-amber-500"
            delay={0.05}
          />
          <StatCard label="Free Users" value={overview.freeUsers} icon={Zap} color="bg-emerald-500" delay={0.1} />
          <StatCard label="Study Packs" value={overview.totalPacks} icon={BookOpen} color="bg-purple-500" delay={0.15} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <StatCard label="Quizzes Taken" value={overview.totalQuizzes} icon={Brain} color="bg-pink-500" delay={0.2} />
          <StatCard label="Flashcards Created" value={overview.totalFlashcards} icon={Activity} color="bg-cyan-500" delay={0.25} />
          <StatCard
            label="Conversion Rate"
            value={`${overview.conversionRate}%`}
            sub="Free → Pro"
            icon={TrendingUp}
            color="bg-violet-500"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">Signups — Last 14 Days</h2>
            {signupsChartData.length > 0 ? (
              <MiniBarChart data={signupsChartData} label="Daily signups" />
            ) : (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">Top Users by XP</h2>
            <div className="space-y-2">
              {topUsers.slice(0, 5).map((u, i) => (
                <div key={u.clerk_id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm text-foreground">{u.display_name ?? u.clerk_id.slice(0, 12) + "…"}</span>
                    {u.is_pro && <Crown className="h-3 w-3 text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{u.xp} XP</span>
                    <span>{u.pack_count} packs</span>
                  </div>
                </div>
              ))}
              {topUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users yet</p>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
        >
          <h2 className="mb-4 text-base font-semibold text-foreground">Recent Signups</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-white/10">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Tier</th>
                  <th className="pb-2 pr-4 font-medium">XP</th>
                  <th className="pb-2 pr-4 font-medium">Streak</th>
                  <th className="pb-2 pr-4 font-medium">Joined</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentUsers.map((u) => (
                  <tr key={u.clerkId} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-foreground">{u.displayName ?? "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{u.clerkId.slice(0, 16)}…</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.isPro
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-white/10 text-muted-foreground"
                        }`}
                      >
                        {u.isPro && <Crown className="h-3 w-3" />}
                        {u.isPro ? "Pro" : "Free"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-foreground">{u.xp}</td>
                    <td className="py-3 pr-4 text-foreground">{u.streak}🔥</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => togglePro(u.clerkId, u.isPro)}
                        disabled={togglingUser === u.clerkId}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                          u.isPro
                            ? "bg-white/10 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                            : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                        }`}
                      >
                        {togglingUser === u.clerkId ? "…" : u.isPro ? "Revoke Pro" : "Grant Pro"}
                      </button>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
