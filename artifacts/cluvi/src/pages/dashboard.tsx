import { useState } from "react";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { 
  Flame, 
  TrendingUp, 
  Brain, 
  Target, 
  BookOpen, 
  ArrowRight,
  PlusCircle,
  Zap,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: ["/api/study-packs/dashboard"],
    }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back.</h1>
            <p className="text-muted-foreground mt-1">You're on a {summary?.streak || 0}-day study streak. Keep it up.</p>
          </div>
          <Link href="/upload">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <PlusCircle className="mr-2 w-4 h-4" />
              New Study Pack
            </Button>
          </Link>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={item}>
            <Card className="bg-card/40 backdrop-blur border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Flame className="w-24 h-24 text-orange-500" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-bold">{summary?.streak || 0}</h3>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="bg-card/40 backdrop-blur border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24 text-primary" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Level {summary?.level || 1}</p>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold">{summary?.xp || 0} XP</h3>
                      <span className="text-xs text-muted-foreground">{summary?.xpToNextLevel || 0} to next</span>
                    </div>
                  </div>
                </div>
                <Progress value={((summary?.xp || 0) % 1000) / 10} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="bg-card/40 backdrop-blur border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain className="w-24 h-24 text-accent" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Study Strength</p>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-3xl font-bold">{summary?.studyStrength || 0}%</h3>
                    </div>
                  </div>
                </div>
                <Progress value={summary?.studyStrength || 0} className="h-2 bg-accent/20" indicatorClassName="bg-accent" />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Study Packs</h2>
              <Link href="/packs">
                <Button variant="ghost" className="text-muted-foreground">View all</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary?.recentPacks?.map((pack) => (
                <Link key={pack.id} href={`/pack/${pack.id}`}>
                  <Card className="bg-card/40 backdrop-blur border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="px-2 py-1 rounded text-xs font-medium bg-white/5 border border-white/10">
                          {pack.status}
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-1 truncate">{pack.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {pack.flashcardCount} cards • {pack.quizCount} questions
                      </p>
                      <Progress value={pack.studyStrength} className="h-1.5" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {(!summary?.recentPacks || summary.recentPacks.length === 0) && (
                <div className="col-span-2 p-8 text-center border border-dashed border-border rounded-xl">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium mb-1">No study packs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first pack to start studying</p>
                  <Link href="/upload">
                    <Button variant="secondary">Create Pack</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold">Weak Topics</h2>
            <Card className="bg-card/40 backdrop-blur border-white/5">
              <CardContent className="p-6 space-y-4">
                {summary?.weakTopics?.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium">{topic}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {(!summary?.weakTopics || summary.weakTopics.length === 0) && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No weak topics identified yet. Complete some quizzes!
                  </div>
                )}
              </CardContent>
            </Card>

            <Link href="/upgrade">
              <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-10 transition-opacity" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-lg">ExamPack Pro</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Unlock advanced AI predictions, unlimited cards, and detailed explanations.</p>
                  <Button className="w-full bg-white text-black hover:bg-white/90">
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
