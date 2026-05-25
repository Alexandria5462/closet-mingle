import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const nav = useNavigate();
  return (
    <div className="screen" style={{paddingBottom:0}}>
      <div style={{padding:"48px 24px 24px",textAlign:"center"}}>
        <div className="logo" style={{fontSize:38,marginBottom:8}}>Closet<span>Mingle</span></div>
        <p style={{fontSize:15,color:"var(--text-secondary)",marginBottom:36}}>Your AI stylist, your real stylist, your closet.</p>
        <div style={{background:"var(--bg)",borderRadius:"var(--radius)",padding:20,marginBottom:28,textAlign:"left"}}>
          {[["ti-sparkles","AI outfit builder from your real closet"],["ti-message-circle","Live personal stylists via chat"],["ti-photo","Share outfit photos with your stylist"],["ti-crown","Monthly or pay-per-session plans"]].map(([icon,text])=>(
            <div key={icon} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <i className={`ti ${icon}`} style={{fontSize:20,color:"var(--pink)"}} aria-hidden="true"></i>
              <span style={{fontSize:14,color:"var(--text)"}}>{text}</span>
            </div>
          ))}
        </div>
        <button className="btn-pink" onClick={()=>nav("/signup")}>Create an account</button>
        <button className="btn-outline" onClick={()=>nav("/login")}>Sign in</button>
      </div>
    </div>
  );
}
