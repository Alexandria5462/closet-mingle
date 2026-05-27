import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    setUserProfile(profile);
    localStorage.setItem("cm_profile", JSON.stringify(profile));
    return result;
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", result.user.uid));
    if (snap.exists()) {
      const profile = snap.data();
      setUserProfile(profile);
      localStorage.setItem("cm_profile", JSON.stringify(profile));
    }
    return result;
  }

  function logout() {
    setUserProfile(null);
    localStorage.removeItem("cm_profile");
    return signOut(auth);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const profile = snap.data();
          setUserProfile(profile);
          localStorage.setItem("cm_profile", JSON.stringify(profile));
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = { currentUser, userProfile, signup, login, logout, loading };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
