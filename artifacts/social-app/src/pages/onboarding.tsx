import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Loader2, Camera } from "lucide-react";

const onboardingSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50),
  bio: z.string().max(160).optional(),
  profilePicture: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me, isLoading: isLoadingMe } = useGetMe();
  const updateMe = useUpdateMe();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePicture: "",
    },
  });

  useEffect(() => {
    if (me?.username && !me.username.startsWith("user_")) {
      setLocation("/feed", { replace: true });
    } else if (me) {
      form.reset({
        displayName: me.displayName || "",
        bio: me.bio || "",
        profilePicture: me.profilePicture || "",
      });
    }
  }, [me, setLocation, form]);

  const onSubmit = (values: z.infer<typeof onboardingSchema>) => {
    updateMe.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data);
          setLocation("/feed", { replace: true });
        },
      }
    );
  };

  if (isLoadingMe) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-6 py-12 sm:border-x sm:border-border">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Set up your profile</h1>
          <p className="text-muted-foreground">Let people know who you are</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-6">
            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem className="mx-auto mb-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-muted shadow-xl">
                    {field.value ? (
                      <img src={field.value} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <FormControl>
                    <Input placeholder="Profile Picture URL" {...field} className="mt-4 text-center" />
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
                    <Input placeholder="Your name" {...field} className="h-12 bg-secondary/50 text-lg" />
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
                      placeholder="A short bio about yourself..." 
                      className="min-h-[100px] resize-none bg-secondary/50 text-lg" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-auto pt-6">
              <Button 
                type="submit" 
                className="h-14 w-full rounded-xl text-lg font-bold shadow-lg shadow-primary/25" 
                disabled={updateMe.isPending}
              >
                {updateMe.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Complete Profile
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
