import { AppLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { CreditCard, Zap, TrendingUp, ShoppingCart, Minus, RotateCcw, Gift, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: number;
  type: "purchase" | "spend" | "refund" | "bonus";
  credits: number;
  description: string;
  createdAt: string;
}

const TYPE_CONFIG = {
  purchase: { icon: ShoppingCart, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Purchase" },
  spend: { icon: Minus, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Used" },
  refund: { icon: RotateCcw, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Refund" },
  bonus: { icon: Gift, color: "text-accent", bg: "bg-accent/10 border-accent/20", label: "Bonus" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-white/5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-2.5 bg-white/5 rounded w-1/4" />
      </div>
      <div className="h-4 bg-white/5 rounded w-16" />
    </div>
  );
}

export default function Payments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  useEffect(() => {
    fetch(`${BASE}/api/payments/history`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [BASE]);

  const totalPurchased = transactions.filter((t) => t.type === "purchase" || t.type === "bonus").reduce((s, t) => s + t.credits, 0);
  const totalSpent = transactions.filter((t) => t.type === "spend").reduce((s, t) => s + Math.abs(t.credits), 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-10 max-w-3xl mx-auto space-y-8">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Credit history</h1>
          <p className="text-muted-foreground">Every credit earned, purchased, and spent.</p>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card/40 border border-green-500/15 space-y-1">
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total earned</span>
            </div>
            <p className="text-2xl font-bold">{loading ? "—" : totalPurchased}</p>
            <p className="text-xs text-muted-foreground">credits received</p>
          </div>
          <div className="p-4 rounded-2xl bg-card/40 border border-primary/15 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total used</span>
            </div>
            <p className="text-2xl font-bold">{loading ? "—" : totalSpent}</p>
            <p className="text-xs text-muted-foreground">credits consumed</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Transactions</h2>
            <Link href="/upgrade">
              <Button size="sm" variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 h-8 text-xs">
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Buy credits
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl bg-card/40 border border-white/5 overflow-hidden">
            {loading ? (
              <div className="divide-y divide-white/5">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your credit history will appear here after your first purchase or pack creation.</p>
                </div>
                <Link href="/upgrade">
                  <Button className="mt-2 bg-gradient-to-r from-primary to-accent text-white border-0">
                    Get credits
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx, i) => {
                  const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.spend;
                  const Icon = cfg.icon;
                  const isPositive = tx.credits > 0;
                  return (
                    <motion.div
                      key={tx.id}
                      variants={fadeUp}
                      custom={i * 0.3}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-3 md:gap-4 p-4 hover:bg-white/2 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {cfg.label} · {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${isPositive ? "text-green-400" : "text-muted-foreground"}`}>
                        {isPositive ? "+" : ""}{tx.credits}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
