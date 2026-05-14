import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout";
import {
  Users, Plus, Hash, Lock, Globe, Send, ArrowLeft,
  MessageSquare, Loader2, Crown, Zap, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/react";

const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface Room {
  id: number;
  name: string;
  topic: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  isMember: boolean;
  createdAt: string;
}

interface RoomMessage {
  id: number;
  content: string;
  created_at: string;
  display_name: string | null;
  clerk_id: string;
  xp: number;
  level: number;
}

interface RoomDetail extends Room {
  messages: RoomMessage[];
}

const TOPICS = ["General", "Math", "Biology", "Chemistry", "Physics", "History", "Literature", "CS", "Economics", "Exam Prep"];

function getLevelBadge(level: number) {
  if (level >= 20) return { label: "Legend", color: "text-yellow-400" };
  if (level >= 10) return { label: "Expert", color: "text-purple-400" };
  if (level >= 5) return { label: "Scholar", color: "text-blue-400" };
  return { label: "Student", color: "text-muted-foreground" };
}

function RoomCard({ room, onSelect, onJoin }: { room: Room; onSelect: (r: Room) => void; onJoin: (r: Room) => void }) {
  const topicColors: Record<string, string> = {
    Math: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Biology: "bg-green-500/10 text-green-400 border-green-500/20",
    Chemistry: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Physics: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    CS: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Exam Prep": "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const topicColor = topicColors[room.topic] ?? "bg-white/5 text-muted-foreground border-white/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 bg-card/40 hover:border-white/10 hover:bg-white/[0.04] transition-all p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {room.isPublic ? <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className="font-semibold text-sm truncate">{room.name}</span>
          </div>
          {room.description && <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${topicColor}`}>{room.topic}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.memberCount} members</span>
      </div>
      <div className="flex gap-2">
        {room.isMember ? (
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => onSelect(room)}>
            <MessageSquare className="w-3 h-3 mr-1.5" /> Open
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => onJoin(room)}>
              Join
            </Button>
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => { onJoin(room); }}>
              <MessageSquare className="w-3 h-3 mr-1.5" /> Join & Chat
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function ChatView({ room, onBack }: { room: RoomDetail; onBack: () => void }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<RoomMessage[]>(room.messages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE()}/api/rooms/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json() as RoomMessage;
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-card/50 backdrop-blur shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{room.name}</p>
            <p className="text-xs text-muted-foreground">{room.topic} · {room.memberCount} members</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No messages yet. Be the first!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.clerk_id === user?.id;
          const badge = getLevelBadge(msg.level);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${isOwn ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                {(msg.display_name ?? msg.clerk_id).charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{msg.display_name ?? "Anonymous"}</span>
                  <span className={`text-[10px] ${badge.color}`}>Lvl {msg.level}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                </div>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isOwn ? "bg-primary/20 text-foreground rounded-tr-sm" : "bg-white/5 text-foreground rounded-tl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5 bg-card/50 shrink-0">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the room…"
            maxLength={2000}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 focus:bg-white/8 transition-all placeholder:text-muted-foreground"
          />
          <Button size="icon" className="h-10 w-10 rounded-xl" onClick={sendMessage} disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Room) => void }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("General");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE()}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), topic, description: description.trim() || undefined, isPublic }),
      });
      if (res.ok) {
        const room = await res.json() as Room;
        onCreated({ ...room, isMember: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-card/95 backdrop-blur p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold">Create Study Room</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Start a space to discuss and share study material</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Room name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bio Exam Crew"
              maxLength={60}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all"
            >
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you study here?"
              maxLength={200}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${isPublic ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/8"}`}
            >
              <Globe className="w-4 h-4" /> Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${!isPublic ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/8"}`}
            >
              <Lock className="w-4 h-4" /> Private
            </button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white border-0" onClick={create} disabled={!name.trim() || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Room"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  async function loadRooms() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE()}/api/rooms`);
      if (res.ok) setRooms(await res.json() as Room[]);
    } finally {
      setLoading(false);
    }
  }

  async function openRoom(room: Room) {
    const res = await fetch(`${BASE()}/api/rooms/${room.id}`);
    if (res.ok) setSelectedRoom(await res.json() as RoomDetail);
  }

  async function joinRoom(room: Room) {
    const res = await fetch(`${BASE()}/api/rooms/${room.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, isMember: true, memberCount: r.memberCount + 1 } : r));
      const detail = await fetch(`${BASE()}/api/rooms/${room.id}`);
      if (detail.ok) setSelectedRoom(await detail.json() as RoomDetail);
    }
  }

  useEffect(() => { loadRooms(); }, []);

  const filtered = rooms.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.topic.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedRoom) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full">
          <ChatView room={selectedRoom} onBack={() => setSelectedRoom(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Study Rooms</h1>
            <p className="text-muted-foreground mt-0.5">Join public rooms to chat and share study material</p>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-accent text-white border-0 rounded-xl font-semibold"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-2 w-4 h-4" /> Create Room
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms by name or topic…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 rounded-2xl border border-dashed border-white/8"
          >
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-medium mb-1">{search ? "No rooms match your search" : "No rooms yet"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "Try a different search term" : "Create the first study room!"}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Room
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} onSelect={openRoom} onJoin={joinRoom} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreated={(room) => {
              setRooms((prev) => [room, ...prev]);
              setShowCreate(false);
              openRoom(room);
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
