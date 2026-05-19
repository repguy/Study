import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useListGeminiConversations, 
  useCreateGeminiConversation,
  useGetGeminiConversation
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Send, Brain, Bot, User } from "lucide-react";
import { format } from "date-fns";

export default function Tutor() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: conversations, refetch: refetchConversations } = useListGeminiConversations({
    query: { queryKey: ["/api/gemini/conversations"] }
  });

  const { data: conversation, refetch: refetchChat } = useGetGeminiConversation(activeId!, {
    query: {
      enabled: !!activeId,
      queryKey: ["/api/gemini/conversations", activeId]
    }
  });

  const createChat = useCreateGeminiConversation();

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingMessage]);

  const handleNewChat = () => {
    createChat.mutate({
      data: { title: "New Study Session" }
    }, {
      onSuccess: (chat) => {
        setActiveId(chat.id);
        refetchConversations();
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId) return;
    
    const userMsg = input.trim();
    setInput("");
    setStreamingMessage("...");

    try {
      // Optimistic update would go here
      const res = await fetch(`/api/gemini/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg })
      });
      
      if (!res.ok) throw new Error("Failed to send");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      setStreamingMessage("");
      
      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                isDone = true;
              } else if (data.content) {
                setStreamingMessage(prev => prev + data.content);
              }
            }
          }
        }
      }
      
      // Clear stream and refresh chat
      setStreamingMessage("");
      refetchChat();
      
    } catch (e) {
      console.error(e);
      setStreamingMessage("");
      // Error handling
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] md:h-screen">
        {/* Sidebar */}
        <div className="w-72 border-r border-border/50 bg-card/30 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <Button onClick={handleNewChat} className="w-full justify-start" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {conversations?.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveId(chat.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors text-sm truncate ${
                    activeId === chat.id 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'hover:bg-white/5 text-muted-foreground'
                  }`}
                >
                  {chat.title}
                  <div className="text-[10px] opacity-50 mt-1">
                    {format(new Date(chat.createdAt), "MMM d, h:mm a")}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
          
          {activeId && conversation ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
                {conversation.messages?.length === 0 && !streamingMessage && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <Brain className="w-16 h-16 mb-4" />
                    <h3 className="text-xl font-medium">Cluvi AI Tutor</h3>
                    <p className="text-sm mt-2 max-w-sm">Ask me anything about your study packs, concepts, or past quiz mistakes.</p>
                  </div>
                )}
                
                {conversation.messages?.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    }`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-card/60 backdrop-blur border border-white/5 rounded-tl-sm prose prose-invert"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {streamingMessage && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl max-w-[80%] bg-card/60 backdrop-blur border border-accent/20 rounded-tl-sm prose prose-invert">
                      {streamingMessage === "..." ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : streamingMessage}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t border-white/5">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="max-w-4xl mx-auto relative flex items-center"
                >
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about a concept..."
                    className="pr-12 h-14 rounded-2xl bg-card/60 border-white/10 focus-visible:ring-primary/50 text-base shadow-xl"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim() || !!streamingMessage}
                    className="absolute right-2 h-10 w-10 rounded-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-50">
              Select or create a chat to begin.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
