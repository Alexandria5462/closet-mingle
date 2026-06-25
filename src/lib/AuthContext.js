import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext({});
const DarkModeContext = createContext({ darkMode: false, toggleDarkMode: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubRef = useRef(null);

  // ── Dark mode ─────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    try {
      // Only use saved preference — do NOT follow system dark mode
      // App defaults to light mode unless user explicitly turned on dark mode
      const saved = localStorage.getItem("cm_darkmode");
      if (saved === "true") return true;
      if (saved === "false") return false;
      // No saved preference — default to light mode
      return false;
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
      localStorage.setItem("cm_darkmode", String(darkMode));
    } catch (e) {}
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode(d => !d);
  }

  // ── Real-time profile listener ────────────────────────────
  function subscribeToProfile(uid) {
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    let firstLoad = true;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const profile = { uid, ...snap.data() };
          setUserProfile(profile);
          try { localStorage.setItem("cm_profile", JSON.stringify(profile)); } catch(e) {}
        }
        // Only set loading false after profile is confirmed loaded
        if (firstLoad) {
          firstLoad = false;
          setLoading(false);
        }
      },
      (err) => {
        // permission-denied is expected briefly during sign-out as this
        // listener unmounts — don't log it as a real error.
        if (err?.code !== "permission-denied") console.error("Profile listener error:", err);
        if (firstLoad) { firstLoad = false; setLoading(false); }
      }
    );
    profileUnsubRef.current = unsub;
    return unsub;
  }

  async function signup(email, password, name, accountType, extra = {}) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const profile = {
      uid: result.user.uid, name, email, accountType,
      subscriptionTier: "free",
      createdAt: new Date().toISOString(),
      ...extra,
    };
    await setDoc(doc(db, "users", result.user.uid), profile);
    subscribeToProfile(result.user.uid);
    return result;
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    subscribeToProfile(result.user.uid);
    return result;
  }

  async function updateSubscription(tier) {
    if (!currentUser?.uid) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
      subscriptionTier: tier,
      subscriptionUpdatedAt: new Date().toISOString(),
    });
  }

  async function changePassword(currentPassword, newPassword) {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  async function deleteAccount(password) {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    await deleteDoc(doc(db, "users", currentUser.uid));
    await deleteUser(currentUser);
    try {
      localStorage.removeItem("cm_profile");
      localStorage.removeItem("cm_darkmode");
    } catch(e) {}
  }

  function logout() {
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    setUserProfile(null);
    try { localStorage.removeItem("cm_profile"); } catch(e) {}
    return signOut(auth);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        subscribeToProfile(user.uid);
      } else {
        if (profileUnsubRef.current) {
          profileUnsubRef.current();
          profileUnsubRef.current = null;
        }
        setUserProfile(null);
      }
      // setLoading(false) is handled by subscribeToProfile for logged-in users
      // Only set it false here for logged-out users
      if (!user) setLoading(false);
    });
    return () => {
      unsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const authValue = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    updateSubscription,
    changePassword,
    deleteAccount,
    loading,
  };

  const darkValue = { darkMode, toggleDarkMode };

  return (
    <DarkModeContext.Provider value={darkValue}>
      <AuthContext.Provider value={authValue}>
        {!loading && children}
      </AuthContext.Provider>
    </DarkModeContext.Provider>
  );
}
