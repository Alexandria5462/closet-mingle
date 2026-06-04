import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";

function getTierAccess(tier) {
  switch (tier) {
    case "monthly":
      return { canAccess: true, canChoose: false };
    case "premium_plus":
      return { canAccess: true, canChoose: true };
    case "session":
      return { canAccess: true, canChoose: false };
    default:
      return { canAccess: false, canChoose: false };
  }
}

// Score how well a stylist matches the user's quiz answers
function matchScore(stylistQuiz, userQuiz) {
  if (!stylistQuiz || !userQuiz) return 0;
  let score = 0;
  const fields = ["vibe", "occasion", "color", "pattern", "fit"];
  for (const field of fields) {
    if (stylistQuiz[field] && userQuiz[field] && stylistQuiz[field] === userQuiz[field]) {
      score++;
    }
  }
  return score;
}

export default function StylistList() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userQuiz, setUserQuiz] = useState(null);

  const tier = getTierAccess(userProfile?.subscriptionTier);

  useEffect(() => {
    if (tier.canAccess) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  async function loadAll() {
    setLoading(true);
    try {
      // Load user's quiz answers if they exist
      let quizAnswers = null;
      if (userProfile?.uid) {
        const quizSnap = await getDocs(
          query(collection(db, "styleQuiz"), where("userId", "==", userProfile.uid))
        );
        if (!quizSnap.empty) {
          quizAnswers = quizSnap.docs[0].data()?.answers;
          setUserQuiz(quizAnswers);
        }
      }

      // Load all available stylists
      const stylistSnap = await getDocs(
        query(collection(db, "users"), where("accountType", "==", "stylist"))
      );
      let allStylists = stylistSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load each stylist's quiz profile for matching
      const stylistsWithQuiz = await Promise.all(
        allStylists.map(async (s) => {
          const sQuizSnap = await getDocs(
            query(collection(db, "styleQuiz"), where("userId", "==", s.id))
          );
          const sQuiz = !sQuizSnap.empty ? sQuizSnap.docs[0].data()?.answers : null;
          const score = matchScore(sQuiz, quizAnswers);
          return { ...s, quizAnswers: sQuiz, matchScore: score };
        })
      );

      // Sort: if user has quiz answers sort by match score first
      // then by rating, then by availability
      stylistsWithQuiz.sort((a, b) => {
        if (quizAnswers) {
          // Sort by match score descending
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        }
        // Then by availability
        if (a.availabilityEnabled && !b.availabilityEnabled) return -1;
        if (!a.availabilityEnabled && b.availabilityEnabled) return 1;
        // Then by rating
        return (b.rating || 0) - (a.rating || 0);
      });

      setStylists(stylistsWithQuiz);
    } catch (err) {
      console.error("Stylist list error:", err);
    }
    setLoading(false);
  }

  // No access — show upgrade page
  if (!tier.canAccess) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
            Closet<span>Mingle</span>
          </div>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Upgrade to chat with stylists</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
              Get access to live personal stylists who can review your closet and build outfits with you.
            </div>
            <button className="btn-pink" style={{ width: "auto", padding: "12px 32px" }} onClick={() => nav("/plans")}>
              View plans
            </button>
          </div>
        </div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Closet<span>Mingle</span>
        </div>
      </div>
      <div className="screen">
        <div className="body">
          <div className="section-label">
            {userQuiz ? "Stylists matched to your style" : "Available Stylists"}
          </div>

          {/* Quiz match banner */}
          {userQuiz && (
            <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>✅ Showing stylists matched to your style profile</span>
              <button onClick={() => nav("/quiz")} style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontSize: 12, fontWeight: 500, textDecoration: "underline" }}>
                Retake quiz
              </button>
            </div>
          )}

          {/* No quiz taken yet */}
          {!userQuiz && userProfile?.subscriptionTier !== "free" && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#3730a3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>💡 Take the style quiz to get matched with the best stylist for you</span>
              <button onClick={() => nav("/quiz")} style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", marginLeft: 8 }}>
                Take quiz
              </button>
            </div>
          )}

          {/* Cannot personally choose banner */}
          {!tier.canChoose && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
              💡 Upgrade to <strong>Premium Plus</strong> to personally choose your stylist.
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
              Finding stylists{userQuiz ? " matched to your style" : ""}...
            </div>
          ) : stylists.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                No stylists available right now. Check back soon!
              </div>
            </div>
          ) : stylists.map((s, index) => (
            <div
              key={s.id}
              onClick={() => nav(`/chat/${s.id}`)}
              style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Profile photo */}
                <div className="avatar" style={{ width: 52, height: 52, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                  {s.photoUrl
                    ? <img src={s.photoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : s.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name and badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                    {s.isVerified && (
                      <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Verified</span>
                    )}
                    {/* Match badge */}
                    {userQuiz && s.matchScore > 0 && (
                      <span style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 20, padding: "1px 8px", fontSize: 9, color: "#065f46", fontWeight: 500 }}>
                        {s.matchScore === 5 ? "Perfect match" : s.matchScore >= 3 ? "Great match" : "Good match"}
                      </span>
                    )}
                    {/* Top pick badge */}
                    {index === 0 && userQuiz && s.matchScore > 0 && (
                      <span style={{ background: "var(--pink)", borderRadius: 20, padding: "1px 8px", fontSize: 9, color: "white", fontWeight: 500 }}>
                        ⭐ Top pick
                      </span>
                    )}
                  </div>

                  {s.specialty && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.specialty}</div>
                  )}
                  {s.city && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>📍 {s.city}</div>
                  )}
                  {s.rating > 0 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>
                      {"★".repeat(Math.round(s.rating))}{"☆".repeat(5 - Math.round(s.rating))}
                      <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>({s.rating})</span>
                    </div>
                  )}
                  {s.about && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.about}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className={s.availabilityEnabled ? "online-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: s.availabilityEnabled ? "var(--success)" : "#d1d5db" }}></span>
                    <span style={{ fontSize: 11, color: s.availabilityEnabled ? "var(--success)" : "var(--text-tertiary)" }}>
                      {s.availabilityEnabled ? "Online" : "Offline"}
                    </span>
                  </div>
                  {!tier.canChoose && (
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Random assign</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="stylists" type="client" />
    </>
  );
}
