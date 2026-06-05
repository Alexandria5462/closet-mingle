import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import NotificationBanner from "./components/NotificationBanner";
import "./styles/global.css";

import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import Onboarding from "./pages/Onboarding";
import ClientHome from "./pages/ClientHome";
import Closet from "./pages/Closet";
import SwipeOutfits from "./pages/SwipeOutfits";
import LikedItems from "./pages/LikedItems";
import GeneratedOutfits from "./pages/GeneratedOutfits";
import SavedOutfits from "./pages/SavedOutfits";
import StylistList from "./pages/StylistList";
import StylistProfile from "./pages/StylistProfile";
import FindStylist from "./pages/FindStylist";
import Chat from "./pages/Chat";
import Account from "./pages/Account";
import StyleQuiz from "./pages/StyleQuiz";
import Referral from "./pages/Referral";
import GiftSubscription from "./pages/GiftSubscription";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import StylistHome from "./pages/StylistHome";
import ClientSessions from "./pages/ClientSessions";
import StylistChat from "./pages/StylistChat";
import StylistMessages from "./pages/StylistMessages";
import StylistAnalytics from "./pages/StylistAnalytics";
import StylistClients from "./pages/StylistClients";

function PrivateRoute({ children, accountType }) {
  const { currentUser, userProfile, loading } = useAuth();
  // Wait for auth to finish loading
  if (loading) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  // Wait for profile to load before checking accountType
  if (accountType && userProfile && userProfile.accountType !== accountType)
    return <Navigate to={userProfile.accountType === "stylist" ? "/stylist" : "/home"} replace />;
  return children;
}

function AppRoutes() {
  const { currentUser, userProfile, loading } = useAuth();

  // While auth is loading show nothing to prevent flash
  if (loading) return null;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={currentUser ? <Navigate to={userProfile?.accountType === "stylist" ? "/stylist" : "/home"} /> : <Welcome />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Client */}
      <Route path="/plans" element={<Plans />} />
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
      <Route path="/home" element={<PrivateRoute><ClientHome /></PrivateRoute>} />
      <Route path="/closet" element={<PrivateRoute><Closet /></PrivateRoute>} />
      <Route path="/outfits" element={<PrivateRoute><SwipeOutfits /></PrivateRoute>} />
      <Route path="/liked" element={<PrivateRoute><LikedItems /></PrivateRoute>} />
      <Route path="/generated" element={<PrivateRoute><GeneratedOutfits /></PrivateRoute>} />
      <Route path="/saved" element={<PrivateRoute><SavedOutfits /></PrivateRoute>} />
      <Route path="/stylists" element={<PrivateRoute><StylistList /></PrivateRoute>} />
      <Route path="/find-stylist" element={<PrivateRoute><FindStylist /></PrivateRoute>} />
      <Route path="/stylist/:stylistId" element={<PrivateRoute><StylistProfile /></PrivateRoute>} />
      <Route path="/chat/:stylistId" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
      <Route path="/quiz" element={<PrivateRoute><StyleQuiz /></PrivateRoute>} />
      <Route path="/referral" element={<PrivateRoute><Referral /></PrivateRoute>} />
      <Route path="/gift" element={<PrivateRoute><GiftSubscription /></PrivateRoute>} />
      <Route path="/my-sessions" element={<PrivateRoute><ClientSessions /></PrivateRoute>} />

      {/* Stylist */}
      <Route path="/stylist" element={<PrivateRoute accountType="stylist"><StylistHome /></PrivateRoute>} />
      <Route path="/stylist/messages" element={<PrivateRoute accountType="stylist"><StylistMessages /></PrivateRoute>} />
      <Route path="/stylist/clients" element={<PrivateRoute accountType="stylist"><StylistClients /></PrivateRoute>} />
      <Route path="/stylist/analytics" element={<PrivateRoute accountType="stylist"><StylistAnalytics /></PrivateRoute>} />
      <Route path="/stylist/chat/:clientId" element={<PrivateRoute accountType="stylist"><StylistChat /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <NotificationBanner />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
