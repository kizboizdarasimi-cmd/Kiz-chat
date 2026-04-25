import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useGetMessages,
  useGetUserByUsername,
  useSendMessage,
  useMarkChatRead,
  useSetTyping,
  useDeleteMessage,
  useBlockUser,
  useUnblockUser,
  getGetMessagesQueryKey,
  getGetChatsQueryKey,
  getGetUserByUsernameQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Send,
  Check,
  CheckCheck,
  Smile,
  Mic,
  Play,
  Clock,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Ban,
  Phone,
  Video as VideoIcon,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OfflineMessage {
  id: string;
  body: string;
  kind: "text" | "voice" | "emoji" | "image";
  createdAt: string;
}

export default function ChatRoom({ username }: { username: string }) {
  const { data: partner } = useGetUserByUsername(username);
  const { data: messages, isLoading } = useGetMessages(username, {
    query: { refetchInterval: 1500, queryKey: getGetMessagesQueryKey(username) },
  });
  const sendMessage = useSendMessage();
  const markRead = useMarkChatRead();
  const setTyping = useSetTyping();
  const deleteMessage = useDeleteMessage();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [body, setBody] = useState("");
  const [offlineMessages, setOfflineMessages] = useState<OfflineMessage[]>([]);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [callDialog, setCallDialog] = useState<"voice" | "video" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingTime = useRef<number>(0);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getGetMessagesQueryKey(username),
    });
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  useEffect(() => {
    const key = `kizchat_outbox_${username}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setOfflineMessages(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }
  }, [username]);

  useEffect(() => {
    const handleOnline = () => {
      const key = `kizchat_outbox_${username}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const pending: OfflineMessage[] = JSON.parse(stored);
          pending.forEach((msg) => {
            sendMessage.mutate(
              {
                username,
                data: { body: msg.body, kind: msg.kind, clientId: msg.id },
              },
              { onSuccess: invalidate },
            );
          });
          localStorage.removeItem(key);
          setOfflineMessages([]);
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [username, sendMessage]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      markRead.mutate({ username });
    }
  }, [messages?.length, username]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, offlineMessages]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBody(e.target.value);
    const now = Date.now();
    if (now - lastTypingTime.current > 1500) {
      setTyping.mutate({ username });
      lastTypingTime.current = now;
    }
  };

  const handleSend = () => {
    if (!body.trim()) return;
    const currentBody = body;
    setBody("");
    const clientId = `temp_${Date.now()}`;

    if (!navigator.onLine) {
      const newOfflineMsg: OfflineMessage = {
        id: clientId,
        body: currentBody,
        kind: "text",
        createdAt: new Date().toISOString(),
      };
      const newOffline = [...offlineMessages, newOfflineMsg];
      setOfflineMessages(newOffline);
      localStorage.setItem(
        `kizchat_outbox_${username}`,
        JSON.stringify(newOffline),
      );
      return;
    }

    sendMessage.mutate(
      { username, data: { body: currentBody, kind: "text", clientId } },
      { onSuccess: invalidate },
    );
  };

  const handleSendImage = () => {
    if (!imageUrl.trim()) return;
    sendMessage.mutate(
      {
        username,
        data: {
          body: imageUrl.trim(),
          kind: "image",
          clientId: `img_${Date.now()}`,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setImageUrl("");
          setImageOpen(false);
        },
      },
    );
  };

  const handleDelete = (id: number, scope: "me" | "everyone") => {
    deleteMessage.mutate({ username, id, params: { scope } }, { onSuccess: invalidate });
  };

  return (
    <AppShell hideTopBar>
      <div className="flex flex-col h-[100dvh] bg-background">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-md shrink-0 z-10">
          <button
            onClick={() => window.history.back()}
            className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          {partner && (
            <Link
              href={`/u/${partner.username}`}
              className="flex items-center gap-3 flex-1"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={partner.profilePicture} />
                <AvatarFallback>{partner.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">
                    {partner.displayName}
                  </span>
                  {partner.isVerified && (
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  @{partner.username}
                </span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCallDialog("voice")}
            className="p-2 text-muted-foreground hover:text-primary"
            title="Voice call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCallDialog("video")}
            className="p-2 text-muted-foreground hover:text-primary"
            title="Video call"
          >
            <VideoIcon className="h-5 w-5" />
          </button>
          {partner && (
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    blockUser.mutate(
                      { username: partner.username },
                      {
                        onSuccess: () => {
                          toast({
                            title: `Blocked @${partner.username}`,
                            description: "You won't receive messages from them.",
                          });
                          queryClient.invalidateQueries({
                            queryKey: getGetUserByUsernameQueryKey(
                              partner.username,
                            ),
                          });
                          queryClient.invalidateQueries({
                            queryKey: getGetChatsQueryKey(),
                          });
                        },
                      },
                    );
                  }}
                  className="text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 pb-[80px]"
        >
          {isLoading && !messages ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {messages?.map((msg, i) => {
                const isMe = msg.senderUsername !== username;
                const showTime =
                  i === 0 ||
                  new Date(msg.createdAt).getTime() -
                    new Date(messages[i - 1]!.createdAt).getTime() >
                    5 * 60 * 1000;

                return (
                  <div key={msg.id} className="flex flex-col">
                    {showTime && (
                      <span className="text-[10px] text-muted-foreground text-center my-4 uppercase tracking-wider font-semibold">
                        {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                      </span>
                    )}
                    <div
                      className={`flex flex-col max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                    >
                      {msg.deletedForEveryone ? (
                        <div className="px-4 py-2.5 rounded-2xl bg-secondary/60 text-muted-foreground text-sm italic">
                          This message was deleted
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`px-4 py-2.5 rounded-2xl text-left ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-secondary text-foreground rounded-bl-sm"
                              }`}
                            >
                              {msg.kind === "text" && (
                                <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                                  {msg.body}
                                </p>
                              )}
                              {msg.kind === "image" && (
                                <img
                                  src={msg.body}
                                  alt=""
                                  className="rounded-lg max-w-full max-h-60 object-cover -mx-2 -my-1"
                                />
                              )}
                              {msg.kind === "voice" && (
                                <div className="flex items-center gap-2">
                                  <Play className="h-5 w-5 fill-current" />
                                  <div className="flex gap-0.5 h-4 items-center opacity-70">
                                    {[1, 2, 3, 2, 4, 3, 1, 2].map((h, j) => (
                                      <div
                                        key={j}
                                        className="w-1 bg-current rounded-full"
                                        style={{ height: `${h * 4}px` }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {msg.kind === "emoji" && (
                                <p className="text-3xl">{msg.body}</p>
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align={isMe ? "end" : "start"}
                          >
                            <DropdownMenuItem
                              onClick={() => handleDelete(msg.id, "me")}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete for me
                            </DropdownMenuItem>
                            {isMe && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(msg.id, "everyone")}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete for
                                  everyone
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {isMe && !msg.deletedForEveryone && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          {msg.status === "sent" && <Check className="h-3 w-3" />}
                          {msg.status === "delivered" && (
                            <CheckCheck className="h-3 w-3" />
                          )}
                          {msg.status === "read" && (
                            <CheckCheck className="h-3 w-3 text-sky-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {offlineMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col self-end items-end max-w-[75%] opacity-70"
                >
                  <div className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground rounded-br-sm">
                    <p className="text-[15px] leading-snug">{msg.body}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background p-3 pb-safe z-10 absolute bottom-[64px] left-0 right-0">
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setImageOpen(true)}
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
              title="Send image"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Smile className="h-6 w-6" />
            </Button>
            <div className="flex-1 bg-secondary rounded-2xl flex items-end px-1 min-h-[44px]">
              <Input
                placeholder="Message…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-3 py-3 h-auto min-h-[44px]"
                value={body}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
            </div>
            {body.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={sendMessage.isPending}
                className="h-11 w-11 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground bg-secondary/50"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Send a photo</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Image URL (https://...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl && (
            <div className="rounded-xl overflow-hidden bg-secondary aspect-video">
              <img src={imageUrl} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <Button
            onClick={handleSendImage}
            disabled={!imageUrl.trim() || sendMessage.isPending}
            className="bg-primary text-primary-foreground"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send"
            )}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={callDialog !== null} onOpenChange={() => setCallDialog(null)}>
        <DialogContent className="bg-background border-border max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {callDialog === "video" ? "Video calls" : "Voice calls"} — coming
              soon
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Real-time {callDialog} calling needs a paid call-routing service
            (TURN/STUN). Once that's connected, you'll be able to ring{" "}
            <strong>@{partner?.username}</strong> right from here.
          </p>
          <Button onClick={() => setCallDialog(null)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
