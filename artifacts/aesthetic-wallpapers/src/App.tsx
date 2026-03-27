import { Switch, Route, Router as WouterRouter } from "wouter";
import { useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";

import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import TikTokView from "@/pages/TikTokView";
import PesapalPayment from "@/pages/PesapalPayment";
import PaySuccess from "@/pages/PaySuccess";
import NotFound from "@/pages/not-found";
import { WallpapersPage } from "@/pages/WallpapersPage";
import { MemesPage } from "@/pages/MemesPage";
import { TikToksPage } from "@/pages/TikToksPage";
import { TikTokDownloadPage } from "@/pages/TikTokDownloadPage";
import { MemeMakerPage } from "@/pages/MemeMakerPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AdminGate() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  if (params.get("admin") === "true") {
    return <Admin />;
  }
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminGate} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/wallpapers" component={WallpapersPage} />
      <Route path="/memes" component={MemesPage} />
      <Route path="/tiktoks" component={TikToksPage} />
      <Route path="/tiktok-download" component={TikTokDownloadPage} />
      <Route path="/meme-maker" component={MemeMakerPage} />
      <Route path="/tiktok" component={TikTokView} />
      <Route path="/pay" component={PesapalPayment} />
      <Route path="/pay/success" component={PaySuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          {/* Global snake-lights page border — visible on every page */}
          <div className="page-snake-border" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
