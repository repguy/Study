import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useGetUserProfile, useUpdateUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function Section({ title, subtitle, children, delay }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay ?? 0}
      initial="hidden"
      animate="visible"
      className="rounded-2xl bg-card/40 border border-white/5 p-6 space-y-5"
    >
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { data: profile, isLoading, refetch } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const updateProfile = useUpdateUserProfile();

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName ?? "");
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: { displayName } }, {
      onSuccess: () => { toast({ title: "Profile updated" }); refetch(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-muted-foreground">Profile and API keys.</p>
        </div>

        <Section title="Credits" delay={0}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold" data-testid="credits-balance">{profile?.credits ?? 0} credits remaining</p>
                <p className="text-xs text-muted-foreground">Used per study pack</p>
              </div>
            </div>
            <a href="/upgrade">
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0">
                Buy more
              </Button>
            </a>
          </div>
        </Section>

        <Section title="Profile" delay={1}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{profile?.displayName || "No display name set"}</p>
              <p className="text-xs text-muted-foreground">Level {profile?.level ?? 1} &bull; {profile?.xp ?? 0} XP</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-card/40 border-white/8"
              data-testid="input-display-name"
            />
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full" data-testid="button-save-profile">
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
            </Button>
          </div>
        </Section>

      </div>
    </AppLayout>
  );
}
