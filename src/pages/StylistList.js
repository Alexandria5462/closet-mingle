import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

function getTierAccess(tier) {
  switch (tier) {
    case "monthly": return { canAccess: true, canChoose: false };
    case "premium_plus": return { canAccess: true, canChoose: true };
    case "session": return { canAccess: true, canChoose: false };
    default: return { canAccess: false, canChoose: false };
  }
}

function matchScore(stylistQuiz, userQuiz) {
  if (!stylistQuiz || !userQuiz) return 0;
  let score = 0;
  ["vibe","occasion","color","pattern","fit"].forEach(f => {
    if (stylistQuiz[f] && userQuiz[f] && stylistQuiz[f] === userQuiz[f]) score++;
  });
  return score;
}

export default function StylistList() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userQuiz, setUserQuiz] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("All");
  const [filterAvail, setFilterAvail] = useState(false);
  const [specialties, setSpecialties] = useState([]);

  const tier = getTierAccess(userProfile?.subscriptionTier);

  useEffect(() => {
    if (tier.canAccess) loadAll();
    else setLoading(false);
  }, [userProfile]);

  async function loadAll() {
    setLoading(true);
    try {
      // Load user quiz
      if (userProfile?.uid) {
        const quizSnap = await getDocs(query(collection(db, "styleQuiz"), where("userId", "==", userProfile.uid)));
        if (!quizSnap.empty) setUserQuiz(quizSnap.docs[0].data()?.answers);
      }

      // Load all stylists
      const stylistSnap = await getDocs(query(collection(db, "users"), where("accountType", "==", "stylist")));
      let all = stylistSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Get quiz data for each stylist
      const withQuiz = await Promise.all(all.map(async s => {
        const sQuizSnap = await getDocs(query(collection(db, "styleQuiz"), where("userId", "==", s.id)));
        const sQuiz = !sQuizSnap.empty ? sQuizSnap.docs[0].data()?.answers : null;
        
          return { ...s, quizAnswers: sQuiz, matchScore: matchScore(sQuiz, userProfile?.uid ? null : null) };
      }));

      // Build specialty list for filter
      const specs = ["All", ...new Set(withQuiz.map(s => s.specialty).filter(Boolean))];
      setSpecialties(specs);
      setStylists(withQuiz);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Apply filters
  const filtered = stylists
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.specialty?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase()))
    .filter(s => filterSpecialty === "All" || s.specialty === filterSpecialty)
    .filter(s => !filterAvail || s.availabilityEnabled)
    .sort((a, b) => {
      if (userQuiz) {
        const scoreA = matchScore(a.quizAnswers, userQuiz);
        const scoreB = matchScore(b.quizAnswers, userQuiz);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      if (a.availabilityEnabled && !b.availabilityEnabled) return -1;
      if (!a.availabilityEnabled && b.availabilityEnabled) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

  if (!tier.canAccess) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Upgrade to chat with stylists</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
              Get access to live personal stylists who can review your closet and build outfits with you.
            </div>
            <button className="btn-pink" style={{ width: "auto", padding: "12px 32px" }} onClick={() => nav("/plans")}>View plans</button>
          </div>
        </div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
      </div>

      <div className="screen">
        <div className="body">

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
            <input className="input-field" placeholder="Search by name, specialty or city..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, marginBottom: 0 }} />
          </div>

          {/* Filters row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <select
              value={filterSpecialty}
              onChange={e => setFilterSpecialty(e.target.value)}
              style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", background: filterSpecialty !== "All" ? "var(--pink-light)" : "var(--bg-card)", color: filterSpecialty !== "All" ? "var(--pink-dark)" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", flex: 1 }}
            >
              {specialties.map(s => <option key={s} value={s}>{s === "All" ? "All specialties" : s}</option>)}
            </select>
            <button
              onClick={() => setFilterAvail(!filterAvail)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "1px solid", cursor: "pointer", whiteSpace: "nowrap", background: filterAvail ? "var(--success)" : "var(--bg-card)", borderColor: filterAvail ? "var(--success)" : "var(--border)", color: filterAvail ? "white" : "var(--text-secondary)" }}
            >
              Online only
            </button>
          </div>

          {/* Quiz match banner */}
          {userQuiz ? (
            <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#065f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>✅ Sorted by your style profile match</span>
              <button onClick={() => nav("/quiz")} style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontSize: 12, fontWeight: 500, textDecoration: "underline" }}>Retake quiz</button>
            </div>
          ) : (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#3730a3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Take the style quiz to get matched with the best stylist</span>
              <button onClick={() => nav("/quiz")} style={{ background: "var(--pink)", border: "none", borderRadius: 20, padding: "4px 12px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", marginLeft: 8 }}>Take quiz</button>
            </div>
          )}

          {!tier.canChoose && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
              Upgrade to <strong>Premium Plus</strong> to personally choose your stylist.
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {filtered.length} stylist{filtered.length !== 1 ? "s" : ""} found
              {search && ` matching "${search}"`}
            </div>
          )}

          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                {stylists.length === 0 ? "No stylists available right now." : "No stylists match your filters."}
              </div>
              {(search || filterSpecialty !== "All" || filterAvail) && (
                <button className="btn-outline" onClick={() => { setSearch(""); setFilterSpecialty("All"); setFilterAvail(false); }} style={{ width: "auto", padding: "8px 20px" }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : filtered.map((s, index) => {
            const score = userQuiz ? matchScore(s.quizAnswers, userQuiz) : 0;
            return (
              <div
                key={s.id}
                style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Avatar */}
                  <div className="avatar" style={{ width: 52, height: 52, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                    {s.photoUrl ? <img src={s.photoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : s.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                    {s.username && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>@{s.username}</div>}
                      {s.isVerified && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Verified</span>}
                      {userQuiz && score > 0 && (
                        <span style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 20, padding: "1px 8px", fontSize: 9, color: "#065f46", fontWeight: 500 }}>
                          {score === 5 ? "Perfect match" : score >= 3 ? "Great match" : "Good match"}
                        </span>
                      )}
                      {index === 0 && userQuiz && score > 0 && (
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
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.about}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
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
                  {/* View profile button */}
                  <button
                    onClick={() => nav(`/stylist/${s.id}`)}
                    style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", fontFamily: "inherit" }}
                  >
                    View profile
                  </button>
                  {/* Chat button */}
                  <button
                    onClick={() => nav(`/chat/${s.id}`)}
                    className="btn-pink"
                    style={{ flex: 1, marginBottom: 0, fontSize: 12, padding: "8px 12px" }}
                  >
                    {tier.canChoose ? "Chat" : "Start session"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TabBar active="stylists" type="client" />
    </>
  );
}
