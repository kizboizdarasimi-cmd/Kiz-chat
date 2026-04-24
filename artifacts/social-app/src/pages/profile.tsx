import { AppShell } from "@/components/AppShell";
import { useGetUserByUsername, useGetUserVideos, useFollowUser, useUnfollowUser, getGetUserByUsernameQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Play, Check, Settings, MessageCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Profile({ username }: { username: string }) {
  const { data: profile, isLoading: isLoadingProfile } = useGetUserByUsername(username);
  const { data: videos, isLoading: isLoadingVideos } = useGetUserVideos(username);
  
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const queryClient = useQueryClient();

  if (isLoadingProfile) {
    return (
      <AppShell title="Profile">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="Profile">
        <div className="flex justify-center py-20 text-muted-foreground">User not found</div>
      </AppShell>
    );
  }

  const handleFollow = () => {
    if (profile.isFollowing) {
      unfollow.mutate({ username }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) })
      });
    } else {
      follow.mutate({ username }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username) })
      });
    }
  };

  return (
    <AppShell title={profile.displayName} showBack>
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-6 mb-4">
            <Avatar className="h-24 w-24 border-2 border-border shadow-lg">
              <AvatarImage src={profile.profilePicture} />
              <AvatarFallback className="text-3xl">{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex justify-between text-center">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-foreground">{profile.videosCount}</span>
                <span className="text-xs text-muted-foreground">Videos</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-foreground">{profile.followersCount}</span>
                <span className="text-xs text-muted-foreground">Followers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-foreground">{profile.followingCount}</span>
                <span className="text-xs text-muted-foreground">Following</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-foreground">{profile.displayName}</h2>
              {profile.isVerified && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-sm mt-2 text-foreground whitespace-pre-wrap">{profile.bio}</p>}
          </div>

          <div className="flex gap-2">
            {profile.isMe ? (
              <>
                <Link href="/me/edit" className="flex-1">
                  <Button variant="secondary" className="w-full font-bold">Edit Profile</Button>
                </Link>
                <Button variant="secondary" size="icon" className="shrink-0"><Settings className="h-5 w-5" /></Button>
              </>
            ) : (
              <>
                <Button 
                  className="flex-1 font-bold shadow-md"
                  variant={profile.isFollowing ? "secondary" : "default"}
                  onClick={handleFollow}
                  disabled={follow.isPending || unfollow.isPending}
                >
                  {profile.isFollowing ? "Following" : "Follow"}
                </Button>
                <Link href={`/chats/${profile.username}`} className="flex-1">
                  <Button variant="secondary" className="w-full font-bold">Message</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 min-h-[300px] border-t border-border">
          {isLoadingVideos ? (
             <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : videos?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Play className="h-12 w-12 mb-4 opacity-20" />
              <p>No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px] bg-border">
              {videos?.map(video => (
                <Link href={`/feed?video=${video.id}`} key={video.id} className="relative aspect-[3/4] bg-muted group block overflow-hidden">
                  <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[11px] font-bold z-10 drop-shadow-md">
                    <Play className="h-3 w-3 fill-current" />
                    <span>{video.likesCount}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
