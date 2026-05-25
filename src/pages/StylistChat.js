import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import CameraModal from "../components/CameraModal";

export default function StylistChat() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [clientCloset, setClientCloset] = useState([]);
  const [showCloset, setShowCloset] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const conversationId = [userProfile?.uid, clientId].sort().join("_");

  useEffect(() => {
    const q = query(collection(db,"messages"), where("conversationId","==",conversationId), orderBy("createdAt","asc"));
    const unsub = onSnapshot(q, snap=>{
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}), 100);
    });
    const fetchClientCloset = async () => {
      const cq = query(collection(db,"closetItems"), where("userId","==",clientId));
      const cSnap = await getDocs(cq);
      setClientCloset(cSnap.docs.map(d=>({id:d.id,...d.data()})));
    };
    fetchClientCloset();
    return unsub;
  }, [clientId, conversationId]);

  async function sendMessage(content, type="text") {
    if (!content.trim() && type==="text") return;
    setSending(true);
    await addDoc(collection(db,"messages"), {
      conversationId,
      senderId: userProfile.uid,
      senderName: userProfile.name,
      content,
      type,
      createdAt: new Date().toISOString(),
    });
    setText("");
    setSending(false);
  }

  async function handlePhoto(file) {
    setShowCamera(false);
    setSending(true);
    try {
      const storageRef = ref(storage, `chats/${conversationId}/${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await sendMessage(url, "image");
    } catch(e) { console.error(e); }
    setSending(false);
  }

  return (
    <>
      <div className="header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>nav("/stylist")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-secondary)"}}><i className="ti ti-arrow-left" style={{fontSize:20}} aria-hidden="true"></i></button>
          <div className="avatar" style={{background:"#FBEAF0",color:"#72243E",width:36,height:36,fontSize:13}}>{clientId.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>Client</div>
            <button onClick={()=>setShowCloset(!showCloset)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--pink)",padding:0}}>{clientCloset.length} closet items →</button>
          </div>
        </div>
        <button onClick={()=>setShowCamera(true)} style={{background:"none",border:"none",cursor:"pointer"}} aria-label="Share photo">
          <i className="ti ti-photo" style={{fontSize:22,color:"var(--pink)"}} aria-hidden="true"></i>
        </button>
      </div>

      {showCloset && (
        <div style={{padding:"10px 16px",background:"var(--pink-light)",borderBottom:"0.5px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--pink-dark)",marginBottom:8}}>Client's closet ({clientCloset.length} items)</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
            {clientCloset.map(item=>(
              <div key={item.id} style={{width:52,height:52,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#f3f4f6",border:"0.5px solid var(--border)"}}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👕</div>}
              </div>
            ))}
            {clientCloset.length===0&&<div style={{fontSize:12,color:"var(--text-secondary)"}}>No items yet</div>}
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:16,paddingBottom:80}}>
        {messages.map(m=>(
          <div key={m.id} className={`msg-row${m.senderId===userProfile?.uid?" me":""}`}>
            {m.senderId !== userProfile?.uid && (
              <div className="avatar" style={{background:"#FBEAF0",color:"#72243E",width:28,height:28,fontSize:11,flexShrink:0}}>{clientId.slice(0,2).toUpperCase()}</div>
            )}
            <div>
              {m.type==="image"
                ? <img src={m.content} alt="shared" style={{maxWidth:200,borderRadius:12,display:"block"}} />
                : <div className={`msg-bubble${m.senderId===userProfile?.uid?" msg-me":" msg-them"}`}>{m.content}</div>
              }
              <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2,textAlign:m.senderId===userProfile?.uid?"right":"left"}}>
                {new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",padding:"10px 14px",background:"var(--bg-card)",borderTop:"0.5px solid var(--border)",display:"flex",gap:8,alignItems:"center",paddingBottom:"max(10px,env(safe-area-inset-bottom))"}}>
        <button onClick={()=>setShowCamera(true)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-secondary)"}} aria-label="Attach photo">
          <i className="ti ti-photo" style={{fontSize:22}} aria-hidden="true"></i>
        </button>
        <input className="input-field" style={{flex:1,margin:0,padding:"10px 14px"}} placeholder="Reply to client..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage(text)} />
        <button onClick={()=>sendMessage(text)} disabled={sending||!text.trim()} style={{background:"var(--pink)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(!text.trim()||sending)?0.4:1}} aria-label="Send">
          <i className="ti ti-send" style={{fontSize:16,color:"white"}} aria-hidden="true"></i>
        </button>
      </div>

      {showCamera && <CameraModal onPhoto={handlePhoto} onClose={()=>setShowCamera(false)} />}
    </>
  );
}
