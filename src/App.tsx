import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { getCurrentUser, startAutoBackupScheduler, initializeFromDatabase } from "@/lib/store";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Sales from "./pages/Sales";
import Returns from "./pages/Returns";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Workers from "./pages/Workers";
import Attendance from "./pages/Attendance";
import Expenses from "./pages/Expenses";
import SettingsPage from "./pages/SettingsPage";
import WorkerDashboard from "./pages/WorkerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Load data from database on startup
    initializeFromDatabase().then(() => {
      setDbReady(true);
    }).catch(() => {
      setDbReady(true); // fallback to localStorage
    });

    startAutoBackupScheduler(() => {
      const user = getCurrentUser();
      if (user?.role === 'admin') {
        toast.success('✅ تم حفظ نسخة احتياطية تلقائية', {
          description: `${new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}`,
          duration: 5000,
        });
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence>
          {(showSplash || !dbReady) && <SplashScreen onFinish={() => setShowSplash(false)} />}
        </AnimatePresence>
        {!showSplash && dbReady && (
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute adminOnly><Inventory /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
              <Route path="/workers" element={<ProtectedRoute adminOnly><Workers /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute adminOnly><Attendance /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
              <Route path="/my-dashboard" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
