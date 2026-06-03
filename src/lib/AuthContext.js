import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubRef = React.useRef(null);

  // ── Real-time profile listener ────────────────────────────
  // This means ANY change to the user's Firestore document
  // (like a tier change) instantly updates the app everywhere
  function subscribeToProfile(uid) {
    // Unsubscribe from previous listener if any
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    // Listen to real-time changes on user document
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const profile = { uid, ...snap.data() };
          setUserProfile(profile);
          // Keep localStorage in sync for Login.js redirect
          localStorage.setItem("cm_profile", JSON.stringify(profile));
        }
      },
      (err) => {
        console.error("Profile listener error:", err);
      }
    );
    profileUnsubRef.current = unsubscribe;
    return unsubscribe;
  }

  async function signup(email, password, name, accountType, extra = {}) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const profile = {
      uid: result.user.uid,
      name,
      email,
      accountType,
      subscriptionTier: "free",
      createdAt: new Date().toISOString(),
      ...extra,
    };
    await setDoc(doc(db, "users", result.user.uid), profile);
    // Start real-time listener
    subscribeToProfile(result.user.uid);
    return result;
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Start real-time listener — profile will update automatically
    subscribeToProfile(result.user.uid);
    return result;
  }

  // Update subscription tier instantly
  async function updateSubscription(tier) {
    if (!currentUser?.uid) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
      subscriptionTier: tier,
      subscriptionUpdatedAt: new Date().toISOString(),
    });
    // No need to manually setUserProfile — the onSnapshot listener
    // will pick up the change automatically and update everywhere instantly
  }

  function logout() {
    // Clean up real-time listener
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    setUserProfile(null);
    localStorage.removeItem("cm_profile");
    return signOut(auth);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Start real-time profile listener
        subscribeToProfile(user.uid);
      } else {
        // User logged out — clean up
        if (profileUnsubRef.current) {
          profileUnsubRef.current();
          profileUnsubRef.current = null;
        }
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    updateSubscription,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
