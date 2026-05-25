import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";

export default function Account() {
  const nav = useNavigate();
  const { userProfile, logout } = useAuth();
  const isStylist = userProfile?.accountType === "stylist";
  const tierLabel = { free:"Free", monthly:"Premium Monthly", session:"Pay per session" }[userProfile?.subscriptionTier] || "Free";

  async function handleLogout() {
    await logout();
    nav("/");
  }

  return (
    <>
      <div className="header"><div className="logo">Closet<span>Mingle</span></div></div>
      <div className="screen">
        <div className="body">
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"16px",background:"var(--bg-card)",borderRadius:"var(--radius)",border:"0.5px solid var(--border)"}}>
            <div className="avatar" style={{background:"var(--pink-light)",color:"var(--pink-dark)",width:56,height:56,fontSize:18}}>
              {userProfile?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:500}}>{userProfile?.name}</div>
              <div style={{fontSize:13,color:"var(--text-secondary)",marginTop:2}}>{userProfile?.email}</div>
              <div style={{marginTop:6}}>
                {isStylist
                  ? <span className="badge badge-green">Stylist</span>
                  : <span className="badge badge-pink">{tierLabel}</span>
                }
              </div>
            </div>
          </div>

          {!isStylist && (
            <div className="card" style={{cursor:"pointer"}} onClick={()=>nav("/plans")}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:500}}>Manage subscription</div>
                  <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{tierLabel}</div>
                </div>
                <i className="ti ti-arrow-right" style={{color:"var(--text-tertiary)"}} aria-hidden="true"></i>
              </div>
            </div>
          )}

          {isStylist && (
            <div className="card">
              <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Stylist profile</div>
              <div style={{fontSize:13,color:"var(--text-secondary)"}}>Specialty: {userProfile?.specialty || "Not set"}</div>
            </div>
          )}

          <div className="card">
            <div style={{fontSize:14,fontWeight:500,marginBottom:12}}>About ClosetMingle</div>
            <div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.6}}>
              ClosetMingle connects you with AI-powered outfit suggestions and real personal stylists. Upload your wardrobe, swipe to build outfits, and chat with stylists who understand your style.
            </div>
          </div>

          <button className="btn-outline" onClick={handleLogout} style={{color:"var(--danger)",borderColor:"var(--danger)",marginTop:8}}>
            <i className="ti ti-logout" aria-hidden="true"></i> Sign out
          </button>
        </div>
      </div>
      <TabBar active="account" type={isStylist?"stylist":"client"} />
    </>
  );
}
