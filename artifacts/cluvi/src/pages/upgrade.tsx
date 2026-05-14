import { AppLayout } from "@/components/layout";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Zap, Check, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const PACKAGES = [
  { name: "Starter", credits: 50, highlight: false, badge: null },
  { name: "Pro", credits: 200, highlight: true, badge: "Best value" },
  { name: "Power", credits: 500, highlight: false, badge: null },
];

const PROVIDERS = [
  { name: "LemonSqueezy", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { name: "Polar", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { name: "Whop", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { name: "Gumroad", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
];

const WHAT_CREDITS_BUY = [
  { item: "1 credit", for: "AI summary generation" },
  { item: "5 credits", for: "Full flashcard set (10+ cards)" },
  { item: "3 credits", for: "Quiz question set (5+ questions)" },
  { item: "9 credits", for: "Complete study pack (all of the above)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function Upgrade() {
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const credits = profile?.credits ?? 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-12">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Get more credits
          </h1>
          <p className="text-muted-foreground text-lg">
            You have <span className="font-semibold text-foreground" data-testid="current-credits">{credits} credits</span> remaining.
            {credits < 10 && " Running low — top up to keep studying."}
          </p>
        </motion.div>

        {/* Current balance bar */}
        {credits > 0 && (
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Current balance: {credits} credits</p>
              <p className="text-xs text-muted-foreground">Enough for {Math.floor(credits / 9)} more study packs</p>
            </div>
            <Link href="/upload">
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0">
                Use them <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Packages */}
        <div>
          <motion.h2 variants={fadeUp} custom={2} initial="hidden" animate="visible" className="text-xl font-semibold mb-5">
            Credit packages
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PACKAGES.map((pkg, i) => (
              <motion.div
                key={pkg.name}
                variants={fadeUp}
                custom={i + 3}
                initial="hidden"
                animate="visible"
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                  pkg.highlight
                    ? "border-primary/40 bg-gradient-to-b from-primary/10 to-card/40 shadow-lg shadow-primary/10"
                    : "border-white/5 bg-card/40 hover:border-white/10"
                }`}
                data-testid={`package-${pkg.name.toLowerCase()}`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white shadow">
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{pkg.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">{pkg.credits}</span>
                    <span className="text-muted-foreground text-sm">credits</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{Math.floor(pkg.credits / 9)} study packs</p>
                </div>
                <div className="flex-1" />
                <Button
                  className={pkg.highlight ? "w-full bg-gradient-to-r from-primary to-accent text-white border-0" : "w-full"}
                  variant={pkg.highlight ? "default" : "outline"}
                  data-testid={`buy-${pkg.name.toLowerCase()}`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Buy {pkg.name}
                </Button>
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible" className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">Accepted via:</p>
            {PROVIDERS.map((p) => (
              <span
                key={p.name}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${p.bg} ${p.color}`}
                data-testid={`provider-${p.name.toLowerCase()}`}
              >
                {p.name}
              </span>
            ))}
          </motion.div>
        </div>

        {/* What credits buy */}
        <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible">
          <h2 className="text-xl font-semibold mb-5">What do credits buy?</h2>
          <div className="rounded-2xl bg-card/40 border border-white/5 divide-y divide-white/5">
            {WHAT_CREDITS_BUY.map(({ item, for: forWhat }) => (
              <div key={item} className="flex items-center justify-between px-6 py-4" data-testid={`credit-item-${item.replace(/ /g, "-")}`}>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-semibold text-sm">{item}</span>
                </div>
                <span className="text-sm text-muted-foreground">{forWhat}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">Credits never expire. Use them whenever you need them.</p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
