import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Zap, Target, BookOpen, Layers, Sparkles, ChevronRight, Check } from "lucide-react";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

function Feature({ icon: Icon, title, desc, delay }: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={n * 0.5}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="flex items-start gap-4"
    >
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-primary">{n}</span>
      </div>
      <p className="text-muted-foreground pt-1">{text}</p>
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-0 w-[600px] h-[500px] bg-accent/6 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Cluvi
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-signin">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-5" data-testid="nav-signup">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-36 pb-24 px-6">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm text-muted-foreground mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            AI-powered studying that actually works
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
            className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            Turn any notes into
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              exam-ready material.
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Paste your lecture notes, upload a PDF, or drop a URL. Cluvi generates flashcards, quizzes, and exam predictions using AI — in seconds.
          </motion.p>
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-3"
          >
            <Link href="/sign-up">
              <Button size="lg" className="h-13 px-8 bg-white text-black hover:bg-white/90 rounded-full text-base font-semibold group" data-testid="hero-cta-primary">
                Start studying free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="h-13 px-8 rounded-full text-base border-white/10 hover:bg-white/5" data-testid="hero-cta-secondary">
                Sign in
              </Button>
            </Link>
          </motion.div>
          <motion.p
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="visible"
            className="mt-4 text-sm text-muted-foreground"
          >
            10 free credits on signup. No card required.
          </motion.p>
        </motion.div>

        {/* Hero UI mock */}
        <motion.div
          variants={fadeUp}
          custom={5}
          initial="hidden"
          animate="visible"
          className="mt-20 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-white/8 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-3 text-xs text-muted-foreground">cluvi.app/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: "Flashcards", val: "24", color: "text-primary" },
                { label: "Quiz score", val: "87%", color: "text-accent" },
                { label: "Study streak", val: "7 days", color: "text-orange-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{val}</p>
                </div>
              ))}
              <div className="col-span-3 rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <p className="text-xs text-muted-foreground mb-2">Current pack: Cellular Respiration</p>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "68%" }}
                    transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">68% mastery</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to ace your exams</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">One tool that replaces hours of manual study prep.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Feature icon={Layers} title="Smart flashcards" desc="AI generates front-back cards from your notes, then tracks your confidence per card so you focus on what matters." delay={0} />
            <Feature icon={Target} title="Adaptive quizzes" desc="Multiple-choice questions built from your material. Scores tracked, weaknesses identified." delay={1} />
            <Feature icon={Brain} title="Exam predictions" desc="Based on your notes, Cluvi predicts the most likely exam questions so nothing catches you off guard." delay={2} />
            <Feature icon={Zap} title="AI Tutor" desc="Ask anything about your material. The AI tutor knows your notes and gives targeted answers, not generic ones." delay={3} />
            <Feature icon={BookOpen} title="Works on anything" desc="Paste text, submit a URL, or upload a PDF or image. Cluvi extracts and studies it all." delay={4} />
            <Feature icon={Sparkles} title="Built for speed" desc="From paste to flashcards in under 10 seconds. No friction, no uploads, no waiting rooms." delay={5} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">From notes to exam-ready in three steps</h2>
          </motion.div>
          <div className="space-y-8">
            <Step n={1} text="Paste your notes, lecture transcript, or any URL. PDFs and images work too." />
            <Step n={2} text="Cluvi's AI reads, summarizes, and generates flashcards, quiz questions, and exam predictions." />
            <Step n={3} text="Study with 3D flashcards, take quizzes, track your mastery, and use the AI tutor for the gaps." />
          </div>
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { val: "10s", label: "From notes to flashcards" },
              { val: "10+", label: "AI-generated flashcards per pack" },
              { val: "Free", label: "To get started" },
            ].map(({ val, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                custom={0}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <p className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">{val}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / credit model */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Simple, honest pricing</h2>
            <p className="text-muted-foreground mb-12 text-lg">Pay for what you use. Start free — no card needed.</p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl border border-white/8 bg-card/30 backdrop-blur-xl p-8"
          >
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                Credit-based — no subscription
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Summary", cost: "1 credit" },
                { label: "Flashcards", cost: "5 credits" },
                { label: "Quiz", cost: "3 credits" },
              ].map(({ label, cost }) => (
                <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-muted-foreground text-sm mb-1">{label}</p>
                  <p className="font-bold text-foreground">{cost}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-left mb-8">
              {["10 free credits on signup", "Buy more credits when you need them", "Credits never expire", "Instant generation — no queues"].map((f) => (
                <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/sign-up">
              <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-semibold rounded-xl" data-testid="pricing-cta">
                Start with 10 free credits
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/5">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-5xl font-bold tracking-tight mb-4">
            Ready to study smarter?
          </h2>
          <p className="text-muted-foreground text-xl mb-10">
            Join students who've stopped re-reading notes and started actually retaining them.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-10 bg-white text-black hover:bg-white/90 rounded-full text-lg font-semibold group" data-testid="footer-cta">
              Get started — it's free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Zap className="w-4 h-4 text-primary" />
            Cluvi
          </div>
          <p>AI-powered studying.</p>
        </div>
      </footer>
    </div>
  );
}
