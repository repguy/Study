import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetQuizQuestions, useSubmitQuizResult } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Timer,
  Share2, Download, Zap, Flame, Star, RotateCcw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@clerk/react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function getGrade(score: number): { label: string; emoji: string; color: string } {
  if (score >= 90) return { label: "Outstanding", emoji: "🏆", color: "text-yellow-400" };
  if (score >= 75) return { label: "Excellent", emoji: "⭐", color: "text-primary" };
  if (score >= 60) return { label: "Good", emoji: "✅", color: "text-green-400" };
  if (score >= 40) return { label: "Fair", emoji: "📚", color: "text-orange-400" };
  return { label: "Keep Studying", emoji: "💪", color: "text-accent" };
}

function ScoreCard({ result, packId, packTitle, onRetry }: {
  result: { score: number; correctCount: number; totalQuestions: number; xpEarned: number; weakAreas?: string[] };
  packId: number;
  packTitle?: string;
  onRetry: () => void;
}) {
  const { user } = useUser();
  const cardRef = useRef<HTMLDivElement>(null);
  const grade = getGrade(result.score);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const scoreColor =
    result.score >= 90 ? "from-yellow-500 to-amber-400" :
    result.score >= 75 ? "from-primary to-accent" :
    result.score >= 60 ? "from-green-500 to-emerald-400" :
    result.score >= 40 ? "from-orange-500 to-amber-500" :
    "from-accent to-primary";

  async function shareScore() {
    setSharing(true);
    try {
      const text = `I scored ${result.score}% on "${packTitle ?? "a quiz"}" with Cluvi! ${grade.emoji} ${result.correctCount}/${result.totalQuestions} correct · +${result.xpEarned} XP earned. Study smarter at cluvi.app`;
      if (navigator.share) {
        await navigator.share({ title: `My Cluvi Score: ${result.score}%`, text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Score card visual */}
      <div ref={cardRef} className="relative rounded-3xl overflow-hidden border border-white/10">
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${scoreColor} opacity-10`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 to-transparent" />

        <div className="relative p-8 text-center space-y-5">
          {/* Trophy / grade icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className={`w-20 h-20 bg-gradient-to-br ${scoreColor} rounded-2xl flex items-center justify-center mx-auto shadow-2xl text-4xl`}
          >
            {grade.emoji}
          </motion.div>

          {/* Score */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-6xl font-black ${grade.color}`}
            >
              {result.score}%
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold mt-1"
            >
              {grade.label}
            </motion.p>
            {packTitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-sm text-muted-foreground mt-1 truncate px-4"
              >
                {packTitle}
              </motion.p>
            )}
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Correct", value: `${result.correctCount}/${result.totalQuestions}`, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "XP Earned", value: `+${result.xpEarned}`, icon: Zap, color: "text-accent", bg: "bg-accent/10" },
              { label: "Grade", value: grade.label.split(" ")[0], icon: Star, color: grade.color, bg: "bg-white/5" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-3 border border-white/5`}>
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Cluvi branding watermark for sharing */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground/50"
          >
            Studied with Cluvi · cluvi.app
          </motion.p>
        </div>
      </div>

      {/* Weak areas */}
      {result.weakAreas && result.weakAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20"
        >
          <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4" /> Areas to review
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            {result.weakAreas.map((area: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground">{area}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={shareScore}
          disabled={sharing}
          variant="outline"
          className="flex-1 border-white/10 hover:bg-white/5 gap-2"
        >
          <Share2 className="w-4 h-4" />
          {copied ? "Copied!" : "Share Score"}
        </Button>
        <Button
          onClick={onRetry}
          variant="outline"
          className="flex-1 border-white/10 hover:bg-white/5 gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Quiz
        </Button>
        <Link href={`/pack/${packId}`} className="flex-1">
          <Button className="w-full bg-gradient-to-r from-primary to-accent text-white border-0 gap-2">
            <Trophy className="w-4 h-4" />
            Back to Pack
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

export default function Quiz() {
  const [, params] = useRoute("/quiz/:id");
  const packId = Number(params?.id);

  const { data: questions, isLoading } = useGetQuizQuestions(packId, {
    query: {
      queryKey: ["/api/quiz-questions", packId],
      enabled: !!packId,
    },
  });

  const submitQuiz = useSubmitQuizResult();
  const [packTitle, setPackTitle] = useState<string | undefined>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; selectedAnswer: number }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const currentQuestion = questions?.[currentIndex];
  const progress = questions?.length ? ((currentIndex + (showExplanation ? 1 : 0)) / questions.length) * 100 : 0;

  // Fetch pack title for score card
  useEffect(() => {
    if (!packId) return;
    fetch(`${BASE}/api/study-packs/${packId}`)
      .then((r) => r.json())
      .then((d: any) => setPackTitle(d.title))
      .catch(() => {});
  }, [packId]);

  useEffect(() => {
    if (quizCompleted || !questions) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); finishQuiz(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizCompleted, questions]);

  const finishQuiz = useCallback(() => {
    if (quizCompleted) return;
    setQuizCompleted(true);
    submitQuiz.mutate(
      { id: packId, data: { answers, timeTakenSeconds: 600 - timeRemaining } },
      { onSuccess: (res) => setResult(res) },
    );
  }, [answers, timeRemaining, submitQuiz, quizCompleted]);

  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    setAnswers((prev) => [...prev, { questionId: currentQuestion!.id, selectedAnswer: index }]);
  };

  const handleNext = () => {
    if (currentIndex < (questions?.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  function handleRetry() {
    setCurrentIndex(0);
    setAnswers([]);
    setShowExplanation(false);
    setSelectedOption(null);
    setTimeRemaining(600);
    setQuizCompleted(false);
    setResult(null);
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">No quiz found</h2>
          <p className="text-muted-foreground mb-6">Generate quiz questions for this pack first.</p>
          <Link href={`/pack/${packId}`}><Button>Back to Pack</Button></Link>
        </div>
      </AppLayout>
    );
  }

  if (quizCompleted) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] p-6 max-w-lg mx-auto w-full">
          {submitQuiz.isPending || !result ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Analysing Results…</h2>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <ScoreCard
                result={result}
                packId={packId}
                packTitle={packTitle}
                onRetry={handleRetry}
              />
            </motion.div>
          )}
        </div>
      </AppLayout>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timeWarning = timeRemaining < 60;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href={`/pack/${packId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-6 flex-1 mx-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2 text-muted-foreground font-medium">
                <span>Question {currentIndex + 1} of {questions.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className={`flex items-center gap-2 text-lg font-mono px-4 py-2 rounded-full border ${timeWarning ? "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse" : "bg-card/60 border-white/10"}`}>
              <Timer className="w-5 h-5 text-primary" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
              className="flex-1 flex flex-col"
            >
              <h3 className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
                {currentQuestion?.question}
              </h3>

              <div className="space-y-3 mb-8">
                {currentQuestion?.options.map((option, i) => {
                  const isSelected = selectedOption === i;
                  const isCorrect = currentQuestion.correctAnswer === i;
                  const showAsCorrect = showExplanation && isCorrect;
                  const showAsWrong = showExplanation && isSelected && !isCorrect;

                  let buttonClass = "w-full justify-start h-auto py-4 px-6 text-left text-base whitespace-normal rounded-xl border-2 transition-all ";
                  if (!showExplanation) {
                    buttonClass += "bg-card/40 border-white/10 hover:border-primary/50 hover:bg-primary/5";
                  } else if (showAsCorrect) {
                    buttonClass += "bg-green-500/10 border-green-500 text-green-400";
                  } else if (showAsWrong) {
                    buttonClass += "bg-red-500/10 border-red-500 text-red-400 opacity-70";
                  } else {
                    buttonClass += "bg-card/20 border-white/5 opacity-50";
                  }

                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className={buttonClass}
                      onClick={() => handleSelectOption(i)}
                      disabled={showExplanation}
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold shrink-0">
                            {["A", "B", "C", "D"][i]}
                          </span>
                          <span>{option}</span>
                        </div>
                        {showAsCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                        {showAsWrong && <XCircle className="w-5 h-5 shrink-0" />}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {showExplanation && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-auto">
                  <div className={`p-5 rounded-2xl border ${selectedOption === currentQuestion?.correctAnswer ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"} mb-5`}>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      {selectedOption === currentQuestion?.correctAnswer ? (
                        <><CheckCircle2 className="w-5 h-5 text-green-400" /> Correct!</>
                      ) : (
                        <><XCircle className="w-5 h-5 text-red-400" /> Incorrect</>
                      )}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {currentQuestion?.explanation || "No explanation provided."}
                    </p>
                  </div>

                  <Button
                    className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-primary to-accent text-white border-0"
                    onClick={handleNext}
                  >
                    {currentIndex < questions.length - 1 ? "Next Question →" : "Finish Quiz"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
