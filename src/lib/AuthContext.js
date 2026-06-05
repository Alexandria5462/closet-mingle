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
import { doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext();
const DarkModeContext = createContext();

export function useAuth() { return useContext(AuthContext); }
export function useDarkMode() { return useContext(DarkModeContext); }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("cm_darkmode") === "true" ||
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });
  const profileUnsubRef = useRef(null);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("cm_darkmode", darkMode);
  }, [darkMode]);

  function toggleDarkMode() { setDarkMode(d => !d); }

  function subscribeToProfile(uid) {
    if (profileUnsubRef.current) { profileUnsubRef.current(); profileUnsubRef.current = null; }
    const unsub = onSnapshot(doc(db, "users", uid), snap => {
      if (snap.exists()) {
        const profile = { uid, ...snap.data() };
        setUserProfile(profile);
        localStorage.setItem("cm_profile", JSON.stringify(profile));
      }
    }, err => console.error("Profile listener error:", err));
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
    localStorage.removeItem("cm_profile");
    localStorage.removeItem("cm_darkmode");
  }

  function logout() {
    if (profileUnsubRef.current) { profileUnsubRef.current(); profileUnsubRef.current = null; }
    setUserProfile(null);
    localStorage.removeItem("cm_profile");
    return signOut(auth);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) { subscribeToProfile(user.uid); }
      else {
        if (profileUnsubRef.current) { profileUnsubRef.current(); profileUnsubRef.current = null; }
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => { unsub(); if (profileUnsubRef.current) profileUnsubRef.current(); };
  }, []);

  const value = { currentUser, userProfile, signup, login, logout, updateSubscription, changePassword, deleteAccount, loading };

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <AuthContext.Provider value={value}>
        {!loading && children}
      </AuthContext.Provider>
    </DarkModeContext.Provider>
  );
}
