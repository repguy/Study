import { useGetDashboardSummary, useGetUserProfile, getGetDashboardSummaryQueryKey, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Flame, Brain, BookOpen, PlusCircle, Zap, Loader2, Target, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function StatCard({ icon: Icon, label, value, sub, color, warning }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; warning?: boolean;
}) {
  return (
    <motion.div variants={item} className={`relative rounded-2xl border p-5 overflow-hidden transition-all ${warning ? "border-orange-500/20 bg-orange-500/5" : "border-white/5 bg-card/40"}`}>
      <div className={`absolute top-0 right-0 p-3 opacity-[0.06]`}>
        <Icon className={`w-20 h-20 ${color}`} />
      </div>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${warning ? "bg-orange-500/20" : "bg-white/5"}`}>
          {warning ? <AlertTriangle className="w-5 h-5 text-orange-400" /> : <Icon className={`w-5 h-5 ${color}`} />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-bold tracking-tight ${color}`} data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: profile } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() }
  });

  const isLoading = summaryLoading;
  const credits = profile?.credits ?? 0;
  const lowCredits = credits < 5;

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
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-0.5">
              {(summary?.streak ?? 0) > 0
                ? `${summary?.streak}-day streak. Keep it going.`
                : "Start a study session to build your streak."}
            </p>
          </div>
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-primary to-accent text-white border-0 rounded-xl font-semibold" data-testid="button-new-pack">
              <PlusCircle className="mr-2 w-4 h-4" />
              New pack
            </Button>
          </Link>
        </div>

        {/* Credits warning */}
        {lowCredits && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/8 border border-orange-500/15 text-sm"
            data-testid="credits-warning"
          >
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-muted-foreground">
              You have <span className="font-semibold text-foreground">{credits} credits</span> left.
              {credits === 0 ? " You can't create new packs until you buy more." : " Running low."}
            </span>
            <Link href="/upgrade" className="ml-auto shrink-0">
              <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8">
                Buy credits
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Stats grid */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Zap}
            label="Credits"
            value={credits}
            sub={`~${Math.floor(credits / 9)} packs left`}
            color="text-primary"
            warning={lowCredits}
          />
          <StatCard icon={Flame} label="Streak" value={`${summary?.streak ?? 0}d`} sub="days in a row" color="text-orange-400" />
          <StatCard icon={Zap} label="XP" value={summary?.xp ?? 0} sub={`Level ${summary?.level ?? 1}`} color="text-accent" />
          <StatCard icon={Brain} label="Study strength" value={`${summary?.studyStrength ?? 0}%`} color="text-violet-400" />
        </motion.div>

        {/* XP bar */}
        <motion.div variants={item} initial="hidden" animate="show" className="rounded-2xl bg-card/40 border border-white/5 p-5">
          <div className="flex justify-between text-sm mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="font-medium">Level {summary?.level ?? 1}</span>
              <span className="text-muted-foreground">&mdash; {summary?.xp ?? 0} XP</span>
            </div>
            <span className="text-muted-foreground text-xs">{summary?.level ? summary.level * 100 : 100} XP per level</span>
          </div>
          <Progress
            value={Math.min(100, ((summary?.xp ?? 0) % ((summary?.level ?? 1) * 100)) / (summary?.level ?? 1))}
            className="h-2"
          />
        </motion.div>

        {/* Packs + Weak topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent packs</h2>
            </div>
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary?.recentPacks?.map((pack) => (
                <motion.div key={pack.id} variants={item}>
                  <Link href={`/pack/${pack.id}`}>
                    <div className="group rounded-xl bg-card/40 border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all p-5 cursor-pointer" data-testid={`pack-card-${pack.id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          pack.status === "ready" ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : pack.status === "processing" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {pack.status}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-1 truncate text-sm" data-testid={`pack-title-${pack.id}`}>{pack.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {pack.flashcardCount} cards &bull; {pack.quizCount} questions
                      </p>
                      <Progress value={pack.studyStrength} className="h-1" />
                    </div>
                  </Link>
                </motion.div>
              ))}

              {(!summary?.recentPacks || summary.recentPacks.length === 0) && (
                <motion.div variants={item} className="col-span-2 p-10 text-center rounded-xl border border-dashed border-white/8">
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <h3 className="text-base font-medium mb-1">No packs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first study pack to get started.</p>
                  <Link href="/upload">
                    <Button size="sm" variant="secondary" data-testid="empty-create-pack">Create a pack</Button>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Study insights</h2>
            <div className="rounded-2xl bg-card/40 border border-white/5 p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exam readiness</span>
                  <span className="font-semibold text-accent">{summary?.examReadiness ?? 0}%</span>
                </div>
                <Progress value={summary?.examReadiness ?? 0} className="h-1.5" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg quiz score</span>
                  <span className="font-semibold">{Math.round(summary?.averageQuizScore ?? 0)}%</span>
                </div>
                <Progress value={summary?.averageQuizScore ?? 0} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-2xl font-bold text-primary" data-testid="total-flashcards">{summary?.totalFlashcardsStudied ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cards studied</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-2xl font-bold text-accent" data-testid="total-quizzes">{summary?.totalQuizzesTaken ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Quizzes taken</p>
                </div>
              </div>
            </div>

            {(!summary?.weakTopics || summary.weakTopics.length === 0) ? (
              <div className="rounded-2xl bg-card/40 border border-white/5 p-5 text-center">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Complete quizzes to identify weak spots.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-card/40 border border-white/5 p-5 space-y-3">
                <p className="text-sm font-medium">Weak topics</p>
                {summary.weakTopics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Target className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <span className="text-muted-foreground">{topic}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
