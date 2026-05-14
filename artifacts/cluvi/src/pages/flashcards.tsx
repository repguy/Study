import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useListFlashcards, useRateFlashcardConfidence, getListFlashcardsQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RotateCw, Check, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Flashcards() {
  const [, params] = useRoute("/flashcards/:id");
  const packId = Number(params?.id);

  const { data: flashcards, isLoading } = useListFlashcards(packId, {
    query: {
      enabled: !!packId,
      queryKey: getListFlashcardsQueryKey(packId),
    }
  });

  const rateConfidence = useRateFlashcardConfidence();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentCard = flashcards?.[currentIndex];
  const progress = flashcards?.length ? (currentIndex / flashcards.length) * 100 : 0;

  const handleNext = useCallback((rating: number) => {
    if (!currentCard) return;
    rateConfidence.mutate({
      id: packId,
      cardId: currentCard.id,
      data: { confidence: rating }
    });
    if (currentIndex < (flashcards?.length || 0) - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      setCompleted(true);
    }
  }, [currentCard, currentIndex, flashcards?.length, rateConfidence, packId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || !currentCard) return;
      if (e.code === "Space") { e.preventDefault(); setIsFlipped(prev => !prev); }
      else if (isFlipped) {
        if (e.code === "Digit1") handleNext(1);
        else if (e.code === "Digit2") handleNext(2);
        else if (e.code === "Digit3") handleNext(3);
        else if (e.code === "Digit4") handleNext(4);
        else if (e.code === "Digit5") handleNext(5);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completed, currentCard, isFlipped, handleNext]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">No flashcards yet</h2>
          <p className="text-muted-foreground mb-6">Generate content for this pack first.</p>
          <Link href={`/pack/${packId}`}><Button>Back to Pack</Button></Link>
        </div>
      </AppLayout>
    );
  }

  if (completed) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6"
          >
            <Check className="w-12 h-12" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground mb-8 text-lg">Reviewed {flashcards.length} cards.</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => { setCurrentIndex(0); setCompleted(false); setIsFlipped(false); }}>
              Study Again
            </Button>
            <Link href={`/pack/${packId}`}><Button>Back to Pack</Button></Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/pack/${packId}`}>
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1 mx-8">
            <div className="flex justify-between text-sm mb-2 text-muted-foreground">
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <button
            onClick={() => navigator.share?.({ title: "Flashcards", url: window.location.href }).catch(() => navigator.clipboard.writeText(window.location.href))}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 relative flex items-center justify-center" style={{ perspective: "2000px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl aspect-[4/3] relative cursor-pointer group"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                animate={{ rotateX: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                className="w-full h-full relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-widest mb-6 font-semibold">Question</p>
                  <h3 className="text-2xl md:text-4xl font-medium leading-tight">{currentCard?.front}</h3>
                  <div className="absolute bottom-6 text-sm text-muted-foreground flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <RotateCw className="w-4 h-4" /> Click or Space to flip
                  </div>
                </div>
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl shadow-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
                >
                  <p className="text-sm text-primary uppercase tracking-widest mb-6 font-semibold">Answer</p>
                  <div className="text-xl md:text-2xl leading-relaxed">{currentCard?.back}</div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="h-24 mt-8 flex flex-col items-center justify-center">
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col items-center gap-3 w-full max-w-xl"
              >
                <p className="text-sm text-muted-foreground font-medium">How well did you know this?</p>
                <div className="flex gap-2 md:gap-3 w-full">
                  {[
                    { label: "Again", rating: 1, color: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" },
                    { label: "Hard", rating: 2, color: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20" },
                    { label: "Good", rating: 3, color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" },
                    { label: "Easy", rating: 4, color: "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20" },
                  ].map(({ label, rating, color }) => (
                    <Button
                      key={rating}
                      variant="outline"
                      className={`flex-1 h-12 ${color}`}
                      onClick={(e) => { e.stopPropagation(); handleNext(rating); }}
                    >
                      {label} <span className="ml-1 opacity-50">({rating})</span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
