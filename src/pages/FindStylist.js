import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

function getTierAccess(tier) {
  switch (tier) {
    case "monthly":
    case "premium_plus":
    case "session":
      return { canChat: true, canChoose: tier === "premium_plus" };
    default:
      return { canChat: false, canChoose: false };
  }
}

function matchScore(stylistAnswers, userAnswers) {
  if (!stylistAnswers || !userAnswers) return 0;
  let score = 0;
  ["vibe","occasion","color","pattern","fit"].forEach(f => {
    if (stylistAnswers[f] && userAnswers[f] && stylistAnswers[f] === userAnswers[f]) score++;
  });
  return score;
}

export default function FindStylist() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userQuiz, setUserQuiz] = useState(null);
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("All");
  const [specialties, setSpecialties] = useState([]);

  const tier = getTierAccess(userProfile?.subscriptionTier);
  const isFree = !tier.canChat;

  useEffect(() => {
    loadStylists();
  }, [userProfile]);

  async function loadStylists() {
    setLoading(true);
    try {
      // Load user quiz answers for matching
      if (userProfile?.uid) {
        const quizSnap = await getDocs(
          query(collection(db, "styleQuiz"), where("userId", "==", userProfile.uid))
        );
        if (!quizSnap.empty) {
          setUserQuiz(quizSnap.docs[0].data()?.answers);
        }
      }

      // Load all stylists
      const snap = await getDocs(
        query(collection(db, "users"), where("accountType", "==", "stylist"))
      );
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load quiz data for each stylist for matching
      const withData = await Promise.all(all.map(async s => {
        const sQuizSnap = await getDocs(
          query(collection(db, "styleQuiz"), where("userId", "==", s.id))
        );
        const sQuizAnswers = !sQuizSnap.empty ? sQuizSnap.docs[0].data()?.answers : null;
        let reviewCount = 0;
          try {
            const rSnap = await getDocs(query(collection(db, "reviews"), where("targetUserId", "==", s.id)));
            reviewCount = rSnap.size;
          } catch(e) {}
          return { ...s, quizAnswers: sQuizAnswers, reviewCount };
      }));

      const specs = ["All", ...new Set(withData.map(s => s.specialty).filter(Boolean))];
      setSpecialties(specs);
      setStylists(withData);
    } catch (e) {
      console.error("FindStylist load error:", e);
    }
    setLoading(false);
  }

  function handleStylistClick(stylist) {
    if (isFree) {
      // Free users see profile but cannot chat — redirect to plans
      nav(`/stylist/${stylist.id}`);
    } else {
      nav(`/stylist/${stylist.id}`);
    }
  }

  // Filter and sort
  const filtered = stylists
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.specialty?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
    })
    .filter(s => filterSpecialty === "All" || s.specialty === filterSpecialty)
    .filter(s => !filterOnline || s.availabilityEnabled)
    .map(s => ({
      ...s,
      score: userQuiz ? matchScore(s.quizAnswers, userQuiz) : 0,
    }))
    .sort((a, b) => {
      if (userQuiz && b.score !== a.score) return b.score - a.score;
      if (a.availabilityEnabled && !b.availabilityEnabled) return -1;
      if (!a.availabilityEnabled && b.availabilityEnabled) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        <span className="badge badge-pink">Find a Stylist</span>
      </div>

      <div className="screen">
        <div className="body">

          {/* Free account banner */}
          {isFree && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Upgrade to chat with stylists</span>
              <button onClick={() => nav("/plans")} style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "5px 14px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                Upgrade →
              </button>
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
            <input
              className="input-field"
              placeholder="Search by username, name, specialty or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, marginBottom: 0 }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <select
              value={filterSpecialty}
              onChange={e => setFilterSpecialty(e.target.value)}
              style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", background: filterSpecialty !== "All" ? "var(--pink-light)" : "var(--bg-card)", color: filterSpecialty !== "All" ? "var(--pink-dark)" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", flex: 1 }}
            >
              {specialties.map(s => <option key={s} value={s}>{s === "All" ? "All specialties" : s}</option>)}
            </select>
            <button
              onClick={() => setFilterOnline(!filterOnline)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "1px solid", cursor: "pointer", whiteSpace: "nowrap", background: filterOnline ? "var(--success)" : "var(--bg-card)", borderColor: filterOnline ? "var(--success)" : "var(--border)", color: filterOnline ? "white" : "var(--text-secondary)" }}
            >
              🟢 Online
            </button>
          </div>

          {/* Quiz match banner */}
          {userQuiz ? (
            <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46", display: "flex", justifyContent: "space-between" }}>
              <span>✅ Sorted by your style profile match</span>
              <button onClick={() => nav("/quiz")} style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontSize: 12, textDecoration: "underline" }}>Retake quiz</button>
            </div>
          ) : (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#3730a3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Take the style quiz to get matched with the best stylist</span>
              <button onClick={() => nav("/quiz")} style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 500, marginLeft: 8 }}>Take quiz</button>
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {filtered.length} stylist{filtered.length !== 1 ? "s" : ""} found
            </div>
          )}

          {/* Stylist list */}
          {loading ? (
            <SkeletonList count={5} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No stylists found</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                {stylists.length === 0 ? "No stylists are available yet. Check back soon!" : "Try a different search or clear your filters."}
              </div>
              {(search || filterSpecialty !== "All" || filterOnline) && (
                <button className="btn-outline" onClick={() => { setSearch(""); setFilterSpecialty("All"); setFilterOnline(false); }} style={{ width: "auto", padding: "8px 20px" }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : filtered.map((s, index) => (
            <div
              key={s.id}
              onClick={() => handleStylistClick(s)}
              style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Avatar */}
                <div className="avatar" style={{ width: 52, height: 52, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                  {s.photoUrl
                    ? <img src={s.photoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : s.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                    {s.username && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>@{s.username}</div>}
                    {s.isVerified && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Verified</span>}
                    {userQuiz && s.score > 0 && (
                      <span style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 20, padding: "1px 8px", fontSize: 9, color: "#065f46", fontWeight: 500 }}>
                        {s.score === 5 ? "Perfect match" : s.score >= 3 ? "Great match" : "Good match"}
                      </span>
                    )}
                    {index === 0 && userQuiz && s.score > 0 && (
                      <span style={{ background: "var(--pink)", borderRadius: 20, padding: "1px 8px", fontSize: 9, color: "white", fontWeight: 500 }}>Top pick</span>
                    )}
                  </div>
                  {s.specialty && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.specialty}</div>}
                  {s.city && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.city}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    {s.rating > 0 ? (
                      <>
                        <span style={{ fontSize: 12, color: "#c4745a", letterSpacing: 1 }}>
                          {"★".repeat(Math.round(s.rating))}{"☆".repeat(5 - Math.round(s.rating))}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {s.rating} &middot; {s.reviewCount || 0} review{(s.reviewCount || 0) !== 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>No reviews yet</span>
                    )}
                  </div>
                  {s.about && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.about}
                    </div>
                  )}
                </div>

                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.availabilityEnabled ? "var(--success)" : "#d1d5db", display: "inline-block" }}></span>
                    <span style={{ fontSize: 11, color: s.availabilityEnabled ? "var(--success)" : "var(--text-tertiary)" }}>
                      {s.availabilityEnabled ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={e => { e.stopPropagation(); nav(`/stylist/${s.id}`); }}
                  style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontFamily: "inherit" }}
                >
                  View profile
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (isFree) nav("/plans");
                    else nav(`/chat/${s.id}`);
                  }}
                  className="btn-pink"
                  style={{ flex: 1, marginBottom: 0, fontSize: 12, padding: "8px 12px", background: isFree ? "var(--text-tertiary)" : "var(--pink)" }}
                >
                  {isFree ? "🔒 Upgrade to chat" : "Chat"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" type={userProfile?.accountType === "stylist" ? "stylist" : "client"} />
    </>
  );
}
