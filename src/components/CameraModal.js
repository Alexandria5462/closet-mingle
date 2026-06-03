import React, { useRef, useState } from "react";
import ImageCropper from "./ImageCropper";

export default function CameraModal({ onPhoto, onMultiplePhotos, onClose }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const multiRef = useRef();
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);

  // When a single photo is taken or chosen, show cropper first
  function handleSingleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropImageSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  // When multiple photos chosen, skip cropper and upload all directly
  function handleMultipleFiles(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (onMultiplePhotos) onMultiplePhotos(files);
    else if (onPhoto) onPhoto(files[0]);
    onClose();
  }

  // After crop is applied
  function handleCropped(croppedFile) {
    setCropImageSrc(null);
    onPhoto(croppedFile);
    onClose();
  }

  // Cancel crop — go back to modal
  function handleCropCancel() {
    setCropImageSrc(null);
  }

  // Show cropper if image selected
  if (cropImageSrc) {
    return (
      <ImageCropper
        imageSrc={cropImageSrc}
        onCrop={handleCropped}
        onCancel={handleCropCancel}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, textAlign: "center" }}>
          Add photos
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>
          Single photos can be cropped before uploading
        </div>

        {/* Take a photo with camera */}
        <button className="btn-pink" onClick={() => cameraRef.current.click()}>
          <i className="ti ti-camera" aria-hidden="true"></i> Take a photo
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleSingleFile}
        />

        {/* Choose multiple from camera roll */}
        <button className="btn-outline" onClick={() => multiRef.current.click()}>
          <i className="ti ti-photos" aria-hidden="true"></i> Choose multiple photos
        </button>
        <input
          ref={multiRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleMultipleFiles}
        />

        {/* Choose one photo */}
        <button className="btn-outline" onClick={() => fileRef.current.click()}>
          <i className="ti ti-photo" aria-hidden="true"></i> Choose one photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleSingleFile}
        />

        <button
          className="btn-outline"
          style={{ marginTop: 4, color: "var(--text-secondary)" }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
