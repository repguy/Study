import { Link } from "wouter";
import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Brain, Zap, Target, BookOpen, Layers, Sparkles,
  Check, RotateCw, Timer, Trophy, Star, Upload, FileText, Globe, Image,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";

/* ─── variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ─── animated counter ─── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return c.stop;
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── ambient particle ─── */
function Particle({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/20 pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{ y: [0, -18, 0], opacity: [0.3, 0.65, 0.3] }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

/* ─── feature card ─── */
function FeatureCard({ icon: Icon, title, desc, accent, delay }: {
  icon: React.ElementType; title: string; desc: string; accent: string; delay: number;
}) {
  return (
    <motion.div
      variants={fadeUp} custom={delay} initial="hidden" whileInView="visible"
      whileHover={{ y: -4, scale: 1.015 }}
      viewport={{ once: true, margin: "-50px" }}
      className={`group relative p-6 rounded-2xl border border-white/5 bg-card/30 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/10`}
    >
      <div className={`absolute inset-0 ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-xl ${accent} opacity-80 flex items-center justify-center mb-4 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold mb-2 text-[15px]">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── step card ─── */
function Step({ n, icon: Icon, title, desc, delay }: {
  n: number; icon: React.ElementType; title: string; desc: string; delay: number;
}) {
  return (
    <motion.div
      variants={fadeUp} custom={delay} initial="hidden" whileInView="visible"
      viewport={{ once: true }} className="flex flex-col items-center text-center relative"
    >
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center absolute -top-2 -right-2 shadow-md shadow-primary/40">{n}</div>
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">{desc}</p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* flashcard demo */
  const [flipped, setFlipped] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const demoCards = [
    { front: "What is the powerhouse of the cell?", back: "The mitochondria — it produces ATP via cellular respiration." },
    { front: "Define Newton's Second Law", back: "F = ma — force equals mass multiplied by acceleration." },
    { front: "What year did WWII end?", back: "1945 — Germany surrendered in May, Japan in September." },
  ];
  useEffect(() => {
    const t = setInterval(() => {
      setFlipped(false);
      setTimeout(() => setCardIdx((c) => (c + 1) % demoCards.length), 320);
    }, 3800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── ambient background ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[900px] h-[700px] bg-primary/6 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-0 w-[700px] h-[600px] bg-accent/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "128px" }} />
      </div>

      {/* particles */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <Particle x="10%" y="15%" size={4} delay={0} />
        <Particle x="80%" y="10%" size={3} delay={1} />
        <Particle x="25%" y="68%" size={5} delay={2} />
        <Particle x="65%" y="45%" size={3} delay={0.5} />
        <Particle x="90%" y="60%" size={4} delay={1.5} />
        <Particle x="5%"  y="45%" size={3} delay={2.5} />
        <Particle x="50%" y="84%" size={4} delay={1.2} />
      </div>

      {/* ── nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-background/60 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Cluvi
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-5 text-sm font-bold shadow-lg shadow-white/10">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section ref={heroRef} className="relative pt-36 pb-20 px-5 min-h-[92vh] flex flex-col items-center justify-center">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-5xl mx-auto text-center w-full">

          {/* badge */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary mb-8 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered studying that actually works
          </motion.div>

          {/* headline */}
          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
            className="text-5xl sm:text-7xl md:text-[86px] font-bold tracking-tight leading-[1.04] mb-6"
          >
            Turn Any Notes Into
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-violet-400 to-accent bg-clip-text text-transparent">
                an Exam Pack.
              </span>
              <motion.div
                className="absolute -inset-3 bg-gradient-to-r from-primary/8 to-accent/8 blur-3xl rounded-3xl -z-10"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity }}
              />
            </span>
          </motion.h1>

          {/* subtitle */}
          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload PDFs, paste notes, or drop a URL. Instantly generate AI-powered summaries,
            flashcards, quizzes, and exam predictions — in seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5"
          >
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-9 bg-white text-black hover:bg-white/90 rounded-full text-base font-bold group shadow-2xl shadow-white/10 w-full sm:w-auto">
                Start studying free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="h-14 px-9 rounded-full text-base border-white/10 hover:bg-white/5 w-full sm:w-auto">
                Sign in →
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} initial="hidden" animate="visible"
            className="text-sm text-muted-foreground/60"
          >
            10 free credits on signup &bull; No card required
          </motion.p>

          {/* UI mockup */}
          <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="mt-20 max-w-4xl mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-accent/4 rounded-3xl blur-3xl -z-10 scale-95" />
            <div className="rounded-2xl border border-white/8 bg-card/40 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/50">
              {/* chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 bg-white/[0.015]">
                <div className="w-3 h-3 rounded-full bg-red-500/50" /><div className="w-3 h-3 rounded-full bg-yellow-500/50" /><div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />cluvi.app/dashboard
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Flashcards", val: "24", color: "text-primary", icon: Layers, bg: "from-primary/20 to-primary/5" },
                  { label: "Quiz score", val: "87%", color: "text-accent", icon: Target, bg: "from-accent/20 to-accent/5" },
                  { label: "Study streak", val: "7 days", color: "text-orange-400", icon: Zap, bg: "from-orange-500/20 to-orange-500/5" },
                  { label: "XP earned", val: "+340", color: "text-violet-400", icon: Star, bg: "from-violet-500/20 to-violet-500/5" },
                ].map(({ label, val, color, icon: Icon, bg }) => (
                  <div key={label} className={`rounded-xl bg-gradient-to-br ${bg} border border-white/5 p-4`}>
                    <Icon className={`w-4 h-4 ${color} mb-2 opacity-60`} />
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
                <div className="col-span-2 md:col-span-4 rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Cellular Respiration — mastery</p>
                    <span className="text-xs font-semibold text-accent">68%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: 0 }} animate={{ width: "68%" }}
                      transition={{ delay: 1.2, duration: 1.4, ease: "easeOut" }} />
                  </div>
                </div>
              </div>
            </div>
            {/* floating chips */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="hidden md:flex absolute -right-14 top-8 items-center gap-2 px-4 py-2.5 rounded-2xl bg-card/90 border border-white/10 backdrop-blur-xl shadow-xl text-sm font-medium whitespace-nowrap">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />Pack ready
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="hidden md:flex absolute -left-14 bottom-10 items-center gap-2 px-4 py-2.5 rounded-2xl bg-card/90 border border-white/10 backdrop-blur-xl shadow-xl text-sm whitespace-nowrap">
              <Zap className="w-4 h-4 text-accent" /><span>+50 XP earned</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════
          SOCIAL PROOF
      ══════════════════════════════ */}
      <section className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <motion.p variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-12">
            Built for students who actually want results
          </motion.p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { val: 10000, suffix: "+", label: "Flashcards generated" },
              { val: 95, suffix: "%", label: "Better retention" },
              { val: 10, suffix: "s", label: "Notes to flashcards" },
              { val: 0, label: "Credit card required", display: "None" },
            ].map(({ val, suffix, label, display }, i) => (
              <motion.div key={label} variants={fadeUp} custom={i} initial="hidden" whileInView="visible"
                whileHover={{ scale: 1.03, y: -2 }} viewport={{ once: true }}
                className="p-5 rounded-2xl border border-white/5 bg-card/20 backdrop-blur-sm text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                  {display ?? <Counter to={val} suffix={suffix} />}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          HOW IT WORKS
      ══════════════════════════════ */}
      <section id="how" className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Simple process</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              From notes to exam-ready<br />in three steps
            </h2>
          </motion.div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-4">
            <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <Step n={1} icon={Upload} title="Upload your notes" desc="Paste text, drop a PDF, image, or share any URL — all work." delay={0} />
            <Step n={2} icon={Brain} title="AI generates your pack" desc="Summaries, flashcards, quizzes & exam predictions instantly." delay={1} />
            <Step n={3} icon={Trophy} title="Study & ace your exam" desc="Track mastery, get insights, and crush your weak areas." delay={2} />
          </div>
          <motion.div variants={fadeUp} custom={3} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3 mt-14">
            {[
              { icon: FileText, label: "PDF / Text" },
              { icon: Globe,    label: "Any URL" },
              { icon: Image,    label: "Photo / Image" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/8 bg-white/[0.03] text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />{label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURES
      ══════════════════════════════ */}
      <section id="features" className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">The complete study toolkit</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">One tool that replaces hours of manual study prep.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={Layers}   title="Smart Flashcards"  desc="AI generates front-back cards from your notes, then tracks confidence per card so you focus on what matters." accent="bg-gradient-to-br from-primary/10 to-primary/3"    delay={0} />
            <FeatureCard icon={Target}   title="Adaptive Quizzes"  desc="Multiple-choice questions built from your material. Scores tracked, weaknesses identified automatically."         accent="bg-gradient-to-br from-accent/10 to-accent/3"      delay={1} />
            <FeatureCard icon={Brain}    title="Exam Predictions"  desc="Based on your notes, Cluvi predicts the most likely exam questions so nothing catches you off guard."             accent="bg-gradient-to-br from-violet-500/10 to-violet-500/3" delay={2} />
            <FeatureCard icon={Zap}      title="AI Tutor"          desc="Ask anything about your material. The tutor knows your notes and gives targeted answers, not generic ones."       accent="bg-gradient-to-br from-amber-500/10 to-amber-500/3"  delay={3} />
            <FeatureCard icon={BookOpen} title="Works on Anything" desc="Paste text, submit a URL, or upload a PDF or image. Cluvi extracts and studies it all."                           accent="bg-gradient-to-br from-emerald-500/10 to-emerald-500/3" delay={4} />
            <FeatureCard icon={Sparkles} title="Timed Exam Mode"   desc="Simulate exam conditions with timed mock tests, topic-by-topic breakdowns, and improvement tracking."            accent="bg-gradient-to-br from-pink-500/10 to-pink-500/3"    delay={5} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FLASHCARD SHOWCASE
      ══════════════════════════════ */}
      <section className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Flashcards</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
                Study that actually<br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">sticks.</span>
              </h2>
              <p className="text-muted-foreground mb-7 leading-relaxed">
                Flip cards with a tap, rate your confidence, and let our spaced-repetition
                system surface the cards you need most. Keyboard shortcuts included.
              </p>
              <div className="space-y-3">
                {["Rate confidence per card", "Spaced repetition built-in", "Keyboard shortcuts", "Track mastery %"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* live demo */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="flex flex-col items-center gap-5">
              <div className="w-full max-w-sm aspect-[4/3] relative" style={{ perspective: "1200px" }}>
                <motion.div
                  animate={{ rotateX: flipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 180, damping: 22 }}
                  className="w-full h-full relative"
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="absolute inset-0 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer"
                    style={{ backfaceVisibility: "hidden" }}>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4 font-semibold">Question</p>
                    <p className="text-lg md:text-xl font-medium">{demoCards[cardIdx].front}</p>
                    <div className="absolute bottom-5 flex items-center gap-1.5 text-xs text-muted-foreground/40">
                      <RotateCw className="w-3 h-3" /> Tap to flip
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl shadow-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer"
                    style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>
                    <p className="text-xs text-primary uppercase tracking-widest mb-4 font-semibold">Answer</p>
                    <p className="text-base md:text-lg leading-relaxed">{demoCards[cardIdx].back}</p>
                  </div>
                </motion.div>
              </div>
              <div className="flex gap-2 w-full max-w-sm">
                {[
                  { label: "Again", c: "text-red-400 border-red-500/20 bg-red-500/5" },
                  { label: "Hard",  c: "text-orange-400 border-orange-500/20 bg-orange-500/5" },
                  { label: "Good",  c: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
                  { label: "Easy",  c: "text-green-400 border-green-500/20 bg-green-500/5" },
                ].map(({ label, c }) => (
                  <button key={label}
                    onClick={() => { setFlipped(false); setTimeout(() => setCardIdx((d) => (d + 1) % demoCards.length), 320); }}
                    className={`flex-1 py-2 text-xs font-medium rounded-xl border ${c} hover:opacity-90 transition-opacity`}>{label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/35">Interactive demo — click to flip</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          QUIZ SHOWCASE
      ══════════════════════════════ */}
      <section className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* quiz mockup */}
            <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="rounded-2xl border border-white/8 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl order-2 md:order-1">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium">Question 3 of 10</span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-mono text-primary">
                  <Timer className="w-3.5 h-3.5" /> 8:42
                </div>
              </div>
              <div className="p-5">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-5">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }} whileInView={{ width: "30%" }}
                    transition={{ delay: 0.4, duration: 1 }} viewport={{ once: true }} />
                </div>
                <p className="font-medium mb-4 text-sm md:text-base">Which organelle is responsible for protein synthesis?</p>
                <div className="space-y-2.5">
                  {[
                    { l: "A", t: "Mitochondria",    ok: false },
                    { l: "B", t: "Ribosome",        ok: true  },
                    { l: "C", t: "Golgi apparatus", ok: false },
                    { l: "D", t: "Lysosome",        ok: false },
                  ].map(({ l, t, ok }) => (
                    <div key={l} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${ok ? "border-green-500 bg-green-500/10 text-green-400" : "border-white/5 bg-white/[0.02]"}`}>
                      <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold shrink-0">{l}</span>
                      {t}
                      {ok && <Check className="w-4 h-4 ml-auto" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[70%] bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                  </div>
                  <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                    className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
                    +15 XP
                  </motion.span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="order-1 md:order-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Quizzes</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
                Make studying<br />
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">addictive.</span>
              </h2>
              <p className="text-muted-foreground mb-7 leading-relaxed">
                Timed quizzes with XP rewards, streak bonuses, and shareable score cards.
                The competitive edge you need to actually sit down and study.
              </p>
              <div className="space-y-3">
                {["Timed quiz mode", "Instant score + explanation", "XP & streak system", "Shareable score cards"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PRICING
      ══════════════════════════════ */}
      <section id="pricing" className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple, honest pricing</h2>
            <p className="text-muted-foreground text-lg">Pay for what you use. Start free — no card needed.</p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="relative rounded-2xl border border-white/8 bg-card/30 backdrop-blur-xl p-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/3 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-center mb-8">
                <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                  Credit-based — no subscription
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Summary",    cost: "1 credit" },
                  { label: "Flashcards", cost: "5 credits" },
                  { label: "Quiz",       cost: "3 credits" },
                ].map(({ label, cost }) => (
                  <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-muted-foreground text-xs mb-2">{label}</p>
                    <p className="font-bold">{cost}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mb-8">
                {["10 free credits on signup", "Buy more credits when you need them", "Credits never expire", "Instant generation — no queues"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-accent shrink-0" />{f}
                  </div>
                ))}
              </div>
              <Link href="/sign-up">
                <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold rounded-xl text-base">
                  Start with 10 free credits
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          FINAL CTA
      ══════════════════════════════ */}
      <section className="py-32 px-5 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent pointer-events-none" />
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Ready to study<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">smarter?</span>
          </h2>
          <p className="text-muted-foreground text-xl mb-10 leading-relaxed">
            Join students who've stopped re-reading notes and started actually retaining them.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-10 bg-white text-black hover:bg-white/90 rounded-full text-lg font-bold group shadow-2xl shadow-white/10">
              Get started — it's free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="border-t border-white/[0.04] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5 font-semibold text-foreground">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            Cluvi
          </div>
          <p className="text-muted-foreground/50 text-xs">AI-powered studying. Study smarter, not harder.</p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-foreground transition-colors">Sign up free</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
