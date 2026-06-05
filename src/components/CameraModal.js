import React, { useState, useRef } from "react";
import ImageCropper from "./ImageCropper";

export default function CameraModal({ onPhoto, onMultiplePhotos, onClose }) {
  const fileRef = useRef();
  const multiRef = useRef();
  const [cropSrc, setCropSrc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setPendingFile(file);
  }

  function handleMultipleSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onClose();
    if (onMultiplePhotos) onMultiplePhotos(files);
    else if (onPhoto) onPhoto(files[0]);
  }

  function handleCrop(croppedFile) {
    setCropSrc(null);
    onClose();
    if (onPhoto) onPhoto(croppedFile);
  }

  function handleCropCancel() {
    setCropSrc(null);
    setPendingFile(null);
  }

  if (cropSrc) {
    return <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={handleCropCancel} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 500, textAlign: "center", marginBottom: 4 }}>Add photo</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>Choose how to add your clothing item</div>

        {/* Single photo */}
        <button
          className="btn-pink"
          onClick={() => fileRef.current.click()}
          style={{ marginBottom: 10 }}
        >
          <i className="ti ti-photo" aria-hidden="true"></i> Choose from library
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileSelect} />

        {/* Multiple photos */}
        {onMultiplePhotos && (
          <button
            className="btn-outline"
            onClick={() => multiRef.current.click()}
            style={{ marginBottom: 10 }}
          >
            <i className="ti ti-photos" aria-hidden="true"></i> Select multiple photos
          </button>
        )}
        <input ref={multiRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleMultipleSelect} />

        <button className="btn-outline" onClick={onClose} style={{ color: "var(--text-secondary)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
