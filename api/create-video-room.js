export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ error: "conversationId required" });

    const roomName = `cm-${conversationId}-${Date.now()}`;

    // Create a Daily.co room
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
          enable_chat: false,
          enable_screenshare: false,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 2,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Daily.co error:", err);
      return res.status(500).json({ error: "Could not create video room" });
    }

    const room = await response.json();
    return res.status(200).json({ roomUrl: room.url, roomName: room.name });

  } catch (err) {
    console.error("Video room error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
