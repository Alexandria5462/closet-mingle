import React, { useState, useRef, useCallback, useEffect } from "react";

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 200, h: 200 });
  const [dragging, setDragging] = useState(null); // "move" | "nw" | "ne" | "sw" | "se" | null
  const startRef = useRef(null);

  useEffect(() => {
    if (imgLoaded && imgRef.current) {
      const img = imgRef.current;
      const size = Math.min(img.clientWidth, img.clientHeight) * 0.7;
      const x = (img.clientWidth - size) / 2;
      const y = (img.clientHeight - size) / 2;
      setCropBox({ x, y, w: size, h: size });
    }
  }, [imgLoaded]);

  function getPos(e, rect) {
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function getHandle(pos, box) {
    const hs = 18; // handle size
    const handles = {
      nw: { x: box.x, y: box.y },
      ne: { x: box.x + box.w, y: box.y },
      sw: { x: box.x, y: box.y + box.h },
      se: { x: box.x + box.w, y: box.y + box.h },
    };
    for (const [key, h] of Object.entries(handles)) {
      if (Math.abs(pos.x - h.x) < hs && Math.abs(pos.y - h.y) < hs) return key;
    }
    if (pos.x > box.x && pos.x < box.x + box.w && pos.y > box.y && pos.y < box.y + box.h) return "move";
    return null;
  }

  function onPointerDown(e) {
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const pos = getPos(e, rect);
    const handle = getHandle(pos, cropBox);
    if (!handle) return;
    setDragging(handle);
    startRef.current = { pos, box: { ...cropBox } };
  }

  function onPointerMove(e) {
    if (!dragging || !startRef.current) return;
    e.preventDefault();
    const rect = imgRef.current.getBoundingClientRect();
    const pos = getPos(e, rect);
    const dx = pos.x - startRef.current.pos.x;
    const dy = pos.y - startRef.current.pos.y;
    const orig = startRef.current.box;
    const imgW = imgRef.current.clientWidth;
    const imgH = imgRef.current.clientHeight;
    const MIN = 60;
    let { x, y, w, h } = orig;

    if (dragging === "move") {
      x = Math.max(0, Math.min(imgW - w, orig.x + dx));
      y = Math.max(0, Math.min(imgH - h, orig.y + dy));
    } else if (dragging === "se") {
      w = Math.max(MIN, Math.min(imgW - orig.x, orig.w + dx));
      h = Math.max(MIN, Math.min(imgH - orig.y, orig.h + dy));
    } else if (dragging === "sw") {
      const newW = Math.max(MIN, orig.w - dx);
      x = Math.min(orig.x + orig.w - MIN, Math.max(0, orig.x + dx));
      w = orig.x + orig.w - x;
      h = Math.max(MIN, Math.min(imgH - orig.y, orig.h + dy));
    } else if (dragging === "ne") {
      w = Math.max(MIN, Math.min(imgW - orig.x, orig.w + dx));
      const newH = Math.max(MIN, orig.h - dy);
      y = Math.min(orig.y + orig.h - MIN, Math.max(0, orig.y + dy));
      h = orig.y + orig.h - y;
    } else if (dragging === "nw") {
      const newW = Math.max(MIN, orig.w - dx);
      x = Math.min(orig.x + orig.w - MIN, Math.max(0, orig.x + dx));
      w = orig.x + orig.w - x;
      const newH = Math.max(MIN, orig.h - dy);
      y = Math.min(orig.y + orig.h - MIN, Math.max(0, orig.y + dy));
      h = orig.y + orig.h - y;
    }

    setCropBox({ x, y, w, h });
  }

  function onPointerUp() {
    setDragging(null);
    startRef.current = null;
  }

  function applyCrop() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.w * scaleX,
      cropBox.h * scaleY,
      0, 0, 600, 600
    );
    canvas.toBlob(blob => {
      if (blob) onCrop(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  const handles = [
    { key: "nw", style: { top: cropBox.y - 8, left: cropBox.x - 8, cursor: "nw-resize" } },
    { key: "ne", style: { top: cropBox.y - 8, left: cropBox.x + cropBox.w - 8, cursor: "ne-resize" } },
    { key: "sw", style: { top: cropBox.y + cropBox.h - 8, left: cropBox.x - 8, cursor: "sw-resize" } },
    { key: "se", style: { top: cropBox.y + cropBox.h - 8, left: cropBox.x + cropBox.w - 8, cursor: "se-resize" } },
  ];

  return (
    <div className="modal-overlay">
      <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", padding: 16, width: "100%", maxWidth: 430, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div style={{ fontSize: 15, fontWeight: 500, textAlign: "center", marginBottom: 4 }}>Crop your photo</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginBottom: 12 }}>
          Drag the corners to resize · Drag inside to move
        </div>

        <div
          ref={containerRef}
          style={{ position: "relative", width: "100%", userSelect: "none", touchAction: "none" }}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop preview"
            onLoad={() => setImgLoaded(true)}
            style={{ width: "100%", display: "block", borderRadius: 8 }}
            draggable={false}
          />

          {imgLoaded && (
            <>
              {/* Dark overlay — 4 pieces around the crop box */}
              {/* Top */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: cropBox.y, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
              {/* Bottom */}
              <div style={{ position: "absolute", top: cropBox.y + cropBox.h, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
              {/* Left */}
              <div style={{ position: "absolute", top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.h, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
              {/* Right */}
              <div style={{ position: "absolute", top: cropBox.y, left: cropBox.x + cropBox.w, right: 0, height: cropBox.h, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />

              {/* Crop box border */}
              <div
                style={{ position: "absolute", top: cropBox.y, left: cropBox.x, width: cropBox.w, height: cropBox.h, border: "2px solid white", cursor: "move", boxSizing: "border-box" }}
                onMouseDown={onPointerDown}
                onTouchStart={onPointerDown}
              >
                {/* Rule of thirds grid lines */}
                <div style={{ position: "absolute", top: "33.3%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "66.6%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: "33.3%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: "66.6%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
              </div>

              {/* Corner handles */}
              {handles.map(h => (
                <div
                  key={h.key}
                  style={{ position: "absolute", width: 16, height: 16, background: "white", borderRadius: 3, zIndex: 10, ...h.style }}
                  onMouseDown={onPointerDown}
                  onTouchStart={onPointerDown}
                />
              ))}
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn-outline btn-sm" onClick={onCancel} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button className="btn-pink btn-sm" onClick={applyCrop} style={{ flex: 1 }} disabled={!imgLoaded}>
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}
