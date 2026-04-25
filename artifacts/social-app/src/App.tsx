import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from "@clerk/react";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Feed from "@/pages/feed";
import Explore from "@/pages/explore";
import SearchPage from "@/pages/search";
import ChatList from "@/pages/chat-list";
import ChatRoom from "@/pages/chat-room";
import Profile from "@/pages/profile";
import Notifications from "@/pages/notifications";
import Upload from "@/pages/upload";
import EditProfile from "@/pages/edit-profile";
import Onboarding from "@/pages/onboarding";
import StatusPage from "@/pages/status";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, refetchOnWindowFocus: false },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorForeground: "hsl(var(--foreground))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorDanger: "hsl(var(--destructive))",
    colorBackground: "hsl(var(--card))",
    colorInput: "hsl(var(--input))",
    colorInputForeground: "hsl(var(--foreground))",
    colorNeutral: "hsl(var(--border))",
    fontFamily: "var(--app-font-sans)",
    borderRadius: "var(--radius)",
  },
  elements: {
    rootBox: "w-full flex items-center justify-center",
    cardBox:
      "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-foreground",
    logoBox: "justify-center mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border border-border bg-background hover:bg-accent",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:opacity-90 font-semibold",
    formFieldInput: "bg-input text-foreground border border-border",
    footerAction: "text-muted-foreground",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 text-destructive border-destructive/20",
    otpCodeFieldInput: "bg-input text-foreground border border-border",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/feed`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/onboarding`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/feed" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Kizchat",
            subtitle: "Sign in to keep chatting, posting, and watching",
          },
        },
        signUp: {
          start: {
            title: "Join Kizchat",
            subtitle: "Create your account to chat, post status, and share videos",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/onboarding">
              <Protected>
                <Onboarding />
              </Protected>
            </Route>
            <Route path="/feed">
              <Protected>
                <Feed />
              </Protected>
            </Route>
            <Route path="/explore">
              <Protected>
                <Explore />
              </Protected>
            </Route>
            <Route path="/search">
              <Protected>
                <SearchPage />
              </Protected>
            </Route>
            <Route path="/chats">
              <Protected>
                <ChatList />
              </Protected>
            </Route>
            <Route path="/chats/:username">
              {(params) => (
                <Protected>
                  <ChatRoom username={params.username} />
                </Protected>
              )}
            </Route>
            <Route path="/notifications">
              <Protected>
                <Notifications />
              </Protected>
            </Route>
            <Route path="/upload">
              <Protected>
                <Upload />
              </Protected>
            </Route>
            <Route path="/me/edit">
              <Protected>
                <EditProfile />
              </Protected>
            </Route>
            <Route path="/status">
              <Protected>
                <StatusPage />
              </Protected>
            </Route>
            <Route path="/settings">
              <Protected>
                <Settings />
              </Protected>
            </Route>
            <Route path="/u/:username">
              {(params) => (
                <Protected>
                  <Profile username={params.username} />
                </Protected>
              )}
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
