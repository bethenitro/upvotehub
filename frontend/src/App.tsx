
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

              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <AppProvider>
                    <Toaster />
                    <Sonner />
                    <Layout />
                  </AppProvider>
                </ProtectedRoute>
              }              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="order/new" element={<NewOrder />} />
                <Route path="orders/history" element={<OrdersHistory />} />
                <Route path="payments/history" element={<PaymentHistory />} />
                <Route path="account/topup" element={<TopUpAccount />} />
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
