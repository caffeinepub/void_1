import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import ProfileSetupModal from './components/ProfileSetupModal';
import Navigation from './components/Navigation';
import OfflineIndicator from './components/OfflineIndicator';
import LightRoom from './pages/LightRoom';
import DarkRoom from './pages/DarkRoom';
import DMList from './pages/DMList';
import DMView from './pages/DMView';
import ProfileSettings from './pages/ProfileSettings';
import MiningPage from './pages/MiningPage';
import InviteLanding from './pages/InviteLanding';
import { Toaster } from '@/components/ui/sonner';

// Root layout component
function RootLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Clear query cache on logout
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
    }
  }, [isAuthenticated, queryClient]);

  if (isInitializing) {
    return (
      <div className="void-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="void-glow-text text-4xl font-bold tracking-widest mb-4">VOID</div>
          <div className="text-void-gold/60 text-sm animate-pulse">Initializing the void...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <OfflineIndicator />
        <SplashScreen />
      </>
    );
  }

  return (
    <>
      <OfflineIndicator />
      {showProfileSetup && <ProfileSetupModal />}
      <div className="void-bg min-h-screen flex">
        <Navigation />
        <main className="flex-1 flex flex-col min-h-screen md:ml-64">
          <Outlet />
        </main>
      </div>
      <Toaster theme="dark" />
    </>
  );
}

// Index redirect component — must be a proper named React component
function IndexRedirect() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: '/light-room' });
    }
  }, [identity, navigate]);

  return null;
}

// Route definitions
const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

const lightRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/light-room',
  component: LightRoom,
});

const darkRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dark-room',
  component: DarkRoom,
});

const dmListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dms',
  component: DMList,
});

const dmViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dms/$channelId',
  component: DMView,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfileSettings,
});

const miningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mining',
  component: MiningPage,
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: InviteLanding,
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
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
