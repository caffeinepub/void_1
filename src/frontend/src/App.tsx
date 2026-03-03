import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import CosmicBackground from "./components/CosmicBackground";
import Navigation from "./components/Navigation";
import OfflineIndicator from "./components/OfflineIndicator";
import ProfileSetupModal from "./components/ProfileSetupModal";
import SplashScreen from "./components/SplashScreen";
import VoidSage from "./components/VoidSage";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import CreatorPortal from "./pages/CreatorPortal";
import DMList from "./pages/DMList";
import DMView from "./pages/DMView";
import DarkRoom from "./pages/DarkRoom";
import GroupView from "./pages/GroupView";
import InviteLanding from "./pages/InviteLanding";
import LightRoom from "./pages/LightRoom";
import MiningPage from "./pages/MiningPage";
import NFTMarketplace from "./pages/NFTMarketplace";
import ProfileSettings from "./pages/ProfileSettings";
import ValueOfferings from "./pages/ValueOfferings";

// Root layout component
function RootLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Clear query cache on logout
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  if (isInitializing) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <CosmicBackground />
        <div className="relative z-10 text-center">
          <div className="void-glow-text text-4xl font-bold tracking-widest mb-4">
            VOID
          </div>
          <div className="text-void-gold/60 text-sm animate-pulse">
            Initializing the void...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: "#000000", minHeight: "100vh" }}>
        <CosmicBackground />
        <OfflineIndicator />
        <SplashScreen />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: "#000000" }}
      className="h-dvh overflow-hidden flex flex-col"
    >
      <CosmicBackground />
      <OfflineIndicator />
      {showProfileSetup && <ProfileSetupModal />}
      <div className="relative z-10 flex flex-1 min-h-0">
        <Navigation />
        <main className="flex-1 flex flex-col min-h-0 md:ml-64 pt-14 md:pt-0 pb-16 md:pb-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      {/* VOID Sage — floating orb, appears on all authenticated screens */}
      <VoidSage />
      <Toaster theme="dark" />
    </div>
  );
}

// Index redirect component — must be a proper named React component
function IndexRedirect() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: "/light-room" });
    }
  }, [identity, navigate]);

  return null;
}

// Route definitions
const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRedirect,
});

const lightRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/light-room",
  component: LightRoom,
});

const darkRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dark-room",
  component: DarkRoom,
});

const dmListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dms",
  component: DMList,
});

const dmViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dms/$channelId",
  component: DMView,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileSettings,
});

const miningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mining",
  component: MiningPage,
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$token",
  component: InviteLanding,
});

const creatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/creator",
  component: CreatorPortal,
});

const groupViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups/$groupId",
  component: GroupView,
});

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft",
  component: NFTMarketplace,
});

const offeringsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/offerings",
  component: ValueOfferings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  lightRoomRoute,
  darkRoomRoute,
  dmListRoute,
  dmViewRoute,
  profileRoute,
  miningRoute,
  inviteRoute,
  creatorRoute,
  groupViewRoute,
  nftRoute,
  offeringsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
