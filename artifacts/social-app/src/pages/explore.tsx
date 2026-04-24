import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGetTrendingVideos, useGetNewestVideos, useGetTrendingUsers, useFollowUser, useUnfollowUser, getGetTrendingUsersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Loader2, Play, Users, Check, Compass } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Explore() {
  return (
    <AppShell title="Explore">
      <div className="px-4 py-6">
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="w-full bg-secondary/50 rounded-xl h-12 p-1 mb-6">
            <TabsTrigger value="trending" className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Trending</TabsTrigger>
            <TabsTrigger value="newest" className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Newest</TabsTrigger>
            <TabsTrigger value="people" className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">People</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trending" className="mt-0 outline-none">
            <TrendingVideos />
          </TabsContent>
          <TabsContent value="newest" className="mt-0 outline-none">
            <NewestVideos />
          </TabsContent>
          <TabsContent value="people" className="mt-0 outline-none">
            <TrendingPeople />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function TrendingVideos() {
  const { data: videos, isLoading } = useGetTrendingVideos();

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!videos?.length) return <EmptyState message="No trending videos right now." />;

  return <VideoGrid videos={videos} />;
}

function NewestVideos() {
  const { data: videos, isLoading } = useGetNewestVideos();

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!videos?.length) return <EmptyState message="No new videos right now." />;

  return <VideoGrid videos={videos} />;
}

function TrendingPeople() {
  const { data: users, isLoading } = useGetTrendingUsers();
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const queryClient = useQueryClient();

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!users?.length) return <EmptyState message="No trending users right now." />;

  const handleFollow = (username: string, isFollowing: boolean) => {
    if (isFollowing) {
      unfollow.mutate({ username }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTrendingUsersQueryKey() })
      });
    } else {
      follow.mutate({ username }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTrendingUsersQueryKey() })
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {users.map(user => (
        <div key={user.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <Link href={`/u/${user.username}`}>
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback>{user.displayName[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 overflow-hidden">
            <Link href={`/u/${user.username}`} className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground truncate">{user.displayName}</h3>
              {user.isVerified && <Check className="h-3 w-3 text-primary shrink-0" strokeWidth={3} />}
            </Link>
            <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/80">
              <Users className="h-3 w-3" />
              <span>{user.followersCount} followers</span>
            </div>
          </div>
          <Button 
            variant={user.isFollowing ? "outline" : "default"}
            size="sm"
            className="rounded-full font-semibold min-w-[90px]"
            onClick={() => handleFollow(user.username, user.isFollowing)}
          >
            {user.isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function VideoGrid({ videos }: { videos: any[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {videos.map(video => (
        <Link href={`/feed`} key={video.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group block">
          <img src={video.thumbnailUrl} alt={video.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-white text-xs font-semibold">
            <Play className="h-3 w-3 fill-current" />
            <span className="truncate">{video.likesCount}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <Compass className="h-12 w-12 mb-4 opacity-20" />
      <p>{message}</p>
    </div>
  );
}
