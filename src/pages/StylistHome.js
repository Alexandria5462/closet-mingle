import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../Components/TabBar";

export default function StylistHome() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const firstName = userProfile?.name?.split(" ")[0] || "there";

  useEffect(() => {
    async function fetchConvos() {
      if (!userProfile?.uid) return;
      const q = query(collection(db,"messages"), where("conversationId",">=",userProfile.uid), orderBy("createdAt","desc"), limit(50));
      const snap = await getDocs(q);
      const seen = new Set();
      const convos = [];
      snap.docs.forEach(d=>{
        const data = d.data();
        const clientId = data.conversationId.replace(userProfile.uid,"").replace("_","");
        if (!seen.has(clientId) && clientId) { seen.add(clientId); convos.push({clientId, lastMessage:data.content, lastTime:data.createdAt, type:data.type}); }
      });
      setConversations(convos);
      setLoading(false);
    }
    fetchConvos();
  }, [userProfile]);

  const BG = ["#FBEAF0","#E6F1FB","#FAEEDA","#E1F5EE","#F0E6FB"];
  const TC = ["#72243E","#0C447C","#633806","#085041","#3D0C63"];

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="badge badge-green">Stylist</span>
          <div className="avatar" style={{background:"#E1F5EE",color:"#085041",width:36,height:36,fontSize:13}}>
            {userProfile?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
          </div>
        </div>
      </div>
      <div className="screen">
        <div className="body">
          <div style={{fontSize:20,fontWeight:500,marginBottom:4}}>Welcome, {firstName}</div>
          <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:20}}>
            {conversations.length > 0 ? `${conversations.length} active conversation${conversations.length!==1?"s":""}` : "No active sessions yet"}
          </div>

          <div style={{display:"flex",gap:10,marginBottom:20}}>
            <div className="stat-card"><div className="stat-label">Clients</div><div className="stat-val">{conversations.length}</div></div>
            <div className="stat-card"><div className="stat-label">Specialty</div><div className="stat-val" style={{fontSize:12,paddingTop:4}}>{userProfile?.specialty||"General"}</div></div>
          </div>

          <div className="section-label">Recent conversations</div>
          {loading ? (
            <div style={{textAlign:"center",padding:24,color:"var(--text-secondary)"}}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{textAlign:"center",padding:"32px 20px"}}>
              <div style={{fontSize:36,marginBottom:12}}>💬</div>
              <div style={{fontSize:14,color:"var(--text-secondary)"}}>No conversations yet. Clients will reach out once they find your profile!</div>
            </div>
          ) : conversations.map((c,i)=>(
            <div key={c.clientId} onClick={()=>nav(`/stylist/chat/${c.clientId}`)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"0.5px solid var(--border)",cursor:"pointer"}}>
              <div className="avatar" style={{background:BG[i%5],color:TC[i%5],width:40,height:40,fontSize:13}}>
                {c.clientId.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500}}>Client</div>
                <div style={{fontSize:12,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {c.type==="image"?"📷 Photo":(c.lastMessage||"New session")}
                </div>
              </div>
              <div style={{fontSize:11,color:"var(--text-tertiary)",flexShrink:0}}>
                {c.lastTime ? new Date(c.lastTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="home" type="stylist" />
    </>
  );
}
