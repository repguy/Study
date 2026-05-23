import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef, lazy, Suspense } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("./pages/home"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Settings = lazy(() => import("./pages/settings"));
const Upgrade = lazy(() => import("./pages/upgrade"));
const Upload = lazy(() => import("./pages/upload"));
const PackDetail = lazy(() => import("./pages/pack-detail"));
const Flashcards = lazy(() => import("./pages/flashcards"));
const Quiz = lazy(() => import("./pages/quiz"));
const ExamPrep = lazy(() => import("./pages/exam-prep"));
const Tutor = lazy(() => import("./pages/tutor"));
const Admin = lazy(() => import("./pages/admin"));
const Rooms = lazy(() => import("./pages/rooms"));
const Profile = lazy(() => import("./pages/profile"));
const SharedPack = lazy(() => import("./pages/shared-pack"));
const Payments = lazy(() => import("./pages/payments"));
const PaymentSuccess = lazy(() => import("./pages/payment-success"));

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
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
        <Suspense fallback={<PageLoader />}><Home /></Suspense>
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Suspense fallback={<PageLoader />}><Component /></Suspense>
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
            <Route path="/upgrade/success"><ProtectedRoute component={PaymentSuccess} /></Route>
            <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
            <Route path="/rooms"><ProtectedRoute component={Rooms} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
            <Route path="/payments"><ProtectedRoute component={Payments} /></Route>

            <Route path="/shared/:token">
              <Suspense fallback={<PageLoader />}><SharedPack /></Suspense>
            </Route>

            <Route>
              <Suspense fallback={<PageLoader />}><NotFound /></Suspense>
            </Route>
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
