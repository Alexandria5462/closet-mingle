import React, { useRef } from "react";
import ImageCropper from "./ImageCropper";
import { useState } from "react";

export default function CameraModal({ onPhoto, onMultiplePhotos, onClose }) {
  const cameraRef = useRef();
  const libraryRef = useRef();
  const multiRef = useRef();
  const [cropSrc, setCropSrc] = useState(null);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
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

  if (cropSrc) {
    return <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>
          Add photo
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 20 }}>
          How would you like to add your item?
        </div>

        {/* Take a photo — opens camera directly */}
        <button
          className="btn-pink"
          onClick={() => cameraRef.current.click()}
          style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}
        >
          <i className="ti ti-camera" style={{ fontSize: 18 }} aria-hidden="true"></i>
          Take a photo
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {/* Choose from library — no camera capture */}
        <button
          className="btn-outline"
          onClick={() => libraryRef.current.click()}
          style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}
        >
          <i className="ti ti-photo" style={{ fontSize: 18 }} aria-hidden="true"></i>
          Choose from library
        </button>
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {/* Select multiple */}
        {onMultiplePhotos && (
          <button
            className="btn-outline"
            onClick={() => multiRef.current.click()}
            style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}
          >
            <i className="ti ti-photos" style={{ fontSize: 18 }} aria-hidden="true"></i>
            Select multiple photos
          </button>
        )}
        <input
          ref={multiRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleMultipleSelect}
        />

        <button
          className="btn-outline"
          onClick={onClose}
          style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
