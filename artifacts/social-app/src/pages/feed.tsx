import { useEffect, useRef, useState } from "react";
import { useGetFeed, useGetFollowingFeed, useLikeVideo, useUnlikeVideo, useAddComment, useGetComments, getGetFeedQueryKey, getGetFollowingFeedQueryKey, getGetVideoQueryKey } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { Link } from "wouter";
import { Heart, MessageCircle, Share2, Music, Check, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Feed() {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");

  return (
    <AppShell hideTopBar>
      <div className="relative h-[100dvh] w-full bg-black overflow-hidden snap-y snap-mandatory pt-0 pb-[64px]">
        {/* Top Tabs */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center pt-safe-top pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex gap-4">
            <button 
              className={`text-lg font-bold transition-all ${tab === "following" ? "text-white opacity-100" : "text-white/60 opacity-80"}`}
              onClick={() => setTab("following")}
            >
              Following
              {tab === "following" && <motion.div layoutId="feed-tab-indicator" className="h-1 w-8 bg-white mx-auto mt-1 rounded-full" />}
            </button>
            <div className="w-[1px] h-4 bg-white/20 my-auto" />
            <button 
              className={`text-lg font-bold transition-all ${tab === "foryou" ? "text-white opacity-100" : "text-white/60 opacity-80"}`}
              onClick={() => setTab("foryou")}
            >
              For You
              {tab === "foryou" && <motion.div layoutId="feed-tab-indicator" className="h-1 w-8 bg-white mx-auto mt-1 rounded-full" />}
            </button>
          </div>
        </div>

        {tab === "foryou" ? <ForYouFeed /> : <FollowingFeed />}
      </div>
    </AppShell>
  );
}

function ForYouFeed() {
  const { data: videos, isLoading } = useGetFeed();
  
  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!videos || videos.length === 0) {
    return <EmptyFeed message="No videos found. Check back later!" />;
  }

  return (
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
      {videos.map((video) => (
        <VideoPlayer key={video.id} video={video} />
      ))}
    </div>
  );
}

function FollowingFeed() {
  const { data: videos, isLoading } = useGetFollowingFeed();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!videos || videos.length === 0) {
    return <EmptyFeed message="You aren't following anyone yet, or they haven't posted anything." />;
  }

  return (
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
      {videos.map((video) => (
        <VideoPlayer key={video.id} video={video} />
      ))}
    </div>
  );
}

function EmptyFeed({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black text-white">
      <Music className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function VideoPlayer({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState<{ x: number, y: number, id: number }[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const likeVideo = useLikeVideo();
  const unlikeVideo = useUnlikeVideo();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDoubleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setShowHeart(prev => [...prev, { x, y, id: Date.now() }]);
    
    if (!video.liked) {
      handleLike();
    }
  };

  const handleLike = () => {
    if (video.liked) {
      unlikeVideo.mutate({ id: video.id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetFeedQueryKey(), (old: any) => 
            old?.map((v: any) => v.id === video.id ? { ...v, liked: false, likesCount: data.likesCount } : v)
          );
        }
      });
    } else {
      likeVideo.mutate({ id: video.id }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetFeedQueryKey(), (old: any) => 
            old?.map((v: any) => v.id === video.id ? { ...v, liked: true, likesCount: data.likesCount } : v)
          );
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full snap-start bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="h-full w-full object-cover"
        loop
        playsInline
        autoPlay
        muted
        onClick={(e) => {
          if (e.detail === 2) handleDoubleTap(e);
          else {
            if (isPlaying) videoRef.current?.pause();
            else videoRef.current?.play();
            setIsPlaying(!isPlaying);
          }
        }}
      />
      
      {/* Floating Hearts for Double Tap */}
      <AnimatePresence>
        {showHeart.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, scale: 0.5, y: 0, rotate: -15 }}
            animate={{ opacity: 0, scale: 1.5, y: -100, rotate: 15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute pointer-events-none z-50 text-primary"
            style={{ left: heart.x - 40, top: heart.y - 40 }}
            onAnimationComplete={() => setShowHeart(prev => prev.filter(h => h.id !== heart.id))}
          >
            <Heart className="h-20 w-20 fill-current" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Side Rail */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        <Link href={`/u/${video.author.username}`} className="relative">
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={video.author.profilePicture} />
            <AvatarFallback>{video.author.displayName[0]}</AvatarFallback>
          </Avatar>
        </Link>
        
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className={`p-3 rounded-full bg-black/40 backdrop-blur-sm transition-colors ${video.liked ? 'text-primary' : 'text-white group-hover:text-primary/80'}`}>
            <Heart className={`h-7 w-7 ${video.liked ? 'fill-current' : ''}`} />
          </motion.div>
          <span className="text-white text-xs font-semibold shadow-sm">{video.likesCount}</span>
        </button>

        <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white transition-colors group-hover:text-white/80">
            <MessageCircle className="h-7 w-7" />
          </motion.div>
          <span className="text-white text-xs font-semibold shadow-sm">{video.commentsCount}</span>
        </button>

        <button className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white transition-colors group-hover:text-white/80">
            <Share2 className="h-7 w-7" />
          </motion.div>
          <span className="text-white text-xs font-semibold shadow-sm">Share</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-20 left-4 right-20 z-20">
        <Link href={`/u/${video.author.username}`} className="flex items-center gap-1.5 mb-2">
          <span className="text-white font-bold text-lg drop-shadow-md">@{video.author.username}</span>
          {video.author.isVerified && (
            <div className="bg-primary rounded-full p-0.5">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          )}
        </Link>
        <p className="text-white text-sm line-clamp-2 drop-shadow-md leading-snug">{video.caption}</p>
      </div>

      {/* Comments Sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="h-[70vh] bg-background border-t border-border rounded-t-3xl flex flex-col px-0">
          <SheetHeader className="px-4 pb-4 border-b border-border">
            <SheetTitle className="text-center">{video.commentsCount} comments</SheetTitle>
          </SheetHeader>
          <CommentsList videoId={video.id} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CommentsList({ videoId }: { videoId: number }) {
  const { data: comments, isLoading } = useGetComments(videoId, { query: { enabled: !!videoId, queryKey: ['comments', videoId] } });
  const [commentBody, setCommentBody] = useState("");
  const addComment = useAddComment();
  const queryClient = useQueryClient();

  const handleSend = () => {
    if (!commentBody.trim()) return;
    addComment.mutate({ id: videoId, data: { body: commentBody } }, {
      onSuccess: () => {
        setCommentBody("");
        queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
      }
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : comments?.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">Be the first to comment!</div>
        ) : (
          comments?.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author.profilePicture} />
                <AvatarFallback>{comment.author.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-foreground/80">{comment.author.username}</span>
                  {comment.author.isVerified && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-sm text-foreground mt-0.5">{comment.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-border flex gap-2 items-center bg-background mb-safe">
        <Input 
          placeholder="Add comment..." 
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className="flex-1 bg-secondary rounded-full border-none h-10 px-4"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button size="icon" onClick={handleSend} disabled={!commentBody.trim() || addComment.isPending} className="rounded-full bg-primary h-10 w-10 shrink-0">
          {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}
