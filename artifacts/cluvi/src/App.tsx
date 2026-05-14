import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Settings from "./pages/settings";
import Upgrade from "./pages/upgrade";
import Upload from "./pages/upload";
import PackDetail from "./pages/pack-detail";
import Flashcards from "./pages/flashcards";
import Quiz from "./pages/quiz";
import ExamPrep from "./pages/exam-prep";
import Tutor from "./pages/tutor";
import Admin from "./pages/admin";
import Rooms from "./pages/rooms";
import Profile from "./pages/profile";

const queryClient = new QueryClient();

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

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkProviderWithRoutes() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "hsl(262 80% 60%)",
          colorBackground: "hsl(224 71% 7%)",
        }
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/upload"><ProtectedRoute component={Upload} /></Route>
            <Route path="/pack/:id"><ProtectedRoute component={PackDetail} /></Route>
            <Route path="/flashcards/:id"><ProtectedRoute component={Flashcards} /></Route>
            <Route path="/quiz/:id"><ProtectedRoute component={Quiz} /></Route>
            <Route path="/exam/:id"><ProtectedRoute component={ExamPrep} /></Route>
            <Route path="/tutor"><ProtectedRoute component={Tutor} /></Route>
            <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
            <Route path="/upgrade"><ProtectedRoute component={Upgrade} /></Route>
            <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
            <Route path="/rooms"><ProtectedRoute component={Rooms} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
            
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
