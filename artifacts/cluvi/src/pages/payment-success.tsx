import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, ArrowRight, Loader2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 60_000;

export default function PaymentSuccess() {
  const queryClient = useQueryClient();
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });

  const initialCreditsRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const [credited, setCredited] = useState(false);
  const [newCredits, setNewCredits] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [polling, setPolling] = useState(true);

  // Capture initial credit balance once profile loads
  useEffect(() => {
    if (profile && initialCreditsRef.current === null) {
      initialCreditsRef.current = profile.credits;
    }
  }, [profile]);

  // Detect when credits have arrived
  useEffect(() => {
    if (!profile || initialCreditsRef.current === null || credited) return;
    if (profile.credits > initialCreditsRef.current) {
      setCredited(true);
      setNewCredits(profile.credits);
      setPolling(false);
    }
  }, [profile, credited]);

  const poll = useCallback(async () => {
    if (!polling || credited) return;
    if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
      setPolling(false);
      setTimedOut(true);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
  }, [polling, credited, queryClient]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [polling, poll]);

  const creditsAdded = credited && newCredits !== null && initialCreditsRef.current !== null
    ? newCredits - initialCreditsRef.current
    : null;

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold tracking-tight">Payment successful!</h1>
            <p className="text-muted-foreground">
              Your payment was confirmed. Credits will be added once the payment is verified.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-2xl border border-white/8 bg-card/40 p-6"
          >
            <AnimatePresence mode="wait">
              {credited && creditsAdded !== null ? (
                <motion.div
                  key="credited"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-center gap-2 text-accent">
                    <Zap className="w-5 h-5 fill-accent" />
                    <span className="text-2xl font-bold">+{creditsAdded} credits added!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    New balance: <span className="font-semibold text-foreground">{newCredits} credits</span>
                  </p>
                </motion.div>
              ) : timedOut ? (
                <motion.div
                  key="timeout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Credits are on their way</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Payment confirmed but credits haven't arrived yet. They'll appear in your account automatically within a few minutes. If they don't, contact support with your order ID.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-white/10"
                    onClick={() => {
                      setTimedOut(false);
                      setPolling(true);
                      startTimeRef.current = Date.now();
                    }}
                  >
                    Check again
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="polling"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Waiting for payment confirmation…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/upload">
              <Button className="bg-gradient-to-r from-primary to-accent text-white border-0 w-full sm:w-auto">
                Start studying
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto border-white/10 hover:bg-white/5">
                Go to dashboard
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}
