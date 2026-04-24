import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { useCreateVideo, getGetFeedQueryKey, getGetUserVideosQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Video, Link as LinkIcon, Upload as UploadIcon, CheckCircle2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const uploadSchema = z.object({
  videoUrl: z.string().url("Please provide a valid video URL").min(1),
  caption: z.string().max(150, "Caption too long").optional(),
});

export default function Upload() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const createVideo = useCreateVideo();
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      videoUrl: "",
      caption: "",
    }
  });

  const generateThumbnail = (url: string) => {
    setIsGeneratingThumb(true);
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.currentTime = 1; // get frame at 1 sec
    
    video.onloadeddata = () => {
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.7));
        }
        setIsGeneratingThumb(false);
      };
    };
    video.onerror = () => setIsGeneratingThumb(false);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("videoUrl", e.target.value);
    if (e.target.value) generateThumbnail(e.target.value);
    else setThumbnailUrl("");
  };

  const handleUseSample = () => {
    form.setValue("videoUrl", SAMPLE_VIDEO);
    generateThumbnail(SAMPLE_VIDEO);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, we'd upload to S3/Cloudinary here and get a URL.
    // For this prototype, we'll read it as a blob URL.
    const url = URL.createObjectURL(file);
    form.setValue("videoUrl", url);
    generateThumbnail(url);
  };

  const onSubmit = (values: z.infer<typeof uploadSchema>) => {
    createVideo.mutate({ 
      data: {
        videoUrl: values.videoUrl,
        caption: values.caption || "",
        thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80" // fallback
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        if (me) queryClient.invalidateQueries({ queryKey: getGetUserVideosQueryKey(me.username) });
        setLocation("/feed");
      }
    });
  };

  return (
    <AppShell title="Upload Video" hideTopBar>
      <div className="flex flex-col h-full bg-background px-4 py-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 mt-4 text-center">New Post</h1>

        <div className="mb-6">
          <div className="aspect-[9/16] w-full max-w-[240px] mx-auto bg-muted rounded-2xl overflow-hidden relative border border-border shadow-lg flex items-center justify-center">
            {thumbnailUrl ? (
              <>
                <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md rounded-full p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </>
            ) : isGeneratingThumb ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Video className="h-12 w-12 text-muted-foreground/30" />
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-1 flex flex-col pb-safe">
            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Source</FormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input 
                          placeholder="https://..." 
                          className="pl-9 h-12 bg-secondary"
                          {...field}
                          onChange={handleUrlChange}
                        />
                      </FormControl>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-xs h-9 border-dashed"
                      onClick={handleUseSample}
                    >
                      Use Sample
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-xs h-9 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadIcon className="h-3 w-3 mr-1.5" /> Select File
                    </Button>
                    <input 
                      type="file" 
                      accept="video/mp4,video/quicktime" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write a caption... #hashtags" 
                      className="resize-none h-24 bg-secondary"
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
                className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20"
                disabled={!thumbnailUrl || isGeneratingThumb || createVideo.isPending}
              >
                {createVideo.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Post Video
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppShell>
  );
}
