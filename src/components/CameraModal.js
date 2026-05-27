import React, { useRef } from "react";

export default function CameraModal({ onPhoto, onMultiplePhotos, onClose }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const multiRef = useRef();

  function handleSingle(e) {
    const file = e.target.files[0];
    if (file) onPhoto(file);
  }

  function handleMultiple(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (onMultiplePhotos) onMultiplePhotos(files);
      else onPhoto(files[0]);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, textAlign: "center" }}>Add photos</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>
          You can select multiple photos at once
        </div>

        <button className="btn-pink" onClick={() => cameraRef.current.click()}>
          <i className="ti ti-camera" aria-hidden="true"></i> Take a photo
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleSingle} />

        <button className="btn-outline" onClick={() => multiRef.current.click()}>
          <i className="ti ti-photos" aria-hidden="true"></i> Choose multiple from camera roll
        </button>
        <input ref={multiRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleMultiple} />

        <button className="btn-outline" onClick={() => fileRef.current.click()}>
          <i className="ti ti-photo" aria-hidden="true"></i> Choose one photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSingle} />

        <button className="btn-outline" style={{ marginTop: 4, color: "var(--text-secondary)" }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
