import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useCreateStudyPack } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Brain, FileText, Loader2, UploadCloud } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Upload() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const createPack = useCreateStudyPack();

  const handleCreate = async () => {
    if (!title || !content) return;
    
    createPack.mutate({
      data: {
        title,
        content,
        sourceType: "text"
      }
    }, {
      onSuccess: (pack) => {
        setLocation(`/pack/${pack.id}`);
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">New Study Pack</h1>
          <p className="text-muted-foreground mt-2">Paste your notes, lecture transcript, or study material.</p>
        </div>

        {createPack.isPending ? (
          <Card className="bg-card/40 backdrop-blur border-white/5 py-24 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="w-16 h-16 text-primary" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Generating Magic...</h3>
                <p className="text-muted-foreground">Extracting concepts, building flashcards, and crafting quizzes.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pack Title</label>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4: Cellular Respiration" 
                className="bg-card/60"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Material</label>
              <Card className="bg-card/40 backdrop-blur border-dashed border-2 border-border overflow-hidden group hover:border-primary/50 transition-colors">
                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your notes here..."
                  className="min-h-[300px] bg-transparent border-0 resize-none focus-visible:ring-0 rounded-none"
                />
              </Card>
            </div>

            <Button 
              onClick={handleCreate}
              disabled={!title || !content}
              className="w-full h-12 text-lg bg-gradient-to-r from-primary to-accent text-white"
            >
              Generate Study Pack
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
