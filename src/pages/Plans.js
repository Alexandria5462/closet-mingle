import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const plans = [
  { id:"free", name:"Free", price:"$0", sub:"AI outfit builder only", features:["Upload unlimited clothing items","AI outfit suggestions"], locked:["Live stylist access"] },
  { id:"monthly", name:"Premium Monthly", price:"$9.99", sub:"Unlimited stylist access", badge:"Most popular", features:["Everything in Free","Unlimited stylist chat sessions","Photo sharing with stylist","Saved outfit history"], locked:[] },
  { id:"session", name:"Pay per session", price:"$4.99", sub:"Book when you need it", features:["One live stylist chat session","Photo sharing included","No commitment"], locked:[] },
];

export default function Plans() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { subscriptionTier: selected });
      }
      // In production: redirect to Stripe checkout for paid plans
      // For free plan, just go home
      nav("/home");
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="screen" style={{paddingBottom:0}}>
      <div className="header"><div className="logo">Closet<span>Mingle</span></div></div>
      <div className="body">
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:500,marginBottom:4}}>Choose your plan</div>
          <div style={{fontSize:13,color:"var(--text-secondary)"}}>Upgrade anytime. Cancel anytime.</div>
        </div>
        {plans.map(p=>(
          <div key={p.id} className={`plan-card${selected===p.id?" selected":""}`} onClick={()=>setSelected(p.id)}>
            {p.badge && <div style={{marginBottom:8}}><span className="badge badge-pink">{p.badge}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:15,fontWeight:500}}>{p.name}</div>
                <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{p.sub}</div>
              </div>
              <div style={{fontSize:18,fontWeight:500}}>{p.price}{p.id!=="free"&&<span style={{fontSize:11,color:"var(--text-tertiary)"}}>{p.id==="monthly"?"/mo":"/session"}</span>}</div>
            </div>
            <hr className="divider" />
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {p.features.map(f=><span key={f} style={{fontSize:12,color:"var(--text-secondary)"}}><i className="ti ti-check" style={{color:"var(--success)",fontSize:13}} aria-hidden="true"></i> {f}</span>)}
              {p.locked.map(f=><span key={f} style={{fontSize:12,color:"var(--text-tertiary)"}}><i className="ti ti-x" style={{fontSize:13}} aria-hidden="true"></i> {f}</span>)}
            </div>
          </div>
        ))}
        <button className="btn-pink" onClick={handleSelect} disabled={loading} style={{marginTop:8}}>
          {loading ? <span className="spinner"></span> : "Get started"}
        </button>
      </div>
    </div>
  );
}
