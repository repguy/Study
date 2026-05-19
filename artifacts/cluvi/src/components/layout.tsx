import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  PlusCircle,
  MessageSquare,
  Settings,
  LogOut,
  Zap,
  Menu,
  AlertTriangle,
  Users,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "New Pack", icon: PlusCircle },
  { href: "/rooms", label: "Study Rooms", icon: Users },
  { href: "/tutor", label: "AI Tutor", icon: MessageSquare },
];

const BOTTOM_LINKS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

function CreditsChip({ credits }: { credits: number | undefined }) {
  const isLow = (credits ?? 0) < 5;
  const isEmpty = (credits ?? 0) === 0;

  return (
    <Link href="/upgrade">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
          isEmpty
            ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/15"
            : isLow
            ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15"
            : "bg-primary/5 border-primary/10 hover:bg-primary/10"
        }`}
        data-testid="credits-chip"
      >
        {isLow ? (
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isEmpty ? "text-red-400" : "text-orange-400"}`} />
        ) : (
          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-none ${isEmpty ? "text-red-400" : isLow ? "text-orange-400" : "text-primary"}`}>
            {credits === undefined ? "..." : `${credits} credits`}
          </p>
          {isLow && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Tap to buy more</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const { data: profile } = useGetUserProfile({
    query: {
      enabled: !!user,
      queryKey: getGetUserProfileQueryKey(),
    }
  });

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-card/50 backdrop-blur-xl border-r border-white/5">
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/dashboard">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight" data-testid="sidebar-logo">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span>Cluvi</span>
          </div>
        </Link>
      </div>

      {/* Credits chip */}
      <div className="px-4 pb-3">
        <CreditsChip credits={profile?.credits} />
      </div>

      {/* Upgrade */}
      <div className="px-4 pb-3">
        <Link href="/upgrade">
          <Button
            className="w-full h-9 bg-gradient-to-r from-primary to-accent text-white border-0 text-sm font-semibold justify-start"
            size="sm"
            data-testid="nav-upgrade"
          >
            <Zap className="w-3.5 h-3.5 mr-2" />
            Buy credits
          </Button>
        </Link>
      </div>

      <div className="px-3 pt-1 pb-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2">Navigation</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || location.startsWith(link.href + "/");
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start h-9 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <Icon className="mr-2.5 h-4 w-4" />
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 pt-2 space-y-0.5 border-t border-white/5">
        {BOTTOM_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start h-9 text-sm ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                <Icon className="mr-2.5 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}

        {/* User info */}
        <div className="flex items-center gap-2.5 px-2 py-2 mt-1">
          <Avatar className="h-8 w-8 border border-white/10 shrink-0">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user?.firstName?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.fullName ?? "Anonymous"}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              Lvl {profile?.level ?? 1} &bull; {profile?.xp ?? 0} XP
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => signOut()}
            data-testid="button-signout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-60 h-full shrink-0 z-10">
        <SidebarContent />
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-card/50 backdrop-blur-xl">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Cluvi
          </div>
          <div className="flex items-center gap-2">
            <CreditsChip credits={profile?.credits} />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 border-r-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
