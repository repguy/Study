import { useGetStudyPack, useGenerateStudyPackContent, getGetStudyPackQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, Play, Share2, RefreshCw, CheckCircle2, Target, Brain, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function PackDetail() {
  const [, params] = useRoute("/pack/:id");
  const id = Number(params?.id);
  const { toast } = useToast();

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
        toast({ title: "Content regenerated" });
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
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

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge
                variant={pack.status === "ready" ? "default" : "secondary"}
                className={pack.status === "ready" ? "bg-green-500/10 text-green-400 border-green-500/20" : pack.status === "processing" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}
              >
                {pack.status}
              </Badge>
              {pack.isPro && (
                <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 text-xs">PRO</Badge>
              )}
              {pack.aiModelUsed && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                  {pack.aiModelUsed}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="pack-title">{pack.title}</h1>
            {pack.summary && (
              <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed" data-testid="pack-summary">{pack.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="border-white/10 hover:bg-white/5"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={generateContent.isPending || pack.status === "processing"}
              className="border-white/10 hover:bg-white/5"
              data-testid="button-regenerate"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${generateContent.isPending ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
            <Link href={`/flashcards/${pack.id}`}>
              <Button variant="outline" className="border-white/10 hover:bg-white/5" data-testid="button-flashcards">
                <Layers className="w-4 h-4 mr-1.5" />
                Flashcards
              </Button>
            </Link>
            <Link href={`/quiz/${pack.id}`}>
              <Button className="bg-gradient-to-r from-primary to-accent text-white border-0" data-testid="button-quiz">
                <Play className="w-4 h-4 mr-1.5" />
                Take quiz
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: "Flashcards", val: pack.flashcardCount, icon: Layers, color: "text-primary" },
            { label: "Quiz questions", val: pack.quizCount, icon: Target, color: "text-accent" },
            { label: "Exam predictions", val: pack.examPredictionCount, icon: Brain, color: "text-yellow-400" },
            { label: "Mastery", val: `${pack.studyStrength}%`, icon: Zap, color: "text-green-400" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl bg-card/40 border border-white/5 flex items-center gap-3" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`font-bold ${color}`}>{val}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Content */}
        {pack.status === "processing" && (
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex flex-col items-center py-16 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-10 h-10 text-primary" />
            </motion.div>
            <p className="text-muted-foreground">AI is generating your study material…</p>
            <p className="text-xs text-muted-foreground/60">This usually takes 10–30 seconds</p>
          </motion.div>
        )}

        {pack.status === "error" && (
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex flex-col items-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-1">The AI couldn't process your content. Your credits have been refunded.</p>
            </div>
            <Button onClick={handleRegenerate} disabled={generateContent.isPending} className="bg-gradient-to-r from-primary to-accent text-white border-0">
              <RefreshCw className={`w-4 h-4 mr-2 ${generateContent.isPending ? "animate-spin" : ""}`} />
              Try again
            </Button>
          </motion.div>
        )}

        {pack.status === "ready" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key concepts */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="rounded-2xl bg-card/40 border border-white/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Key concepts</h2>
              </div>
              {keyConcepts.length > 0 ? (
                <ul className="space-y-3">
                  {keyConcepts.map((concept, i) => (
                    <motion.li
                      key={i}
                      variants={fadeUp}
                      custom={i * 0.5}
                      initial="hidden"
                      animate="visible"
                      className="flex items-start gap-3"
                      data-testid={`concept-${i}`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{concept}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No key concepts yet.</p>
              )}
            </motion.div>

            {/* Exam predictions */}
            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="rounded-2xl bg-card/40 border border-white/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-yellow-400" />
                <h2 className="font-semibold text-lg">Exam predictions</h2>
              </div>
              {examPredictions.length > 0 ? (
                <ul className="space-y-3">
                  {examPredictions.map((pred, i) => (
                    <motion.li
                      key={i}
                      variants={fadeUp}
                      custom={i * 0.5}
                      initial="hidden"
                      animate="visible"
                      className="flex items-start gap-3"
                      data-testid={`prediction-${i}`}
                    >
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
        )}
      </div>
    </AppLayout>
  );
}
