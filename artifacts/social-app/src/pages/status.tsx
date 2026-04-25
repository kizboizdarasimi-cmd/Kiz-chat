import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useGetStatuses,
  useCreateStatus,
  useDeleteStatus,
  getGetStatusesQueryKey,
  type StatusGroup,
  type Status,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, X, Trash2, Type, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BG_COLORS = [
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#0ea5e9",
  "#1e293b",
];

export default function StatusPage() {
  const { data: groups, isLoading } = useGetStatuses({
    query: { refetchInterval: 10000, queryKey: getGetStatusesQueryKey() },
  });
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewer, setViewer] = useState<{ group: StatusGroup; index: number } | null>(null);

  const myGroup = groups?.find((g) => g.isMe);
  const others = groups?.filter((g) => !g.isMe) ?? [];

  return (
    <AppShell title="Status">
      <div className="px-4 py-4">
        <ComposeButton
          myGroup={myGroup}
          onAdd={() => setComposeOpen(true)}
          onView={() => myGroup && myGroup.statuses.length > 0 && setViewer({ group: myGroup, index: 0 })}
        />

        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mt-8 mb-3">
          Recent updates
        </h2>
        {isLoading && !groups ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : others.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No recent updates from people you follow.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((g) => (
              <button
                key={g.author.username}
                onClick={() => setViewer({ group: g, index: 0 })}
                className="flex items-center gap-3 p-2 rounded-2xl hover:bg-secondary/50 transition-colors active:scale-[0.98] text-left"
              >
                <div className="relative">
                  <div className="rounded-full p-[2px] bg-gradient-to-br from-primary to-accent">
                    <Avatar className="h-14 w-14 border-2 border-background">
                      <AvatarImage src={g.author.profilePicture} />
                      <AvatarFallback>{g.author.displayName[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold text-foreground truncate">
                    {g.author.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.statuses.length} update{g.statuses.length === 1 ? "" : "s"} ·{" "}
                    {formatDistanceToNow(
                      new Date(g.statuses[g.statuses.length - 1]!.createdAt),
                      { addSuffix: true },
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
      {viewer && (
        <StatusViewer
          group={viewer.group}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </AppShell>
  );
}

function ComposeButton({
  myGroup,
  onAdd,
  onView,
}: {
  myGroup?: StatusGroup;
  onAdd: () => void;
  onView: () => void;
}) {
  const hasMine = myGroup && myGroup.statuses.length > 0;
  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl">
      <button onClick={hasMine ? onView : onAdd} className="relative">
        <div className={`rounded-full p-[2px] ${hasMine ? "bg-gradient-to-br from-primary to-accent" : "bg-secondary"}`}>
          <Avatar className="h-14 w-14 border-2 border-background">
            <AvatarImage src={myGroup?.author.profilePicture} />
            <AvatarFallback>
              {myGroup?.author.displayName[0] ?? "Y"}
            </AvatarFallback>
          </Avatar>
        </div>
        <div
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </div>
      </button>
      <div className="flex-1">
        <p className="font-semibold text-foreground">My status</p>
        <p className="text-xs text-muted-foreground">
          {hasMine
            ? `${myGroup!.statuses.length} update${
                myGroup!.statuses.length === 1 ? "" : "s"
              }`
            : "Tap to add status update"}
        </p>
      </div>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateStatus();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [bg, setBg] = useState(BG_COLORS[0]!);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tab, setTab] = useState<"text" | "image" | "video">("text");

  const reset = () => {
    setText("");
    setImageUrl("");
    setVideoUrl("");
    setBg(BG_COLORS[0]!);
    setTab("text");
  };

  const handleCreate = () => {
    const data =
      tab === "text"
        ? { kind: "text" as const, body: text, backgroundColor: bg, mediaUrl: "" }
        : tab === "image"
          ? { kind: "image" as const, body: text, mediaUrl: imageUrl, backgroundColor: bg }
          : { kind: "video" as const, body: text, mediaUrl: videoUrl, backgroundColor: bg };
    create.mutate(
      { data },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStatusesQueryKey() });
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Add status</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "text" | "image" | "video")}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
            </TabsTrigger>
            <TabsTrigger value="video">
              <VideoIcon className="h-4 w-4 mr-2" />
              Video
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="space-y-3">
            <div
              className="rounded-xl p-6 min-h-[200px] flex items-center justify-center text-center"
              style={{ backgroundColor: bg }}
            >
              <Textarea
                placeholder="What's on your mind?"
                className="bg-transparent border-0 text-white placeholder:text-white/70 text-2xl font-semibold text-center resize-none focus-visible:ring-0 shadow-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className={`h-8 w-8 rounded-full border-2 ${bg === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="image" className="space-y-3">
            <Input
              placeholder="Image URL (https://...)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <div className="rounded-xl overflow-hidden bg-secondary aspect-square">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <Input
              placeholder="Caption (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>
          <TabsContent value="video" className="space-y-3">
            <Input
              placeholder="Video URL (https://...mp4)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {videoUrl && (
              <video src={videoUrl} controls className="w-full rounded-xl aspect-video bg-black" />
            )}
            <Input
              placeholder="Caption (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>
        </Tabs>
        <Button
          onClick={handleCreate}
          disabled={
            create.isPending ||
            (tab === "text" && !text.trim()) ||
            (tab === "image" && !imageUrl.trim()) ||
            (tab === "video" && !videoUrl.trim())
          }
          className="w-full bg-primary text-primary-foreground"
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Post status"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function StatusViewer({
  group,
  startIndex,
  onClose,
}: {
  group: StatusGroup;
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const del = useDeleteStatus();
  const qc = useQueryClient();
  const status: Status | undefined = group.statuses[idx];

  if (!status) return null;

  const next = () => {
    if (idx < group.statuses.length - 1) setIdx(idx + 1);
    else onClose();
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const handleDelete = () => {
    del.mutate(
      { id: status.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStatusesQueryKey() });
          if (group.statuses.length === 1) onClose();
          else if (idx >= group.statuses.length - 1) setIdx(Math.max(0, idx - 1));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex gap-1 mb-3">
          {group.statuses.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 bg-white/30 rounded">
              <div
                className={`h-full rounded bg-white transition-all ${i < idx ? "w-full" : i === idx ? "w-full" : "w-0"}`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/20">
              <AvatarImage src={group.author.profilePicture} />
              <AvatarFallback>{group.author.displayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-semibold">
                {group.author.displayName}
              </p>
              <p className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(status.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {group.isMe && (
              <button
                onClick={handleDelete}
                className="p-2 text-white/80 hover:text-white"
                disabled={del.isPending}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {status.kind === "text" && (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: status.backgroundColor }}
          >
            <p className="text-white text-3xl font-semibold text-center break-words">
              {status.body}
            </p>
          </div>
        )}
        {status.kind === "image" && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <img
              src={status.mediaUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
            {status.body && (
              <p className="absolute bottom-20 left-0 right-0 text-white text-center px-6 text-lg drop-shadow-lg">
                {status.body}
              </p>
            )}
          </div>
        )}
        {status.kind === "video" && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <video
              src={status.mediaUrl}
              autoPlay
              playsInline
              onEnded={next}
              className="max-w-full max-h-full"
            />
            {status.body && (
              <p className="absolute bottom-20 left-0 right-0 text-white text-center px-6 text-lg drop-shadow-lg">
                {status.body}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={prev}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]"
        aria-label="Previous"
      />
      <button
        onClick={next}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]"
        aria-label="Next"
      />
    </div>
  );
}
