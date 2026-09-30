function analyze(body) {
  const transcript = String(body.transcript || "").trim();
  const t = transcript.toLowerCase();
  const blocked = /block|geblok|blokk|frozen|declin|pin|kaart|card|rekening|can't pay|cannot pay|unblok|blocked/.test(t);
  const caseId = "CRM-" + Date.now().toString(36).toUpperCase();

  const resolution = blocked
    ? {
        title: "Unblock the debit card after a quick confirm",
        detail:
          "Core banking mock: debit card ••4419 was blocked after 3 incorrect PIN attempts at a Bancontact ATM in Berchem on 29 Sep, 18:42. The account itself is open. Transfers and the rent standing order are unaffected.",
        why: "The customer is already signed in to KBC Mobile, so identity is good enough to offer an unblock without a phone agent.",
        actions: [
          { id: "unblock", label: "Yes, that was me — unblock the card" },
          { id: "replace", label: "That was not me — keep the block and send a new card" }
        ]
      }
    : {
        title: "Case opened for the next free agent",
        detail: "The transcript did not match the blocked-account playbook. It is filed so nobody has to wait on hold.",
        why: "Async voice still beats the queue: the message is already on the case.",
        actions: [{ id: "callback", label: "Ask an agent to call me back" }]
      };

  return {
    ok: true,
    transcript,
    resolution,
    crm: {
      caseId,
      customer: body.customerName || "Annelies Peeters",
      customerId: body.customerId || "CUST-20481",
      account: body.account || "Zichtrekening BE68 7360 1234 5678",
      card: body.card || "Debit ••4419",
      channel: "Voice message",
      intent: blocked ? "Blocked account / debit card" : "General service request",
      priority: blocked ? "high" : "normal",
      status: blocked ? "Auto-triaged" : "Queued",
      confidence: blocked ? 0.93 : 0.55,
      durationSec: Number(body.durationSec) || 0,
      transcript,
      blockReason: blocked ? "3 incorrect PIN attempts · ATM Berchem · 29 Sep 18:42" : null,
      reaction: "Awaiting customer confirm",
      source: "api/case"
    }
  };
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!body.transcript) return res.status(400).json({ error: "transcript required" });
  return res.status(200).json(analyze(body));
};
