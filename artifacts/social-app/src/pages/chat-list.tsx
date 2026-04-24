import { AppShell } from "@/components/AppShell";
import { useGetChats, getGetChatsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatList() {
  const { data: chats, isLoading } = useGetChats({
    query: { refetchInterval: 3000, queryKey: getGetChatsQueryKey() }
  });

  return (
    <AppShell title="Messages">
      <div className="px-2 py-4 flex flex-col gap-1">
        {isLoading && !chats ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : chats?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground px-8">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No messages yet</h3>
            <p>Go to someone's profile to start a conversation with them.</p>
          </div>
        ) : (
          chats?.map((chat) => (
            <Link 
              key={chat.partner.username} 
              href={`/chats/${chat.partner.username}`}
              className="flex items-center gap-4 p-3 rounded-2xl hover:bg-secondary/50 transition-colors active:scale-[0.98]"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={chat.partner.profilePicture} />
                  <AvatarFallback>{chat.partner.displayName[0]}</AvatarFallback>
                </Avatar>
                {chat.partnerOnline && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <h3 className="font-semibold text-foreground truncate">{chat.partner.displayName}</h3>
                    {chat.partner.isVerified && <Check className="h-3 w-3 text-primary shrink-0" strokeWidth={3} />}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false }).replace('about ', '')}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {chat.partnerTyping ? (
                      <span className="text-primary italic">typing...</span>
                    ) : (
                      <>
                        {chat.lastMessageFromMe && <span className="mr-1">You:</span>}
                        {chat.lastMessage}
                      </>
                    )}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="shrink-0 bg-primary text-primary-foreground text-xs font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
