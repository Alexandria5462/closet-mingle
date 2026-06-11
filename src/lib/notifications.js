/**
 * ClosetMingle Notification Utility
 * 
 * All notification triggers go through this file.
 * Only sends notifications between real client-stylist relationships.
 * 
 * CLIENT receives:
 *   - message_from_stylist   — stylist sent a message
 *   - review_reply           — stylist replied to their review
 *   - session_ended          — stylist ended the session
 *   - billing                — subscription changes
 *
 * STYLIST receives:
 *   - message_from_client    — client sent a message
 *   - new_review             — client left a review
 *   - new_follower           — client followed them
 *   - new_client             — first message from new client
 *   - tip_received           — client sent a tip
 */

import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

async function send(userId, title, body, type, extra = {}) {
  if (!userId || !title) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      body: body || "",
      type,
      read: false,
      createdAt: new Date().toISOString(),
      ...extra,
    });
  } catch(e) {
    console.error("Notification failed:", e);
  }
}

// ── CLIENT NOTIFICATIONS ─────────────────────────────────────

export async function notifyClientNewMessage(clientId, stylistId, stylistName, preview) {
  await send(clientId, `New message from ${stylistName}`,
    (preview || "").slice(0, 80),
    "message_from_stylist",
    { stylistId }
  );
}

export async function notifyClientReviewReply(clientId, stylistName) {
  await send(clientId, `${stylistName} replied to your review`,
    "Tap to view their response",
    "review_reply"
  );
}

export async function notifyClientSessionEnded(clientId, stylistId, stylistName) {
  await send(clientId, "Your session has ended",
    `Your session with ${stylistName} is complete. Leave a review!`,
    "session_ended",
    { stylistId }
  );
}

export async function notifyClientBilling(clientId, message) {
  await send(clientId, "Billing update", message, "billing");
}

// ── STYLIST NOTIFICATIONS ────────────────────────────────────

export async function notifyStylistNewMessage(stylistId, clientName, preview) {
  await send(stylistId, "New message from client",
    `${clientName}: ${(preview || "").slice(0, 60)}`,
    "message_from_client"
  );
}

export async function notifyStylistNewReview(stylistId, clientName, rating) {
  await send(stylistId, "New review received",
    `${clientName} left you a ${rating}-star review`,
    "new_review"
  );
}

export async function notifyStylistNewFollower(stylistId, followerName) {
  await send(stylistId, "New follower",
    `${followerName} started following you`,
    "new_follower"
  );
}

export async function notifyStylistNewClient(stylistId, clientName) {
  await send(stylistId, "New client",
    `${clientName} sent you their first message`,
    "new_client"
  );
}

export async function notifyStylistTipReceived(stylistId, clientName, amount) {
  await send(stylistId, "Tip received",
    `${clientName} sent you a $${amount} tip`,
    "tip_received"
  );
}

export async function notifyStylistBilling(stylistId, message) {
  await send(stylistId, "Billing update", message, "billing");
}
