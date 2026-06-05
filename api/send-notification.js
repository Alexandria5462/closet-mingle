import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { userId, title, body, type } = req.body;
    if (!userId || !title) return res.status(400).json({ error: "userId and title required" });

    // For now store notification in Firestore
    // FCM push can be added later with service account
    const { db } = await import("../src/lib/firebase.js").catch(() => ({ db: null }));

    // Use Vercel's built-in fetch to write to Firestore REST API
    const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notifications`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: userId },
            title: { stringValue: title },
            body: { stringValue: body || "" },
            type: { stringValue: type || "system" },
            read: { booleanValue: false },
            createdAt: { stringValue: new Date().toISOString() },
          }
        })
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Notification error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
