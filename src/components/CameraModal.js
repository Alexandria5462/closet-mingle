import React, { useRef } from "react";

export default function CameraModal({ onPhoto, onClose }) {
  const fileRef = useRef();
  const cameraRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:500,marginBottom:16,textAlign:"center"}}>Add photo</div>
        <button className="btn-pink" onClick={()=>cameraRef.current.click()}>
          <i className="ti ti-camera" aria-hidden="true"></i> Take a photo
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile} />
        <button className="btn-outline" onClick={()=>fileRef.current.click()}>
          <i className="ti ti-photo" aria-hidden="true"></i> Choose from camera roll
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFile} />
        <button className="btn-outline" style={{marginTop:4,color:"var(--text-secondary)"}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
