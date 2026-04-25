import { AppShell } from "@/components/AppShell";
import {
  useGetMe,
  useUpdatePrivacy,
  useGetBlockedUsers,
  useUnblockUser,
  getGetMeQueryKey,
  getGetBlockedUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Eye, EyeOff, Shield, Info } from "lucide-react";

export default function Settings() {
  const { data: me } = useGetMe();
  const { data: blocked } = useGetBlockedUsers();
  const updatePrivacy = useUpdatePrivacy();
  const unblock = useUnblockUser();
  const qc = useQueryClient();

  return (
    <AppShell title="Settings" showBack>
      <div className="px-4 py-4 space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
            Privacy
          </h2>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                {me?.lastSeenVisible ? (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">Last seen & online</p>
                  <p className="text-xs text-muted-foreground">
                    Let people see when you're online
                  </p>
                </div>
              </div>
              <Switch
                checked={me?.lastSeenVisible ?? true}
                onCheckedChange={(v) =>
                  updatePrivacy.mutate(
                    { data: { lastSeenVisible: v } },
                    {
                      onSuccess: () =>
                        qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
                    },
                  )
                }
                disabled={updatePrivacy.isPending}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Blocked users
          </h2>
          {!blocked || blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 bg-card rounded-2xl border border-border text-center">
              You haven't blocked anyone.
            </p>
          ) : (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {blocked.map((u) => (
                <div key={u.username} className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.profilePicture} />
                    <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unblock.isPending}
                    onClick={() =>
                      unblock.mutate(
                        { username: u.username },
                        {
                          onSuccess: () =>
                            qc.invalidateQueries({
                              queryKey: getGetBlockedUsersQueryKey(),
                            }),
                        },
                      )
                    }
                  >
                    {unblock.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Unblock"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
            <Info className="h-3.5 w-3.5" />
            About Kizchat
          </h2>
          <div className="bg-card rounded-2xl border border-border p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <span className="text-foreground font-semibold">Kizchat</span> is a social messaging app combining short videos, status stories, and private chat.
            </p>
            <p>Voice and video calling will arrive when call infrastructure is provisioned.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
