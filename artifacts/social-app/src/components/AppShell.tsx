import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Compass, Plus, MessageCircle, User, Bell } from "lucide-react";
import { useGetMe, useGetUnreadCount } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  hideTopBar?: boolean;
  title?: string;
  showBack?: boolean;
}

export function AppShell({ children, hideTopBar = false, title = "Buzz", showBack = false }: AppShellProps) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const { data: unread } = useGetUnreadCount();

  const isFeed = location === "/feed";
  const isExplore = location === "/explore";
  const isChats = location.startsWith("/chats") && location === "/chats";
  const isProfile = me && location === `/u/${me.username}`;

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-background relative overflow-hidden shadow-2xl sm:border-x sm:border-border">
      {!hideTopBar && (
        <header className="absolute top-0 z-50 flex h-14 w-full items-center justify-between bg-background/80 px-4 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            {showBack && (
              <button onClick={() => window.history.back()} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
                <Compass className="h-5 w-5 rotate-90" />
              </button>
            )}
            <h1 className="text-xl font-bold text-foreground font-sans tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {location !== "/search" && (
              <Link href="/search" className="text-foreground hover:text-primary transition-colors">
                <Compass className="h-6 w-6" />
              </Link>
            )}
            <Link href="/notifications" className="relative text-foreground hover:text-primary transition-colors">
              <Bell className="h-6 w-6" />
              {unread && unread.count > 0 && (
                <span className="absolute 1 top-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              )}
            </Link>
          </div>
        </header>
      )}

      <main className={cn("flex-1 overflow-y-auto", !hideTopBar && "pt-14", "pb-16")}>
        {children}
      </main>

      <nav className="absolute bottom-0 z-50 flex h-16 w-full items-center justify-around bg-background/90 px-2 backdrop-blur-lg border-t border-border pb-safe">
        <Link href="/feed" className={cn("flex flex-col items-center justify-center p-2 text-muted-foreground transition-colors", isFeed && "text-primary")}>
          <Home className={cn("h-6 w-6", isFeed && "fill-current")} />
        </Link>
        <Link href="/explore" className={cn("flex flex-col items-center justify-center p-2 text-muted-foreground transition-colors", isExplore && "text-primary")}>
          <Compass className={cn("h-6 w-6", isExplore && "fill-current")} />
        </Link>
        <Link href="/upload" className="flex items-center justify-center -mt-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95">
          <Plus className="h-6 w-6" />
        </Link>
        <Link href="/chats" className={cn("relative flex flex-col items-center justify-center p-2 text-muted-foreground transition-colors", isChats && "text-primary")}>
          <MessageCircle className={cn("h-6 w-6", isChats && "fill-current")} />
          {unread && unread.count > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
          )}
        </Link>
        <Link href={me ? `/u/${me.username}` : "/feed"} className={cn("flex flex-col items-center justify-center p-2 text-muted-foreground transition-colors", isProfile && "text-primary")}>
          <User className={cn("h-6 w-6", isProfile && "fill-current")} />
        </Link>
      </nav>
    </div>
  );
}
