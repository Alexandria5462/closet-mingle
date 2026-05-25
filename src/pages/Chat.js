import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import CameraModal from "../components/CameraModal";

export default function Chat() {
  const { stylistId } = useParams();
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylist, setStylist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const conversationId = [userProfile?.uid, stylistId].sort().join("_");

  useEffect(() => {
    getDoc(doc(db,"users",stylistId)).then(s=>s.exists()&&setStylist(s.data()));
    const q = query(collection(db,"messages"), where("conversationId","==",conversationId), orderBy("createdAt","asc"));
    const unsub = onSnapshot(q, snap=>{
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}), 100);
    });
    return unsub;
  }, [stylistId, conversationId]);

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
      const storageRef = ref(storage, `chats/${conversationId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await sendMessage(url, "image");
    } catch(e) { console.error(e); }
    setSending(false);
  }

  const initials = stylist?.name?.split(" ").map(n=>n[0]).join("").slice(0,2) || "ST";

  return (
    <>
      <div className="header" style={{gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>nav("/stylists")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-secondary)"}}><i className="ti ti-arrow-left" style={{fontSize:20}} aria-hidden="true"></i></button>
          <div className="avatar" style={{background:"#E1F5EE",color:"#085041",width:36,height:36,fontSize:13}}>{initials}</div>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>{stylist?.name || "Stylist"}</div>
            <div style={{fontSize:11,color:"var(--success)",display:"flex",alignItems:"center",gap:4}}><span className="online-dot" style={{width:6,height:6}}></span>Online</div>
          </div>
        </div>
        <button onClick={()=>setShowCamera(true)} style={{background:"none",border:"none",cursor:"pointer"}} aria-label="Share photo">
          <i className="ti ti-photo" style={{fontSize:22,color:"var(--pink)"}} aria-hidden="true"></i>
        </button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:16,paddingBottom:80}}>
        {messages.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:"var(--text-secondary)"}}>
            <div style={{fontSize:32,marginBottom:8}}>👋</div>
            <div style={{fontSize:14}}>Start your styling session with {stylist?.name?.split(" ")[0] || "your stylist"}!</div>
          </div>
        )}
        {messages.map(m=>(
          <div key={m.id} className={`msg-row${m.senderId===userProfile?.uid?" me":""}`}>
            {m.senderId !== userProfile?.uid && (
              <div className="avatar" style={{background:"#E1F5EE",color:"#085041",width:28,height:28,fontSize:11,flexShrink:0}}>{initials}</div>
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
        <input className="input-field" style={{flex:1,margin:0,padding:"10px 14px"}} placeholder={`Message ${stylist?.name?.split(" ")[0]||"stylist"}...`} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage(text)} />
        <button onClick={()=>sendMessage(text)} disabled={sending||!text.trim()} style={{background:"var(--pink)",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(!text.trim()||sending)?0.4:1}} aria-label="Send">
          <i className="ti ti-send" style={{fontSize:16,color:"white"}} aria-hidden="true"></i>
        </button>
      </div>

      {showCamera && <CameraModal onPhoto={handlePhoto} onClose={()=>setShowCamera(false)} />}
    </>
  );
}
