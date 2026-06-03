import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import "./styles/global.css";
import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import ClientHome from "./pages/ClientHome";
import Closet from "./pages/Closet";
import SwipeOutfits from "./pages/SwipeOutfits";
import LikedItems from "./pages/LikedItems";
import GeneratedOutfits from "./pages/GeneratedOutfits";
import SavedOutfits from "./pages/SavedOutfits";
import StylistList from "./pages/StylistList";
import Chat from "./pages/Chat";
import Account from "./pages/Account";
import StylistHome from "./pages/StylistHome";
import StylistChat from "./pages/StylistChat";
import StyleQuiz from "./pages/StyleQuiz";

function PrivateRoute({ children, accountType }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/" />;
  if (accountType && userProfile?.accountType !== accountType)
    return <Navigate to={userProfile?.accountType === "stylist" ? "/stylist" : "/home"} />;
  return children;
}

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();
  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to={userProfile?.accountType === "stylist" ? "/stylist" : "/home"} /> : <Welcome />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/home" element={<PrivateRoute><ClientHome /></PrivateRoute>} />
      <Route path="/closet" element={<PrivateRoute><Closet /></PrivateRoute>} />
      <Route path="/outfits" element={<PrivateRoute><SwipeOutfits /></PrivateRoute>} />
      <Route path="/liked" element={<PrivateRoute><LikedItems /></PrivateRoute>} />
      <Route path="/generated" element={<PrivateRoute><GeneratedOutfits /></PrivateRoute>} />
      <Route path="/saved" element={<PrivateRoute><SavedOutfits /></PrivateRoute>} />
      <Route path="/stylists" element={<PrivateRoute><StylistList /></PrivateRoute>} />
      <Route path="/chat/:stylistId" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
      <Route path="/stylist" element={<PrivateRoute accountType="stylist"><StylistHome /></PrivateRoute>} />
      <Route path="/quiz" element={<PrivateRoute><StyleQuiz /></PrivateRoute>} />
      <Route path="/stylist/chat/:clientId" element={<PrivateRoute accountType="stylist"><StylistChat /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
