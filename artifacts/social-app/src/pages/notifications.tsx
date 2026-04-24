import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useGetNotifications, useMarkAllNotificationsRead, getGetUnreadCountQueryKey, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Bell, Heart, UserPlus, MessageCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications({
    query: { refetchInterval: 5000, queryKey: getGetNotificationsQueryKey() }
  });
  const markRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (notifications?.some(n => !n.isRead)) {
      markRead.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUnreadCountQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        }
      });
    }
  }, [notifications]);

  const getIcon = (type: string) => {
    switch(type) {
      case 'like': return <Heart className="h-4 w-4 text-primary fill-primary" />;
      case 'follow': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'comment': return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'verified': return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AppShell title="Notifications">
      <div className="px-2 py-4 flex flex-col gap-1">
        {isLoading && !notifications ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notifications?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Bell className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No notifications</h3>
            <p>Activity on your profile will appear here.</p>
          </div>
        ) : (
          notifications?.map((notif) => {
            const content = (
              <div className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${notif.isRead ? 'hover:bg-secondary/50' : 'bg-primary/5 hover:bg-primary/10'}`}>
                <div className="relative shrink-0">
                  {notif.actor ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={notif.actor.profilePicture} />
                      <AvatarFallback>{notif.actor.displayName[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-background rounded-full flex items-center justify-center shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {notif.actor && <span className="font-semibold mr-1">{notif.actor.username}</span>}
                    {notif.message}
                  </p>
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );

            if (notif.actor && notif.type === 'follow') {
              return <Link key={notif.id} href={`/u/${notif.actor.username}`}>{content}</Link>;
            }
            if (notif.videoId && (notif.type === 'like' || notif.type === 'comment')) {
              return <Link key={notif.id} href={`/feed?video=${notif.videoId}`}>{content}</Link>;
            }
            
            return <div key={notif.id}>{content}</div>;
          })
        )}
      </div>
    </AppShell>
  );
}
