import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { useGetQuizQuestions, useSubmitQuizResult } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Quiz() {
  const [, params] = useRoute("/quiz/:id");
  const packId = Number(params?.id);

  const { data: questions, isLoading } = useGetQuizQuestions(packId, {
    query: {
      queryKey: ["/api/quiz-questions", packId],
      enabled: !!packId
    }
  });

  const submitQuiz = useSubmitQuizResult();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{questionId: number, selectedAnswer: number}[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const currentQuestion = questions?.[currentIndex];
  const progress = questions?.length ? (currentIndex / questions.length) * 100 : 0;

  useEffect(() => {
    if (quizCompleted || !questions) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizCompleted, questions]);

  const finishQuiz = useCallback(() => {
    if (quizCompleted) return;
    setQuizCompleted(true);
    
    submitQuiz.mutate({
      id: packId,
      data: {
        answers,
        timeTakenSeconds: 600 - timeRemaining
      }
    }, {
      onSuccess: (res) => {
        setResult(res);
      }
    });
  }, [answers, timeRemaining, submitQuiz, quizCompleted]);

  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    
    setSelectedOption(index);
    setShowExplanation(true);
    
    const newAnswers = [...answers, {
      questionId: currentQuestion!.id,
      selectedAnswer: index
    }];
    
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < (questions?.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

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
          <Link href={`/pack/${packId}`}>
            <Button>Back to Pack</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (quizCompleted) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto">
          {submitQuiz.isPending || !result ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Analyzing Results...</h2>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full"
            >
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(124,58,237,0.3)]">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-4xl font-bold mb-2">Quiz Complete!</h2>
                <p className="text-xl text-muted-foreground">You scored {result.score}%</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 rounded-2xl bg-card/40 border border-white/5 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Correct Answers</p>
                  <p className="text-3xl font-bold text-green-400">{result.correctCount} / {result.totalQuestions}</p>
                </div>
                <div className="p-6 rounded-2xl bg-card/40 border border-white/5 text-center">
                  <p className="text-sm text-muted-foreground mb-1">XP Earned</p>
                  <p className="text-3xl font-bold text-accent">+{result.xpEarned}</p>
                </div>
              </div>

              {result.weakAreas?.length > 0 && (
                <div className="mb-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/20">
                  <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Areas to Review
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {result.weakAreas.map((area: string, i: number) => (
                      <li key={i} className="text-foreground/80">{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Link href={`/pack/${packId}`}>
                  <Button className="h-12 px-8 bg-white text-black hover:bg-white/90 rounded-full">
                    Return to Pack
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </AppLayout>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen p-4 md:p-8 max-w-4xl mx-auto">
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
            <div className="flex items-center gap-2 text-lg font-mono bg-card/60 px-4 py-2 rounded-full border border-white/10">
              <Timer className="w-5 h-5 text-primary" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

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
                        <span>{option}</span>
                        {showAsCorrect && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                        {showAsWrong && <XCircle className="w-6 h-6 shrink-0" />}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-auto"
                >
                  <div className={`p-6 rounded-2xl border ${selectedOption === currentQuestion?.correctAnswer ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} mb-6`}>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      {selectedOption === currentQuestion?.correctAnswer ? (
                        <><CheckCircle2 className="w-5 h-5 text-green-400" /> Correct!</>
                      ) : (
                        <><XCircle className="w-5 h-5 text-red-400" /> Incorrect</>
                      )}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {currentQuestion?.explanation || "No explanation provided for this question."}
                    </p>
                  </div>

                  <Button 
                    className="w-full h-14 text-lg rounded-xl bg-primary text-white hover:bg-primary/90"
                    onClick={handleNext}
                  >
                    {currentIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
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
