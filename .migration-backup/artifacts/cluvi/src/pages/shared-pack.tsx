import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Layers, Target, Zap, CheckCircle2, Lock,
  Share2, GraduationCap, ArrowRight,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

interface SharedPack {
  id: number;
  title: string;
  summary: string | null;
  status: string;
  keyConcepts: string[];
  examPredictions: string[];
  flashcardCount: number;
  quizCount: number;
  examPredictionCount: number;
  studyStrength: number;
  flashcards: Flashcard[];
}

export default function SharedPack() {
  const [, params] = useRoute("/shared/:token");
  const token = params?.token ?? "";

  const [pack, setPack] = useState<SharedPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/study-packs/shared/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setPack(data as SharedPack);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SharedNav />
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-3 gap-3 mt-8">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !pack) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-4">
        <SharedNav />
        <Brain className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Pack not found</h1>
        <p className="text-muted-foreground text-center">This study pack doesn't exist or the share link has expired.</p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-primary to-accent text-white border-0">
            Try Cluvi free <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    );
  }

  const keyConcepts = pack.keyConcepts ?? [];
  const examPredictions = pack.examPredictions ?? [];
  const previewFlashcards = pack.flashcards?.slice(0, 3) ?? [];
  const lockedCount = Math.max(0, pack.flashcardCount - previewFlashcards.length);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SharedNav onShare={handleCopyLink} />

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              {pack.status}
            </Badge>
            <Badge variant="outline" className="border-white/10 text-muted-foreground text-xs">
              Shared study pack
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{pack.title}</h1>
          {pack.summary && (
            <p className="text-muted-foreground leading-relaxed max-w-2xl">{pack.summary}</p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
          className="grid grid-cols-3 gap-3">
          {[
            { label: "Flashcards", val: pack.flashcardCount, icon: Layers, color: "text-primary" },
            { label: "Quiz questions", val: pack.quizCount, icon: Target, color: "text-accent" },
            { label: "Exam predictions", val: pack.examPredictionCount, icon: Brain, color: "text-yellow-400" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl bg-card/40 border border-white/5 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`font-bold ${color}`}>{val}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Key concepts + exam predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
            className="rounded-2xl bg-card/40 border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Key concepts</h2>
            </div>
            {keyConcepts.length > 0 ? (
              <ul className="space-y-3">
                {keyConcepts.map((concept, i) => (
                  <motion.li key={i} variants={fadeUp} custom={i * 0.4} initial="hidden" animate="visible"
                    className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{concept}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No key concepts.</p>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            className="rounded-2xl bg-card/40 border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold text-lg">Exam predictions</h2>
            </div>
            {examPredictions.length > 0 ? (
              <ul className="space-y-3">
                {examPredictions.map((pred, i) => (
                  <motion.li key={i} variants={fadeUp} custom={i * 0.4} initial="hidden" animate="visible"
                    className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-yellow-400">{i + 1}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{pred}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No predictions yet.</p>
            )}
          </motion.div>
        </div>

        {/* Flashcard preview */}
        {previewFlashcards.length > 0 && (
          <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Flashcard preview</h2>
            </div>
            <div className="space-y-3">
              {previewFlashcards.map((card, i) => (
                <div key={card.id}
                  className="rounded-xl border border-white/5 bg-card/40 p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Front</p>
                    <p className="text-sm font-medium">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Back</p>
                    <p className="text-sm text-muted-foreground">{card.back}</p>
                  </div>
                </div>
              ))}

              {/* Locked cards */}
              {lockedCount > 0 && (
                <div className="relative rounded-xl border border-white/5 bg-card/40 p-4 overflow-hidden">
                  <div className="filter blur-sm select-none pointer-events-none grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Front</p>
                      <p className="text-sm font-medium">Sign up to unlock all {lockedCount} remaining cards</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Back</p>
                      <p className="text-sm text-muted-foreground">Full answer hidden</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {lockedCount} more card{lockedCount !== 1 ? "s" : ""} — sign up to study them
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* CTA banner */}
        <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible"
          className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 p-8 text-center space-y-4">
          <GraduationCap className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Study this pack for free</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Flip all {pack.flashcardCount} flashcards, take the quiz, run a timed exam, and track your mastery — all for free on Cluvi.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/sign-up">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-white border-0 font-semibold">
                Start studying free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">10 free credits on signup · No card required</p>
        </motion.div>

      </div>
    </div>
  );
}

function SharedNav({ onShare }: { onShare?: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Cluvi</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare} className="text-muted-foreground hover:text-foreground">
              <Share2 className="w-4 h-4 mr-1.5" />
              Copy link
            </Button>
          )}
          <Link href="/sign-up">
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-white border-0">
              Get started free
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
