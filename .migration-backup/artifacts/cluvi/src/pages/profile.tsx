import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { useUser } from "@clerk/react";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import {
  Copy, Check, Share2, Zap, Flame, Trophy, Star,
  Crown, Shield, BookOpen, Brain, Target, Gift, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const BADGES = [
  { id: "first_pack", label: "First Pack", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", desc: "Created your first study pack" },
  { id: "quiz_king", label: "Quiz King", icon: Crown, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", desc: "Scored 100% on a quiz" },
  { id: "streak_7", label: "Streak Legend", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", desc: "7-day study streak" },
  { id: "exam_master", label: "Exam Master", icon: Trophy, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", desc: "Completed 10+ study packs" },
  { id: "scholar", label: "Scholar", icon: Star, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", desc: "Reached Level 5" },
  { id: "referrer", label: "Referrer", icon: Users, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", desc: "Referred 5+ friends" },
];

function getLevelTitle(level: number): string {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 5) return "Scholar";
  if (level >= 3) return "Student";
  return "Beginner";
}

function getLevelGlow(level: number): string {
  if (level >= 20) return "shadow-yellow-500/30 border-yellow-500/30";
  if (level >= 10) return "shadow-purple-500/30 border-purple-500/30";
  if (level >= 5) return "shadow-blue-500/30 border-blue-500/30";
  return "shadow-primary/20 border-primary/20";
}

export default function Profile() {
  const { user } = useUser();
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralResult, setReferralResult] = useState<{ success: boolean; message: string } | null>(null);
  const [applyingReferral, setApplyingReferral] = useState(false);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const credits = profile?.credits ?? 0;
  const myReferralCode = (profile as any)?.referralCode ?? "";
  const referralCount = (profile as any)?.referralCount ?? 0;
  const earnedBadges: string[] = (profile as any)?.badges ? JSON.parse((profile as any).badges) : [];
  const levelTitle = getLevelTitle(level);
  const glowClass = getLevelGlow(level);
  const xpInLevel = xp % (level * 100);
  const xpForLevel = level * 100;

  function copyCode() {
    navigator.clipboard.writeText(myReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function applyReferral() {
    if (!referralCode.trim()) return;
    setApplyingReferral(true);
    try {
      const res = await fetch(`${BASE()}/api/user/referral/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode.trim() }),
      });
      const data = await res.json() as { error?: string; creditsAwarded?: number };
      if (res.ok) {
        setReferralResult({ success: true, message: `+${data.creditsAwarded} credits added!` });
      } else {
        setReferralResult({ success: false, message: data.error ?? "Failed to apply code" });
      }
    } finally {
      setApplyingReferral(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative rounded-2xl border bg-card/40 p-6 overflow-hidden shadow-xl ${glowClass}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
          {level >= 10 && (
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          )}
          <div className="relative flex items-center gap-5">
            <div className={`relative w-20 h-20 rounded-2xl border-2 ${glowClass} shadow-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-3xl font-bold`}>
              {level >= 20 ? "👑" : level >= 10 ? "⭐" : level >= 5 ? "🎓" : user?.firstName?.charAt(0) ?? "?"}
              <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold bg-card border border-white/20`}>
                {level}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold truncate">{profile?.displayName ?? user?.fullName ?? "Anonymous"}</h1>
                {profile?.isPro && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground">{levelTitle} · Level {level}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{xp} XP</span>
                  <span>{xpForLevel} XP needed</span>
                </div>
                <Progress value={(xpInLevel / xpForLevel) * 100} className="h-1.5" />
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "XP", value: xp, icon: Zap, color: "text-accent" },
              { label: "Streak", value: `${streak}d`, icon: Flame, color: "text-orange-400" },
              { label: "Credits", value: credits, icon: Star, color: "text-primary" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="text-lg font-semibold mb-4">Profile Decorations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((badge) => {
              const unlocked = earnedBadges.includes(badge.id) || badge.id === "first_pack";
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-4 transition-all ${
                    unlocked
                      ? `${badge.bg} border-opacity-60`
                      : "bg-white/[0.02] border-white/5 opacity-40 grayscale"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${unlocked ? badge.bg : "bg-white/5"}`}>
                      <Icon className={`w-4 h-4 ${unlocked ? badge.color : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-sm font-semibold">{badge.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                  {!unlocked && <p className="text-xs text-muted-foreground mt-1 italic">Locked</p>}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Referral System */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-semibold mb-4">Referral Program</h2>
          <div className="rounded-2xl border border-white/5 bg-card/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Earn +20 credits per referral</p>
                <p className="text-xs text-muted-foreground">Your friend gets +20 bonus credits too</p>
              </div>
            </div>

            {myReferralCode && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Your referral code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <code className="text-base font-bold text-primary tracking-widest">{myReferralCode}</code>
                    <span className="ml-auto text-xs text-muted-foreground">{referralCount} referrals · {referralCount * 20} credits earned</span>
                  </div>
                  <Button size="icon" variant="outline" className="shrink-0 h-10 w-10" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0 h-10 w-10"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: "Join Cluvi!", text: `Use my code ${myReferralCode} for +20 bonus credits`, url: window.location.origin });
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">Have a referral code? Apply it</p>
              <div className="flex gap-2">
                <input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  maxLength={10}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground placeholder:tracking-normal"
                />
                <Button onClick={applyReferral} disabled={!referralCode.trim() || applyingReferral} className="shrink-0">
                  Apply
                </Button>
              </div>
              {referralResult && (
                <p className={`text-xs mt-2 ${referralResult.success ? "text-green-400" : "text-destructive"}`}>
                  {referralResult.message}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Level roadmap */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-semibold mb-4">Level Titles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { title: "Beginner", minLevel: 1, icon: "🌱", color: "text-muted-foreground" },
              { title: "Student", minLevel: 3, icon: "📚", color: "text-blue-400" },
              { title: "Scholar", minLevel: 5, icon: "🎓", color: "text-cyan-400" },
              { title: "Expert", minLevel: 10, icon: "⭐", color: "text-purple-400" },
              { title: "Master", minLevel: 15, icon: "🔥", color: "text-orange-400" },
              { title: "Legend", minLevel: 20, icon: "👑", color: "text-yellow-400" },
            ].map((tier) => (
              <div
                key={tier.title}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  level >= tier.minLevel
                    ? "bg-white/5 border-white/10"
                    : "bg-white/[0.02] border-white/5 opacity-40"
                }`}
              >
                <span className="text-xl">{tier.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${level >= tier.minLevel ? tier.color : "text-muted-foreground"}`}>{tier.title}</p>
                  <p className="text-xs text-muted-foreground">Level {tier.minLevel}+</p>
                </div>
                {level >= tier.minLevel && (
                  <Check className="ml-auto w-4 h-4 text-green-400" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
