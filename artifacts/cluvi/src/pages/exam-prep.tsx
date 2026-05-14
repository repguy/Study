import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetQuizQuestions } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Timer,
  Share2, RotateCcw, ChevronRight, Target, Zap, BookOpen,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type Answer = { questionId: number; selected: number };

function getGrade(score: number) {
  if (score >= 90) return { label: "Outstanding", emoji: "🏆", color: "text-yellow-400", bg: "from-yellow-500 to-amber-400" };
  if (score >= 75) return { label: "Excellent",   emoji: "⭐", color: "text-primary",    bg: "from-primary to-accent" };
  if (score >= 60) return { label: "Good",         emoji: "✅", color: "text-green-400",  bg: "from-green-500 to-emerald-400" };
  if (score >= 40) return { label: "Fair",         emoji: "📚", color: "text-orange-400", bg: "from-orange-500 to-amber-500" };
  return                  { label: "Keep Going",   emoji: "💪", color: "text-accent",     bg: "from-accent to-primary" };
}

/* ── Results screen ── */
function ExamResults({ questions, answers, timeTaken, packId, packTitle, onRetry }: {
  questions: { id: number; question: string; options: string[]; correctAnswer: number; explanation?: string }[];
  answers: Answer[];
  timeTaken: number;
  packId: number;
  packTitle: string;
  onRetry: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "review">("overview");

  const correct = answers.filter((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return q && a.selected === q.correctAnswer;
  }).length;
  const score = Math.round((correct / questions.length) * 100);
  const grade = getGrade(score);

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  async function share() {
    setSharing(true);
    try {
      const text = `I scored ${score}% on "${packTitle}" exam prep with Cluvi! ${grade.emoji} ${correct}/${questions.length} correct. Study smarter at cluvi.app`;
      if (navigator.share) await navigator.share({ title: `My Cluvi Score: ${score}%`, text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } finally { setSharing(false); }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Score card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-white/10">
        <div className={`absolute inset-0 bg-gradient-to-br ${grade.bg} opacity-8`} />
        <div className="relative p-8 text-center space-y-5">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className={`w-20 h-20 bg-gradient-to-br ${grade.bg} rounded-2xl flex items-center justify-center mx-auto shadow-2xl text-4xl`}>
            {grade.emoji}
          </motion.div>
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className={`text-6xl font-black ${grade.color}`}>{score}%</motion.p>
            <p className="text-lg font-semibold mt-1">{grade.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{packTitle}</p>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3">
            {[
              { label: "Correct",    value: `${correct}/${questions.length}`, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Time",       value: formatTime(timeTaken),             icon: Timer,        color: "text-primary",   bg: "bg-primary/10"  },
              { label: "Grade",      value: grade.label.split(" ")[0],         icon: Trophy,       color: grade.color,      bg: "bg-white/5"     },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-3 border border-white/5`}>
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
          <p className="text-xs text-muted-foreground/40">Studied with Cluvi · cluvi.app</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/5">
        {(["overview", "review"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
              activeTab === tab ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>{tab === "overview" ? "Overview" : "Question Review"}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* incorrect questions */}
          {answers.filter((a) => {
            const q = questions.find((q) => q.id === a.questionId);
            return q && a.selected !== q.correctAnswer;
          }).length > 0 && (
            <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/15 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" /> Questions to review
              </h3>
              {answers.filter((a) => {
                const q = questions.find((q) => q.id === a.questionId);
                return q && a.selected !== q.correctAnswer;
              }).map((a) => {
                const q = questions.find((q) => q.id === a.questionId)!;
                return (
                  <div key={a.questionId} className="text-sm text-muted-foreground pl-3 border-l border-destructive/30">
                    <p className="font-medium text-foreground mb-1">{q.question}</p>
                    <p className="text-destructive/80">Your answer: {q.options[a.selected]}</p>
                    <p className="text-green-400">Correct: {q.options[q.correctAnswer]}</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "review" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {questions.map((q, i) => {
            const a = answers.find((a) => a.questionId === q.id);
            const isCorrect = a?.selected === q.correctAnswer;
            return (
              <div key={q.id} className={`p-4 rounded-2xl border text-sm ${isCorrect ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"}`}>
                <div className="flex items-start gap-2 mb-2">
                  {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                  <p className="font-medium">{i + 1}. {q.question}</p>
                </div>
                <div className="ml-6 space-y-1">
                  {q.options.map((opt, oi) => (
                    <p key={oi} className={`text-xs ${oi === q.correctAnswer ? "text-green-400 font-medium" : oi === a?.selected && !isCorrect ? "text-destructive" : "text-muted-foreground"}`}>
                      {["A","B","C","D"][oi]}. {opt}
                      {oi === q.correctAnswer && " ✓"}
                    </p>
                  ))}
                  {q.explanation && <p className="text-xs text-muted-foreground/70 mt-2 italic">{q.explanation}</p>}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Button onClick={share} disabled={sharing} variant="outline" className="flex-1 border-white/10 gap-2">
          <Share2 className="w-4 h-4" />{copied ? "Copied!" : "Share Score"}
        </Button>
        <Button onClick={onRetry} variant="outline" className="flex-1 border-white/10 gap-2">
          <RotateCcw className="w-4 h-4" />Retry
        </Button>
        <Link href={`/pack/${packId}`} className="flex-1">
          <Button className="w-full bg-gradient-to-r from-primary to-accent text-white border-0 gap-2">
            <BookOpen className="w-4 h-4" />Back to Pack
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN EXAM PREP PAGE
══════════════════════════════════════ */
export default function ExamPrep() {
  const [, params] = useRoute("/exam/:id");
  const packId = Number(params?.id);

  const { data: questions, isLoading } = useGetQuizQuestions(packId, {
    query: { queryKey: ["/api/quiz-questions-exam", packId], enabled: !!packId },
  });

  const [packTitle, setPackTitle] = useState("Exam Pack");
  const [phase, setPhase] = useState<"intro" | "exam" | "done">("intro");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!packId) return;
    fetch(`${BASE}/api/study-packs/${packId}`)
      .then((r) => r.json())
      .then((d: any) => setPackTitle(d.title ?? "Exam Pack"))
      .catch(() => {});
  }, [packId]);

  useEffect(() => {
    if (questions) setTimeLeft(questions.length * 60);
  }, [questions]);

  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); finishExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startExam = () => {
    startTimeRef.current = Date.now();
    setPhase("exam");
  };

  const finishExam = useCallback(() => {
    setTimeTaken(Math.round((Date.now() - startTimeRef.current) / 1000));
    setPhase("done");
  }, []);

  const handleNext = () => {
    if (selected === null || !questions) return;
    const q = questions[currentIdx];
    setAnswers((prev) => [...prev, { questionId: q.id, selected }]);
    setSelected(null);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      finishExam();
    }
  };

  const handleRetry = () => {
    setAnswers([]);
    setCurrentIdx(0);
    setSelected(null);
    setPhase("intro");
    if (questions) setTimeLeft(questions.length * 60);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
          <h2 className="text-2xl font-bold mb-2">No questions found</h2>
          <p className="text-muted-foreground mb-6">Generate a study pack first to unlock exam prep.</p>
          <Link href={`/pack/${packId}`}><Button>Back to Pack</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-[calc(100vh-4rem)] md:min-h-screen">

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-md w-full space-y-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20">
                <Target className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Timed Exam Mode</h1>
                <p className="text-muted-foreground">{packTitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Questions", value: questions.length, icon: BookOpen },
                  { label: "Time limit", value: `${questions.length}m`, icon: Timer },
                  { label: "No hints", value: "Strict", icon: Target },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-4 rounded-2xl bg-card/40 border border-white/5 text-center">
                    <Icon className="w-4 h-4 text-primary mx-auto mb-2" />
                    <p className="font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-sm text-muted-foreground text-left space-y-1.5">
                <p className="font-semibold text-amber-400">Exam rules</p>
                <p>• Answers are locked in — no going back</p>
                <p>• Correct/incorrect shown only at the end</p>
                <p>• Time runs out = exam auto-submits</p>
              </div>
              <Button onClick={startExam} size="lg" className="w-full h-14 bg-gradient-to-r from-primary to-accent text-white border-0 text-base font-bold">
                Start Exam <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <Link href={`/pack/${packId}`}>
                <Button variant="ghost" className="w-full text-muted-foreground">Cancel</Button>
              </Link>
            </motion.div>
          </div>
        )}

        {/* ── EXAM ── */}
        {phase === "exam" && (
          <div className="flex flex-col flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
            {/* header */}
            <div className="flex items-center gap-4 mb-8">
              <Link href={`/pack/${packId}`}>
                <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                  <span>Question {currentIdx + 1} of {questions.length}</span>
                  <span>{Math.round(((currentIdx) / questions.length) * 100)}% complete</span>
                </div>
                <Progress value={(currentIdx / questions.length) * 100} className="h-2" />
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-mono text-sm shrink-0 ${
                timeLeft < 60 ? "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse" : "bg-card/60 border-white/10"
              }`}>
                <Timer className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* question */}
            <AnimatePresence mode="wait">
              <motion.div key={currentIdx}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
                className="flex-1 flex flex-col">
                <h3 className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
                  {questions[currentIdx].question}
                </h3>
                <div className="space-y-3 mb-auto">
                  {questions[currentIdx].options.map((opt, i) => (
                    <button key={i} onClick={() => setSelected(i)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-base flex items-center gap-3 ${
                        selected === i
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-white/8 bg-card/30 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        selected === i ? "bg-primary text-white" : "bg-white/5 border border-white/10"
                      }`}>{["A","B","C","D"][i]}</span>
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {selected === null ? "Select an answer to continue" : "Answer locked in — click Next"}
                  </p>
                  <Button onClick={handleNext} disabled={selected === null}
                    className="min-w-[140px] bg-gradient-to-r from-primary to-accent text-white border-0">
                    {currentIdx < questions.length - 1 ? <>Next <ChevronRight className="w-4 h-4 ml-1" /></> : "Finish Exam"}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "done" && (
          <div className="flex-1 flex flex-col items-center p-4 md:p-8 overflow-y-auto">
            <ExamResults
              questions={questions}
              answers={answers}
              timeTaken={timeTaken}
              packId={packId}
              packTitle={packTitle}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
