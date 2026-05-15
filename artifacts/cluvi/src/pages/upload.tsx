import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { useCreateStudyPack } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brain, FileText, Link2, Image, Loader2, Zap, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type SourceType = "text" | "url" | "pdf" | "image";

const TABS: { id: SourceType; label: string; icon: React.ElementType }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "url", label: "URL", icon: Link2 },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "image", label: "Image", icon: Image },
];

const CREDIT_COST = 9;

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<SourceType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const createPack = useCreateStudyPack();

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const credits = profile?.credits ?? 0;
  const hasEnoughCredits = credits >= CREDIT_COST;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (tab === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data:...;base64, prefix
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

  const isReady = !!title.trim() && !!getActiveContent().trim();

  const handleCreate = () => {
    if (!isReady || !hasEnoughCredits) return;
    createPack.mutate(
      { data: { title: title.trim(), sourceType: tab, content: getActiveContent() } },
      {
        onSuccess: (pack) => setLocation(`/pack/${pack.id}`),
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? "Failed to create pack";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  };

  if (createPack.isPending) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            <Brain className="w-10 h-10 text-primary" />
          </motion.div>
          <div className="text-center space-y-2">
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl font-bold"
            >
              Generating your study pack...
            </motion.p>
            <p className="text-muted-foreground">Extracting concepts, building flashcards, crafting quiz questions.</p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            {["Summary", "Flashcards", "Quiz"].map((item, i) => (
              <motion.div
                key={item}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
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
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">New study pack</h1>
          <p className="text-muted-foreground">Add your material and let AI do the rest.</p>
        </div>

        {/* Credit warning */}
        {!hasEnoughCredits && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>You need {CREDIT_COST} credits to create a pack. You have {credits}.</span>
            <a href="/upgrade" className="ml-auto text-primary underline-offset-2 hover:underline shrink-0">Get credits</a>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pack title</label>
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
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Source material</label>
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
                    placeholder="Paste your notes, lecture transcript, or any text..."
                    className="min-h-[240px] bg-card/40 border-white/8 focus:border-primary/50 resize-none text-sm"
                    data-testid="textarea-content"
                  />
                )}
                {tab === "url" && (
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/..."
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
                          {tab === "image" ? <Image className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" /> : <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                        </div>
                        <p className="text-sm text-muted-foreground">Click to upload {tab === "pdf" ? "a PDF or text file" : "an image"}</p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cost + Submit */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-accent" />
              <span>Costs <span className="text-foreground font-semibold">{CREDIT_COST} credits</span> &mdash; you have {credits}</span>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!isReady || !hasEnoughCredits || createPack.isPending}
              className="h-11 px-8 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl"
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
