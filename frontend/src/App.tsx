import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import AdminRoute from "@/components/AdminRoute";
import UserRoute from "@/components/UserRoute";

// Layouts
import Layout from "@/components/layout/Layout";
import PublicLayout from "@/components/layout/PublicLayout";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import NewOrder from "@/pages/NewOrder";
import OrdersHistory from "@/pages/OrdersHistory";
import PaymentHistory from "@/pages/PaymentHistory";
import TopUpAccount from "@/pages/TopUpAccount";
import Help from "@/pages/Help";
import AdminPage from "@/pages/AdminPage";
import ReferralPage from "@/pages/ReferralPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route element={
                <PublicRoute>
                  <PublicLayout />
                </PublicRoute>
              }>
                <Route index element={<Home />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
              </Route>

              {/* Protected routes for regular users */}
              <Route element={
                <UserRoute>
                  <AppProvider>
                    <Toaster />
                    <Sonner />
                    <Layout />
                  </AppProvider>
                </UserRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="order/new" element={<NewOrder />} />
                <Route path="orders/history" element={<OrdersHistory />} />
                <Route path="payments/history" element={<PaymentHistory />} />
                <Route path="account/topup" element={<TopUpAccount />} />
                <Route path="referral" element={<ReferralPage />} />
                <Route path="help" element={<Help />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={
                <AdminRoute>
                  <AppProvider>
                    <Toaster />
                    <Sonner />
                    <Layout />
                  </AppProvider>
                </AdminRoute>
              }>
                <Route path="/" element={<AdminPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>

              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;