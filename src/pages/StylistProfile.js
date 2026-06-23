import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import Reviews from "../components/Reviews";
import BookingModal from "../components/BookingModal";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";
import { notifyStylistNewFollower } from "../lib/notifications";
import ReportUserModal from "../components/ReportUserModal";

// ── Lightbox carousel with touch swipe support ────────────────
function LightboxCarousel({ images, index, labels, onChange, onClose }) {
  const touchStartX = React.useRef(0);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && index < images.length - 1) onChange(index + 1);
      else if (diff < 0 && index > 0) onChange(index - 1);
    }
  }

  return (
    <div
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%", width: 38, height: 38, color: "white", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Close"
      >✕</button>

      {/* Counter */}
      {images.length > 1 && (
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>
            {index + 1} / {images.length}
          </div>
          {labels && labels[index] && (
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 }}>
              {labels[index]}
            </div>
          )}
        </div>
      )}

      {/* Main image */}
      <img
        src={images[index]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 10, userSelect: "none", pointerEvents: "auto" }}
      />

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index - 1); }}
          style={{ position: "absolute", left: 10, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%", width: 44, height: 44, color: "white", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Previous"
        >‹</button>
      )}

      {/* Next arrow */}
      {index < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index + 1); }}
          style={{ position: "absolute", right: 10, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%", width: 44, height: 44, color: "white", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Next"
        >›</button>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {images.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); onChange(i); }}
              style={{ width: i === index ? 20 : 8, height: 8, borderRadius: 4, background: i === index ? "white" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StylistProfile() {
  const { stylistId } = useParams();
  const nav = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const isStylist = userProfile?.accountType === "stylist";
  const [stylist, setStylist] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images: [], index: 0 }

  // Any paid tier = Premium (monthly, plus legacy premium_plus and session)
  const canBook = !isStylist &&
    ["monthly", "premium_plus", "session"].includes(userProfile?.subscriptionTier);
  const isFreeClient = !isStylist && !canBook;
  const hasRates = stylist?.monthlyRate || stylist?.sessionRate;

  useEffect(() => {
    loadStylist();
  }, [stylistId]);

  async function loadStylist() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "users", stylistId));
      if (snap.exists()) setStylist(snap.data());
      if (currentUser?.uid && !isStylist) {
        try {
          const blockSnap = await getDocs(query(collection(db, "blockedUsers"), where("stylistId", "==", stylistId), where("clientId", "==", currentUser.uid)));
          if (!blockSnap.empty) { nav("/find-stylist", { replace: true }); return; }
        } catch(e) {}
      }

      // Load portfolio
      const portSnap = await getDocs(
        query(collection(db, "savedOutfits"),
          where("userId", "==", stylistId),
          where("isPortfolio", "==", true)
        )
      );
      setPortfolio(portSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load reviews for rating display
      const reviewSnap = await getDocs(
        query(collection(db, "reviews"), where("targetUserId", "==", stylistId))
      );
      setReviews(reviewSnap.docs.map(d => d.data()));
      // Check if already following
      if (userProfile?.uid) {
        const followSnap = await getDocs(
          query(collection(db, "follows"),
            where("followerId", "==", userProfile.uid),
            where("stylistId", "==", stylistId)
          )
        );
        if (!followSnap.empty) {
          setIsFollowing(true);
          setFollowDocId(followSnap.docs[0].id);
        }
      }
    } catch (e) {
      console.error("Stylist profile error:", e);
    }
    setLoading(false);
  }

  async function toggleFollow() {
    if (!userProfile?.uid) return;
    setFollowLoading(true);
    try {
      if (isFollowing && followDocId) {
        await deleteDoc(doc(db, "follows", followDocId));
        setIsFollowing(false);
        setFollowDocId(null);
      } else {
        const newFollow = await addDoc(collection(db, "follows"), {
          followerId: userProfile.uid,
          followerName: userProfile?.name || "",
          stylistId,
          stylistName: stylist?.name || "",
          createdAt: new Date().toISOString(),
        });
        setIsFollowing(true);
        setFollowDocId(newFollow.id);
        // Notify stylist of new follower
        notifyStylistNewFollower(stylistId, userProfile?.name || "Someone");
      }
    } catch (e) { console.error(e); }
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}><em>closet</em><span>mingle</span></div>
        </div>
        <div className="screen"><div className="body"><SkeletonList count={3} /></div></div>
        <TabBar active={isStylist ? "clients" : "stylists"} type={isStylist ? "stylist" : "client"} />
      </>
    );
  }

  if (!stylist) {
    return (
      <>
        <div className="header">
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <div style={{ fontSize: 16 }}>Stylist not found</div>
          </div>
        </div>
        <TabBar active={isStylist ? "clients" : "stylists"} type={isStylist ? "stylist" : "client"} />
      </>
    );
  }

  const initials = stylist.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST";
  const avgRating = reviews.length > 0
    ? parseFloat((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}><em>closet</em><span>mingle</span></div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          {/* Profile header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="avatar" style={{ width: 80, height: 80, background: "var(--avatar-bg)", color: "var(--pink-dark)", fontSize: 24, overflow: "hidden", margin: "0 auto 12px", border: "2px solid var(--border)" }}>
              {stylist.photoUrl
                ? <img src={stylist.photoUrl} alt={stylist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{stylist.name}</div>
              {stylist.isVerified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Verified</span>}
            </div>
            {stylist.username && (
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 4 }}>@{stylist.username}</div>
            )}
            {stylist.specialty && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 8, padding: "0 12px" }}>
                {stylist.specialty.split(", ").filter(Boolean).map((sp, i) => (
                  <span key={i} style={{ fontSize: 11, background: "var(--avatar-bg)", border: "0.5px solid var(--border)", borderRadius: 20, padding: "3px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {sp}
                  </span>
                ))}
              </div>
            )}
            {/* Star rating directly below specialty */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              {avgRating > 0 ? (
                <>
                  <span style={{ fontSize: 16, color: "#c4745a", letterSpacing: 1 }}>
                    {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                    {avgRating} &middot; {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No reviews yet</span>
              )}
            </div>
            {stylist.city && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{stylist.city}</div>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, background: stylist.availabilityEnabled ? "#d1fae5" : "var(--bg)", border: `1px solid ${stylist.availabilityEnabled ? "#6ee7b7" : "var(--border)"}`, borderRadius: 20, padding: "2px 10px", color: stylist.availabilityEnabled ? "#065f46" : "var(--text-tertiary)" }}>
                {stylist.availabilityEnabled ? "🟢 Available now" : "💬 Send a message"}
              </span>
              {stylist.availabilityHours && (
                <span style={{ fontSize: 11, background: "var(--bg)", borderRadius: 20, padding: "2px 10px", border: "0.5px solid var(--border)", color: "var(--text-secondary)" }}>
                  🕐 {stylist.availabilityHours}
                </span>
              )}
            </div>
          </div>

          {/* Pricing pills */}
          {hasRates && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
              {stylist.monthlyRate && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500 }}>
                  🗓️ <strong>${stylist.monthlyRate}</strong>/mo
                </div>
              )}
              {stylist.sessionRate && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500 }}>
                  ✨ <strong>${stylist.sessionRate}</strong>/session
                </div>
              )}
            </div>
          )}

          {/* Book + Follow buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            {!isStylist && !isFreeClient && (
              <button
                className="btn-pink"
                onClick={() => hasRates ? setShowBooking(true) : nav(`/chat/${stylistId}`)}
                style={{ flex: 2, marginBottom: 0 }}
              >
                {hasRates ? `Book ${stylist.name?.split(" ")[0]}` : "Message stylist"}
              </button>
            )}
            {!isStylist && isFreeClient && (
              <button className="btn-pink" onClick={() => nav("/plans")} style={{ flex: 2, marginBottom: 0 }}>
                Upgrade to book
              </button>
            )}
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                flex: 1, padding: "13px 16px", borderRadius: "var(--radius-sm)",
                border: `1.5px solid ${isFollowing ? "var(--border)" : "var(--pink)"}`,
                background: isFollowing ? "var(--bg-card)" : "var(--pink-light)",
                color: isFollowing ? "var(--text-secondary)" : "var(--pink-dark)",
                cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
              }}
            >
              {followLoading ? "..." : isFollowing ? "Following ✓" : "Follow"}
            </button>
            {!isStylist && (
              <button
                onClick={() => setShowReport(true)}
                title="Report this stylist"
                style={{
                  flexShrink: 0, width: 44, borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--border)", background: "var(--bg-card)",
                  color: "var(--text-tertiary)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <i className="ti ti-flag" style={{ fontSize: 16 }} aria-hidden="true"></i>
              </button>
            )}
          </div>

          {/* Pre-launch note — remove once Stripe is activated */}
          {!isStylist && !isFreeClient && hasRates && !stylist?.stripeOnboardingComplete && (
            <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "8px 14px", marginBottom: 12, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
              💬 Payments launching soon — book now to connect directly
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, borderBottom: "0.5px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
            {["about", "portfolio", "reviews"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: activeTab === tab ? "var(--pink)" : "var(--text-secondary)", borderBottom: activeTab === tab ? "2px solid var(--pink)" : "none", paddingBottom: 4, textTransform: "capitalize" }}>
                {tab}
              </button>
            ))}
          </div>

          {/* About tab */}
          {activeTab === "about" && (
            <div>
              {stylist.about && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>About</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{stylist.about}</div>
                </div>
              )}
              {stylist.yearsExperience && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Experience</div>
                  <div style={{ fontSize: 14 }}>{stylist.yearsExperience} year{stylist.yearsExperience !== 1 ? "s" : ""} of styling</div>
                </div>
              )}
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Stats</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{stylist.totalSessions || 0}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sessions</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{avgRating || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Avg rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio tab */}
          {activeTab === "portfolio" && (
            portfolio.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <i className="ti ti-photo" style={{ fontSize: 40, color: "var(--text-tertiary)", display: "block", marginBottom: 8 }} aria-hidden="true"></i>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No uploads yet</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  This stylist hasn't added portfolio photos yet. Check back soon!
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {(() => {
                  // Build one flat list of every image across all portfolio outfits,
                  // so swiping in the lightbox can move between outfits, not just within one.
                  const allImages = [];
                  portfolio.forEach(item => {
                    (item.itemImages || []).filter(Boolean).forEach(img => {
                      allImages.push({ src: img, outfitName: item.outfitName });
                    });
                  });

                  return portfolio.map(item => {
                    const images = (item.itemImages || []).filter(Boolean);
                    const globalStartIndex = allImages.findIndex(
                      g => g.src === images[0] && g.outfitName === item.outfitName
                    );
                    return (
                      <div key={item.id} style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)", cursor: "pointer" }}
                        onClick={() => images.length > 0 && setLightbox({
                          images: allImages.map(g => g.src),
                          labels: allImages.map(g => g.outfitName),
                          index: Math.max(globalStartIndex, 0),
                        })}>
                        <div style={{ display: "flex", gap: 3, padding: 6 }}>
                          {images.slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="" style={{ flex: 1, height: 80, objectFit: "cover", borderRadius: 6 }} />
                          ))}
                        </div>
                        <div style={{ padding: "4px 8px 8px", fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{item.outfitName}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            )
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <Reviews targetUserId={stylistId} targetUserName={stylist.name} />
          )}
        </div>
      </div>

      <TabBar active={isStylist ? "clients" : "stylists"} type={isStylist ? "stylist" : "client"} />

      {showBooking && (
        <BookingModal stylist={stylist} stylistId={stylistId} onClose={() => setShowBooking(false)} />
      )}

      {/* Portfolio lightbox — swipe left/right or tap arrows */}
      {lightbox && (
        <LightboxCarousel
          images={lightbox.images}
          index={lightbox.index}
          labels={lightbox.labels}
          onChange={i => setLightbox(prev => ({ ...prev, index: i }))}
          onClose={() => setLightbox(null)}
        />
      )}

      {showReport && (
        <ReportUserModal
          reportedUserId={stylistId}
          reportedUserName={stylist?.name}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
