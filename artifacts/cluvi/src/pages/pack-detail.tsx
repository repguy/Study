import { useGetStudyPack, useGenerateStudyPackContent, getGetStudyPackQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Layers, Play, Share2, RefreshCw, Target,
  Brain, Zap, GraduationCap, Copy, Check, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

const LOADING_STEPS = [
  "Analyzing your content…",
  "Extracting key concepts…",
  "Building flashcards…",
  "Crafting quiz questions…",
  "Generating exam predictions…",
  "Finalizing your study pack…",
];

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-card/40 border border-white/5 p-5 md:p-6 space-y-3 animate-pulse ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="h-4 bg-white/5 rounded w-32" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-5/6" />
        <div className="h-3 bg-white/5 rounded w-4/6" />
        <div className="h-3 bg-white/5 rounded w-3/4" />
      </div>
    </div>
  );
}

function ProcessingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-16 gap-6"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center"
        >
          <Brain className="w-8 h-8 text-primary" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
        />
      </div>

      <div className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-base font-medium text-foreground"
          >
            {LOADING_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
        <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds</p>
      </div>

      <div className="flex gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i <= stepIndex ? 1 : 0.2, scale: i === stepIndex ? 1.3 : 1 }}
            transition={{ duration: 0.3 }}
            className={`h-1.5 rounded-full transition-all ${i <= stepIndex ? "bg-primary w-4" : "bg-white/20 w-1.5"}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="rounded-2xl border border-white/5 bg-card/40 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5" />
          <div className="h-3 bg-white/5 rounded w-24" />
        </div>
        <div className="space-y-2">
          {[100, 90, 80, 95, 70].map((w, i) => (
            <div key={i} className="h-3 bg-white/5 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-card/40 border border-white/5 p-4 h-16" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function PackDetail() {
  const [, params] = useRoute("/pack/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: pack, isLoading, refetch } = useGetStudyPack(id, {
    query: {
      enabled: !!id,
      queryKey: getGetStudyPackQueryKey(id),
      refetchInterval: (query) => {
        const status = (query.state.data as { status?: string } | undefined)?.status;
        return status === "processing" ? 2500 : false;
      },
    },
  });
  const generateContent = useGenerateStudyPackContent();

  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const handleShare = async () => {
    try {
      const res = await fetch(`${BASE}/api/study-packs/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json() as { shareUrl?: string; error?: string };
      if (data.shareUrl) {
        await navigator.clipboard.writeText(window.location.origin + data.shareUrl);
        toast({ title: "Link copied!", description: "Share link copied to clipboard." });
      } else {
        toast({ title: "Failed to share", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    }
  };

  const handleRegenerate = () => {
    generateContent.mutate({ id }, {
      onSuccess: () => {
        refetch();
        toast({ title: "Regenerating content…" });
      },
    });
  };

  const handleCopySummary = async () => {
    if (!pack?.summary) return;
    await navigator.clipboard.writeText(pack.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-6">
          <div className="animate-pulse space-y-3">
            <div className="h-7 bg-white/5 rounded w-2/3" />
            <div className="h-4 bg-white/5 rounded w-1/3" />
          </div>
          <SummarySkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!pack) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Pack not found.</p>
          <Link href="/dashboard"><Button variant="outline">Back to dashboard</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const keyConcepts = Array.isArray(pack.keyConcepts) ? pack.keyConcepts : [];
  const examPredictions = Array.isArray(pack.examPredictions) ? pack.examPredictions : [];

  const CONCEPT_COLORS = [
    "bg-primary/10 border-primary/25 text-primary",
    "bg-accent/10 border-accent/25 text-accent",
    "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
    "bg-green-500/10 border-green-500/25 text-green-400",
    "bg-rose-500/10 border-rose-500/25 text-rose-400",
    "bg-sky-500/10 border-sky-500/25 text-sky-400",
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge
                variant="secondary"
                className={
                  pack.status === "ready"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : pack.status === "processing"
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }
              >
                {pack.status}
              </Badge>
              {pack.isPro && (
                <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 text-xs">PRO</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="pack-title">
              {pack.title}
            </h1>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:shrink-0">
            <Button variant="outline" size="sm" onClick={handleShare}
              className="border-white/10 hover:bg-white/5 w-full md:w-auto" data-testid="button-share">
              <Share2 className="w-4 h-4 mr-1.5" />Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerate}
              disabled={generateContent.isPending || pack.status === "processing"}
              className="border-white/10 hover:bg-white/5 w-full md:w-auto" data-testid="button-regenerate">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${generateContent.isPending ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
            {pack.flashcardCount > 0 && (
              <Link href={`/flashcards/${pack.id}`} className="w-full md:w-auto">
                <Button variant="outline" className="border-white/10 hover:bg-white/5 w-full" data-testid="button-flashcards">
                  <Layers className="w-4 h-4 mr-1.5" />Flashcards
                </Button>
              </Link>
            )}
            {pack.quizCount > 0 && (
              <Link href={`/quiz/${pack.id}`} className="w-full md:w-auto">
                <Button className="bg-gradient-to-r from-primary to-accent text-white border-0 w-full" data-testid="button-quiz">
                  <Play className="w-4 h-4 mr-1.5" />Take quiz
                </Button>
              </Link>
            )}
            {pack.quizCount > 0 && (
              <Link href={`/exam/${pack.id}`} className="col-span-2 md:col-span-1 md:w-auto">
                <Button variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 w-full" data-testid="button-exam">
                  <GraduationCap className="w-4 h-4 mr-1.5" />Timed exam
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Processing state */}
        {pack.status === "processing" && <ProcessingState />}

        {/* Error state */}
        {pack.status === "error" && (
          <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
            className="flex flex-col items-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                The AI couldn't process your content. Your credits have been refunded.
              </p>
            </div>
            <Button onClick={handleRegenerate} disabled={generateContent.isPending}
              className="bg-gradient-to-r from-primary to-accent text-white border-0">
              <RefreshCw className={`w-4 h-4 mr-2 ${generateContent.isPending ? "animate-spin" : ""}`} />
              Try again
            </Button>
          </motion.div>
        )}

        {/* Ready state */}
        {pack.status === "ready" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
            {/* Summary card */}
            {pack.summary && (
              <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
                className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card/40 to-transparent p-5 md:p-6 overflow-hidden"
                data-testid="pack-summary"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-3 relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-2.5">AI Summary</p>
                    <p className="text-sm md:text-base leading-relaxed text-foreground/85">{pack.summary}</p>
                  </div>
                  <button
                    onClick={handleCopySummary}
                    className="shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                    title="Copy summary"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Stats bar */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Flashcards", val: pack.flashcardCount, icon: Layers, color: "text-primary", bg: "bg-primary/10 border-primary/15" },
                { label: "Quiz Qs", val: pack.quizCount, icon: Target, color: "text-accent", bg: "bg-accent/10 border-accent/15" },
                { label: "Predictions", val: pack.examPredictionCount, icon: Brain, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/15" },
                { label: "Mastery", val: `${pack.studyStrength ?? 0}%`, icon: Zap, color: "text-green-400", bg: "bg-green-500/10 border-green-500/15" },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className={`p-3 md:p-4 rounded-xl border flex items-center gap-2 md:gap-3 min-w-0 ${bg}`}
                  data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">{label}</p>
                    <p className={`font-bold text-sm md:text-base ${color}`}>{val}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Key concepts + Exam predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key concepts */}
              {keyConcepts.length > 0 && (
                <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
                  className="rounded-2xl bg-card/40 border border-white/8 p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-semibold">Key concepts</h2>
                    <span className="ml-auto text-xs text-muted-foreground">{keyConcepts.length} concepts</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keyConcepts.map((concept, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-medium ${CONCEPT_COLORS[i % CONCEPT_COLORS.length]}`}
                        data-testid={`concept-${i}`}
                      >
                        {concept}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Exam predictions */}
              {examPredictions.length > 0 && (
                <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible"
                  className="rounded-2xl bg-card/40 border border-white/8 p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-yellow-400" />
                    </div>
                    <h2 className="font-semibold">Exam predictions</h2>
                    <span className="ml-auto text-xs text-muted-foreground">{examPredictions.length} likely topics</span>
                  </div>
                  <ul className="space-y-2.5">
                    {examPredictions.map((pred, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-colors"
                        data-testid={`prediction-${i}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-yellow-400">{i + 1}</span>
                        </div>
                        <span className="text-sm text-foreground/80 leading-relaxed">{pred}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Study actions */}
            {(pack.flashcardCount > 0 || pack.quizCount > 0) && (
              <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible"
                className="p-4 rounded-2xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">Ready to study?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pack.flashcardCount} flashcards · {pack.quizCount} quiz questions
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {pack.flashcardCount > 0 && (
                    <Link href={`/flashcards/${pack.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" className="border-white/15 w-full sm:w-auto" size="sm">
                        <Layers className="w-3.5 h-3.5 mr-1.5" />Flashcards
                      </Button>
                    </Link>
                  )}
                  {pack.quizCount > 0 && (
                    <Link href={`/quiz/${pack.id}`} className="flex-1 sm:flex-none">
                      <Button className="bg-gradient-to-r from-primary to-accent text-white border-0 w-full sm:w-auto" size="sm">
                        <Play className="w-3.5 h-3.5 mr-1.5" />Take quiz
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
