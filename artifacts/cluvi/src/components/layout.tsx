import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  Home, 
  LayoutDashboard, 
  PlusCircle, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Zap,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserProfile } from "@workspace/api-client-react";

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  
  const { data: profile } = useGetUserProfile({
    query: {
      enabled: !!user,
      queryKey: ["/api/user/profile"],
    }
  });

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Create Pack", icon: PlusCircle },
    { href: "/tutor", label: "AI Tutor", icon: MessageSquare },
  ];

  const bottomLinks = [
    { href: "/upgrade", label: "Upgrade to Pro", icon: Zap, highlight: true },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-card/60 backdrop-blur-md border-r border-border">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
            <Zap className="w-5 h-5" />
          </div>
          Cluvi
        </Link>
      </div>
      
      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <Button 
                variant={isActive ? "secondary" : "ghost"} 
                className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-white/5'}`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="p-4 space-y-2 mt-auto border-t border-border/50">
        {bottomLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <Button 
                variant={link.highlight ? "default" : (isActive ? "secondary" : "ghost")} 
                className={`w-full justify-start ${link.highlight ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 border-none' : ''}`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}
        
        <div className="pt-4 flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              Lvl {profile?.level || 1} • {profile?.xp || 0} XP
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none -z-10" />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-full shrink-0 z-10">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Zap className="w-5 h-5 text-primary" />
            Cluvi
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
