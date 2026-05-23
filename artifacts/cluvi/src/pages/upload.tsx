import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { useCreateStudyPack } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brain, FileText, Link2, Image, Loader2, Zap, AlertCircle, Check } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type SourceType = "text" | "url" | "pdf" | "image";

interface GenerateOptions {
  summary: boolean;
  flashcards: boolean;
  quiz: boolean;
  examPredictions: boolean;
}

const TABS: { id: SourceType; label: string; icon: React.ElementType }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "url", label: "URL", icon: Link2 },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "image", label: "Image", icon: Image },
];

const GENERATION_OPTIONS: {
  key: keyof GenerateOptions;
  label: string;
  desc: string;
  cost: number;
  color: string;
}[] = [
  { key: "summary", label: "Summary & Key Concepts", desc: "AI overview with important terms", cost: 2, color: "primary" },
  { key: "flashcards", label: "Flashcards", desc: "10–15 study cards for memorization", cost: 3, color: "accent" },
  { key: "quiz", label: "Quiz Questions", desc: "5–8 multiple-choice questions", cost: 3, color: "yellow" },
  { key: "examPredictions", label: "Exam Predictions", desc: "Likely exam topics and questions", cost: 1, color: "green" },
];

function calcCost(opts: GenerateOptions): number {
  let cost = 0;
  if (opts.summary) cost += 2;
  if (opts.flashcards) cost += 3;
  if (opts.quiz) cost += 3;
  if (opts.examPredictions && !opts.summary) cost += 1;
  return Math.max(2, cost);
}

const LOADING_STEPS = [
  "Analyzing content…",
  "Extracting key concepts…",
  "Building flashcards…",
  "Crafting quiz questions…",
  "Almost done…",
];

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<SourceType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [generate, setGenerate] = useState<GenerateOptions>({
    summary: true,
    flashcards: true,
    quiz: true,
    examPredictions: true,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const createPack = useCreateStudyPack();

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const credits = profile?.credits ?? 0;
  const creditCost = calcCost(generate);
  const hasEnoughCredits = credits >= creditCost;
  const hasSelection = Object.values(generate).some(Boolean);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (tab === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setContent(result.split(",")[1] ?? result);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => setContent(reader.result as string);
      reader.readAsText(file);
    }
  };

  const getActiveContent = () => {
    if (tab === "url") return url;
    return content;
  };

  const isReady = !!title.trim() && !!getActiveContent().trim() && hasSelection;

  const handleCreate = () => {
    if (!isReady || !hasEnoughCredits) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_STEPS.length - 1);
      setStepIndex(idx);
    }, 3500);

    createPack.mutate(
      { data: { title: title.trim(), sourceType: tab, content: getActiveContent(), generate } },
      {
        onSuccess: (pack) => { clearInterval(interval); setLocation(`/pack/${pack.id}`); },
        onError: (err: unknown) => {
          clearInterval(interval);
          const msg = (err as { message?: string })?.message ?? "Failed to create pack";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const toggleOption = (key: keyof GenerateOptions) => {
    setGenerate((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (createPack.isPending) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[70vh] gap-8">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center"
            >
              <Brain className="w-10 h-10 text-primary" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
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
                className="text-xl font-bold"
              >
                {LOADING_STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
            <p className="text-muted-foreground text-sm">AI is generating your personalized study material</p>
          </div>

          <div className="flex gap-5 text-xs text-muted-foreground flex-wrap justify-center">
            {[
              generate.summary && "Summary",
              generate.flashcards && "Flashcards",
              generate.quiz && "Quiz",
              generate.examPredictions && "Predictions",
            ].filter(Boolean).map((item, i) => (
              <motion.div
                key={String(item)}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">New study pack</h1>
          <p className="text-muted-foreground">Add your material and let AI do the rest.</p>
        </div>

        {!hasEnoughCredits && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>You need {creditCost} credits for this selection. You have {credits}.</span>
            <a href="/upgrade" className="ml-auto text-primary underline-offset-2 hover:underline shrink-0">Get credits</a>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pack title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Cellular Respiration"
              className="h-12 bg-card/40 border-white/8 focus:border-primary/50 text-base"
              data-testid="input-title"
            />
          </div>

          {/* Source tabs */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source material</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 rounded-xl bg-card/40 border border-white/5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setContent(""); setUrl(""); setFileName(""); }}
                  className={`flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium transition-all ${
                    tab === id
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  data-testid={`tab-${id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "text" && (
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your notes, lecture transcript, or any text…"
                    className="min-h-[220px] bg-card/40 border-white/8 focus:border-primary/50 resize-none text-sm"
                    data-testid="textarea-content"
                  />
                )}
                {tab === "url" && (
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/…"
                    className="h-12 bg-card/40 border-white/8 focus:border-primary/50 text-base"
                    data-testid="input-url"
                  />
                )}
                {(tab === "pdf" || tab === "image") && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="min-h-[160px] rounded-xl border-2 border-dashed border-white/8 hover:border-primary/40 bg-card/20 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
                    data-testid="drop-file"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept={tab === "pdf" ? ".pdf,.txt" : "image/*"}
                      onChange={handleFile}
                      className="hidden"
                    />
                    {fileName ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium">{fileName}</p>
                        <p className="text-xs text-muted-foreground">Click to change</p>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          {tab === "image"
                            ? <Image className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            : <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click to upload {tab === "pdf" ? "a PDF or text file" : "an image"}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Generation options */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What to generate</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GENERATION_OPTIONS.map(({ key, label, desc, cost }) => {
                const isOn = generate[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleOption(key)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isOn
                        ? "border-primary/35 bg-primary/8"
                        : "border-white/5 bg-card/20 hover:border-white/10"
                    }`}
                    data-testid={`gen-option-${key}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isOn ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {isOn && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isOn ? "text-foreground" : "text-muted-foreground"}`}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums shrink-0 mt-0.5 ${isOn ? "text-primary" : "text-muted-foreground/50"}`}>
                      {cost}cr
                    </span>
                  </button>
                );
              })}
            </div>
            {!hasSelection && (
              <p className="text-xs text-destructive">Select at least one option to generate.</p>
            )}
          </div>

          {/* Cost + Submit */}
          <div className="flex items-center justify-between pt-1 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-accent shrink-0" />
              <span>
                Costs <span className="text-foreground font-semibold">{creditCost} credits</span>
                {" "}&mdash; you have {credits}
              </span>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!isReady || !hasEnoughCredits || createPack.isPending}
              className="h-11 px-8 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shrink-0"
              data-testid="button-create"
            >
              {createPack.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate pack"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
