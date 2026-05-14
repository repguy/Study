import { useGetStudyPack, useGenerateStudyPackContent } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, CheckCircle2, Play, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PackDetail() {
  const [, params] = useRoute("/pack/:id");
  const id = Number(params?.id);

  const { data: pack, isLoading } = useGetStudyPack(id, {
    query: {
      enabled: !!id,
      queryKey: ["/api/study-packs", id],
    }
  });

  const generateContent = useGenerateStudyPackContent();

  const handleGenerate = () => {
    generateContent.mutate({ id }, {
      // Invalidate query to refresh data
    });
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

  if (!pack) return null;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={pack.status === "ready" ? "default" : "secondary"}>
                {pack.status}
              </Badge>
              {pack.isPro && (
                <Badge className="bg-gradient-to-r from-primary to-accent">PRO</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{pack.title}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{pack.summary}</p>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/flashcards/${pack.id}`}>
              <Button className="bg-white text-black hover:bg-white/90">
                <Layers className="mr-2 w-4 h-4" />
                Study Flashcards
              </Button>
            </Link>
            <Link href={`/quiz/${pack.id}`}>
              <Button className="bg-gradient-to-r from-primary to-accent text-white">
                <Play className="mr-2 w-4 h-4" />
                Take Quiz
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-card/40 backdrop-blur border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Key Concepts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pack.keyConcepts?.map((concept, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">{concept}</span>
                  </li>
                ))}
              </ul>
              {(!pack.keyConcepts || pack.keyConcepts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No concepts generated yet.
                  {pack.status !== "processing" && (
                    <Button variant="link" onClick={handleGenerate} className="block mx-auto mt-2">
                      Generate Content
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-card/40 backdrop-blur border-white/5">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Pack Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Flashcards</span>
                    <span className="font-bold">{pack.flashcardCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Quiz Questions</span>
                    <span className="font-bold">{pack.quizCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mastery</span>
                    <span className="font-bold text-accent">{pack.studyStrength}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
