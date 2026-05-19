import { AppLayout } from "@/components/layout";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Zap, Check, CreditCard, ArrowRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useUser } from "@clerk/react";

const WHOP_STARTER_URL = import.meta.env.VITE_WHOP_STARTER_URL as string | undefined;
const WHOP_PRO_URL     = import.meta.env.VITE_WHOP_PRO_URL     as string | undefined;
const WHOP_POWER_URL   = import.meta.env.VITE_WHOP_POWER_URL   as string | undefined;

const PACKAGES = [
  { key: "starter", name: "Starter",  credits: 50,  highlight: false, badge: null,         baseUrl: WHOP_STARTER_URL },
  { key: "pro",     name: "Pro",      credits: 200, highlight: true,  badge: "Best value",  baseUrl: WHOP_PRO_URL     },
  { key: "power",   name: "Power",    credits: 500, highlight: false, badge: null,         baseUrl: WHOP_POWER_URL   },
];

const WHAT_CREDITS_BUY = [
  { item: "1 credit",  for: "AI summary generation" },
  { item: "5 credits", for: "Full flashcard set (10+ cards)" },
  { item: "3 credits", for: "Quiz question set (5+ questions)" },
  { item: "9 credits", for: "Complete study pack (all of the above)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

function buildWhopUrl(base: string, clerkId: string, pkg: string): string {
  const url = new URL(base);
  url.searchParams.set("metadata[clerk_id]", clerkId);
  url.searchParams.set("metadata[package]", pkg);
  return url.toString();
}

export default function Upgrade() {
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const { user } = useUser();
  const credits = profile?.credits ?? 0;
  const clerkId = user?.id ?? "";

  const whopConfigured = !!(WHOP_STARTER_URL && WHOP_PRO_URL && WHOP_POWER_URL);

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
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Credit packages</h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs font-semibold text-purple-400">Powered by Whop</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PACKAGES.map((pkg, i) => {
              const checkoutUrl = pkg.baseUrl && clerkId
                ? buildWhopUrl(pkg.baseUrl, clerkId, pkg.key)
                : pkg.baseUrl ?? null;

              return (
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
                  {checkoutUrl ? (
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button
                        className={`w-full ${pkg.highlight ? "bg-gradient-to-r from-primary to-accent text-white border-0" : ""}`}
                        variant={pkg.highlight ? "default" : "outline"}
                        data-testid={`buy-${pkg.name.toLowerCase()}`}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Buy {pkg.name}
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
                      </Button>
                    </a>
                  ) : (
                    <Button
                      className={`w-full ${pkg.highlight ? "bg-gradient-to-r from-primary to-accent text-white border-0" : ""}`}
                      variant={pkg.highlight ? "default" : "outline"}
                      disabled
                      data-testid={`buy-${pkg.name.toLowerCase()}`}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Coming soon
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {!whopConfigured && (
            <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible"
              className="mt-4 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-center">
              <p className="text-xs text-yellow-400">
                Whop checkout links not yet configured — set <code className="bg-yellow-500/10 px-1 rounded">VITE_WHOP_STARTER_URL</code>, <code className="bg-yellow-500/10 px-1 rounded">VITE_WHOP_PRO_URL</code>, and <code className="bg-yellow-500/10 px-1 rounded">VITE_WHOP_POWER_URL</code> in your environment.
              </p>
            </motion.div>
          )}
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
