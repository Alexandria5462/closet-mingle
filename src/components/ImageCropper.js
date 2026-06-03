import React, { useState, useRef, useCallback } from "react";

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, size: 200 });
  const startPos = useRef(null);

  function onImgLoad() {
    const img = imgRef.current;
    const size = Math.min(img.clientWidth, img.clientHeight) * 0.7;
    const x = (img.clientWidth - size) / 2;
    const y = (img.clientHeight - size) / 2;
    setCropBox({ x, y, size });
  }

  function getEventPos(e) {
    const rect = imgRef.current.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e) {
    e.preventDefault();
    setDragging(true);
    startPos.current = { ...getEventPos(e), origBox: { ...cropBox } };
  }

  function onMouseMove(e) {
    if (!dragging || !startPos.current) return;
    const pos = getEventPos(e);
    const dx = pos.x - startPos.current.x;
    const dy = pos.y - startPos.current.y;
    const img = imgRef.current;
    const newX = Math.max(0, Math.min(img.clientWidth - cropBox.size, startPos.current.origBox.x + dx));
    const newY = Math.max(0, Math.min(img.clientHeight - cropBox.size, startPos.current.origBox.y + dy));
    setCropBox(prev => ({ ...prev, x: newX, y: newY }));
  }

  function onMouseUp() { setDragging(false); startPos.current = null; }

  function applyCrop() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      cropBox.x * scaleX, cropBox.y * scaleY,
      cropBox.size * scaleX, cropBox.size * scaleY,
      0, 0, size, size
    );
    canvas.toBlob(blob => {
      if (blob) onCrop(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="modal-overlay">
      <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", padding: 16, width: "100%", maxWidth: 430, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div style={{ fontSize: 15, fontWeight: 500, textAlign: "center", marginBottom: 12 }}>
          Drag to crop your photo
        </div>
        <div style={{ position: "relative", width: "100%", userSelect: "none" }}>
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop"
            onLoad={onImgLoad}
            style={{ width: "100%", display: "block", borderRadius: 8 }}
          />
          {/* Dark overlay */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: 8, pointerEvents: "none" }} />
          {/* Crop box */}
          <div
            style={{
              position: "absolute",
              left: cropBox.x,
              top: cropBox.y,
              width: cropBox.size,
              height: cropBox.size,
              border: "2px solid white",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
              cursor: "move",
              borderRadius: 4,
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
          >
            {/* Corner handles */}
            {["0,0","100%,0","0,100%","100%,100%"].map((pos, i) => {
              const [l, t] = pos.split(",");
              return <div key={i} style={{ position: "absolute", left: l, top: t, width: 12, height: 12, background: "white", borderRadius: 2, transform: "translate(-50%,-50%)" }} />;
            })}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn-outline btn-sm" onClick={onCancel} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button className="btn-pink btn-sm" onClick={applyCrop} style={{ flex: 1 }}>Use this crop</button>
        </div>
      </div>
    </div>
  );
}
