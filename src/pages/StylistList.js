import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../Components/TabBar";

const BG_COLORS = ["#E1F5EE","#FBEAF0","#E6F1FB","#FAEEDA","#F0E6FB"];
const TEXT_COLORS = ["#085041","#72243E","#0C447C","#633806","#3D0C63"];

export default function StylistList() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStylists() {
      const q = query(collection(db,"users"), where("accountType","==","stylist"));
      const snap = await getDocs(q);
      setStylists(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }
    fetchStylists();
  }, []);

  const isPremium = userProfile?.subscriptionTier === "monthly" || userProfile?.subscriptionTier === "session";

  if (!isPremium) {
    return (
      <>
        <div className="header"><div className="logo">Closet<span>Mingle</span></div></div>
        <div className="screen">
          <div style={{textAlign:"center",padding:"60px 24px"}}>
            <div style={{fontSize:40,marginBottom:16}}>💬</div>
            <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Upgrade to chat with stylists</div>
            <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:24}}>Get access to live personal stylists who can review your closet and build outfits with you.</div>
            <button className="btn-pink" style={{width:"auto",padding:"12px 32px"}} onClick={()=>nav("/plans")}>View plans</button>
          </div>
        </div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  return (
    <>
      <div className="header"><div className="logo">Closet<span>Mingle</span></div></div>
      <div className="screen">
        <div className="body">
          <div className="section-label">Available stylists</div>
          {loading ? (
            <div style={{textAlign:"center",padding:40,color:"var(--text-secondary)"}}>Finding stylists...</div>
          ) : stylists.length === 0 ? (
            <div style={{textAlign:"center",padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>🔍</div>
              <div style={{fontSize:14,color:"var(--text-secondary)"}}>No stylists available right now. Check back soon!</div>
            </div>
          ) : stylists.map((s,i)=>(
            <div key={s.id} onClick={()=>nav(`/chat/${s.id}`)} style={{display:"flex",alignItems:"center",gap:12,padding:14,background:"var(--bg-card)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",marginBottom:10,cursor:"pointer"}}>
              <div className="avatar" style={{background:BG_COLORS[i%5],color:TEXT_COLORS[i%5],width:48,height:48,fontSize:15}}>
                {s.name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{s.name}</div>
                <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{s.specialty || "General styling"}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                  <span className="online-dot"></span>
                  <span style={{fontSize:11,color:"var(--success)"}}>Online now</span>
                </div>
              </div>
              <i className="ti ti-arrow-right" style={{color:"var(--text-tertiary)"}} aria-hidden="true"></i>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="stylists" type="client" />
    </>
  );
}
