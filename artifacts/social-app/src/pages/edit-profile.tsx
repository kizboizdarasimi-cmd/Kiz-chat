import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useGetMe, useUpdateMe, useRequestVerification, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, CheckCircle2, ShieldCheck } from "lucide-react";
import { useClerk } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  displayName: z.string().min(2, "Must be at least 2 characters").max(50),
  bio: z.string().max(160).optional(),
  profilePicture: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

export default function EditProfile() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const requestVerification = useRequestVerification();
  const queryClient = useQueryClient();
  const clerk = useClerk();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePicture: "",
    }
  });

  useEffect(() => {
    if (me) {
      form.reset({
        displayName: me.displayName || "",
        bio: me.bio || "",
        profilePicture: me.profilePicture || "",
      });
    }
  }, [me, form]);

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateMe.mutate({ data: values }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data);
      }
    });
  };

  const handleSignOut = () => {
    clerk.signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  };

  const handleVerify = () => {
    requestVerification.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data);
      }
    });
  };

  if (isLoading || !me) {
    return (
      <AppShell title="Edit Profile" showBack>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Profile" showBack>
      <div className="px-4 py-6 flex flex-col h-full overflow-y-auto pb-safe">
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-4 border-2 border-border">
                <AvatarImage src={form.watch("profilePicture") || undefined} />
                <AvatarFallback className="text-3xl">{me.displayName[0]}</AvatarFallback>
              </Avatar>
            </div>

            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} className="bg-secondary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="resize-none h-24 bg-secondary" 
                      placeholder="Write a little about yourself..."
                    />
                  </FormControl>
                  <FormDescription>Max 160 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full font-bold h-12 rounded-xl mt-4 shadow-md shadow-primary/20"
              disabled={updateMe.isPending}
            >
              {updateMe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </Form>

        <div className="mt-10 space-y-4">
          <h3 className="font-bold text-lg border-b border-border pb-2">Account</h3>
          
          <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Verified Badge</p>
                <p className="text-xs text-muted-foreground">Show you are authentic</p>
              </div>
            </div>
            {me.isVerified ? (
              <div className="flex items-center gap-1 text-primary text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Verified
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleVerify}
                disabled={me.verificationRequested || requestVerification.isPending}
                className="text-xs font-semibold"
              >
                {me.verificationRequested ? "Requested" : "Request"}
              </Button>
            )}
          </div>

          <Button 
            variant="destructive" 
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

      </div>
    </AppShell>
  );
}
