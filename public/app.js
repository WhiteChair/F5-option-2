const customer = {
  name: "Annelies Peeters",
  id: "CUST-20481",
  accountName: "Zichtrekening",
  iban: "BE68 7360 1234 5678",
  balance: "€2,418.60",
  card: "Debit ••4419"
};

const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;

const state = {
  tab: "home",
  recording: false,
  seconds: 0,
  transcript: "",
  interim: "",
  timer: null,
  recognition: null,
  recorder: null,
  stream: null,
  chunks: [],
  audioUrl: null,
  result: null,
  cases: [],
  error: "",
  status: "",
  lang: "en-GB"
};

const screen = document.getElementById("screen");
const backBtn = document.getElementById("backBtn");
const crmDesk = document.getElementById("crmDesk");
const crmList = document.getElementById("crmList");

document.getElementById("deskToggle").onclick = () => {
  crmDesk.hidden = !crmDesk.hidden;
};

document.querySelectorAll(".tabbar button").forEach((btn) => {
  btn.onclick = () => {
    state.tab = btn.dataset.tab;
    if (state.recording) stopRecording(true);
    render();
  };
});

backBtn.onclick = () => {
  state.tab = "home";
  state.result = null;
  render();
};

function render() {
  document.querySelectorAll(".tabbar button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === state.tab);
  });
  backBtn.hidden = state.tab === "home";
  if (state.tab === "home") screen.innerHTML = homeView();
  if (state.tab === "pay") screen.innerHTML = payView();
  if (state.tab === "voice") screen.innerHTML = voiceView();
  if (state.tab === "more") screen.innerHTML = moreView();
  bind();
  paintCrm();
}

function homeView() {
  return `
    <div class="hello">
      <h1>Good evening, Annelies</h1>
      <p>Your debit card is blocked. Leave a voice message — no queue.</p>
    </div>
    <section class="account">
      <div class="row">
        <div>
          <strong>${customer.accountName}</strong>
          <div class="iban">${customer.iban}</div>
        </div>
        <span class="pill">Blocked</span>
      </div>
      <div class="amount">${customer.balance}</div>
      <div class="card-visual">
        <small>KBC Debit</small>
        <strong>${customer.card}</strong>
        <span class="blocked-stamp">BLOCKED</span>
      </div>
    </section>
    <div class="actions">
      <button type="button" data-go="voice"><b>Voice message</b><small>30 seconds, no agent wait</small></button>
      <button type="button" data-go="pay"><b>Payments</b><small>Card payments paused</small></button>
    </div>
    <div class="feed">
      <h3>What the bank already knows</h3>
      <div class="item"><span>Bancontact ATM, Berchem</span><b>PIN ×3</b></div>
      <div class="item"><span>Debit card auto-blocked</span><span>29 Sep, 18:42</span></div>
    </div>
    <p class="note">Demo only. Not the real KBC app and not connected to KBC systems.</p>
  `;
}

function payView() {
  return `
    <div class="hello"><h1>Payments</h1><p>Outgoing card payments are paused while the card is blocked.</p></div>
    <div class="item"><span>Bakery Berchem</span><b>Declined</b></div>
    <div class="item"><span>Standing order · rent</span><span class="pill ok">Still scheduled</span></div>
    <button class="primary" style="margin-top:12px" type="button" data-go="voice">Explain by voice message</button>
  `;
}

function moreView() {
  return `
    <div class="hello"><h1>More</h1><p>Signed in as ${customer.name}</p></div>
    <div class="item"><span>Customer id</span><span>${customer.id}</span></div>
    <div class="item"><span>Session</span><span class="pill ok">App login</span></div>
    <div class="item"><span>Channel</span><span>Async voice</span></div>
  `;
}

function voiceView() {
  if (state.result) return resultView(state.result);
  const live = state.recording;
  const text = (state.transcript + " " + state.interim).trim();
  return `
    <div class="voice-wrap">
      <div class="hello" style="text-align:left">
        <h1>Leave a message</h1>
        <p>Up to 30 seconds. We transcribe it, open a CRM case, and propose a resolution.</p>
      </div>
      ${state.error ? `<div class="banner">${escapeHtml(state.error)}</div>` : ""}
      <div class="timer">${formatTime(state.seconds)} / 0:30</div>
      <div class="bars" id="bars">${bars(live)}</div>
      <button class="mic ${live ? "live" : ""}" id="micBtn" type="button">${live ? "Stop" : "Record"}</button>
      <div class="note" id="statusLine" style="text-align:center">${escapeHtml(statusLine())}</div>
      <label class="field-label" for="transcript">Transcript</label>
      <textarea id="transcript" rows="4" placeholder="Speech appears here. You can also type.">${escapeHtml(text)}</textarea>
      <div class="chips">
        <button type="button" data-lang="en-GB" class="${state.lang === "en-GB" ? "on" : ""}">English</button>
        <button type="button" data-lang="nl-BE" class="${state.lang === "nl-BE" ? "on" : ""}">Nederlands</button>
        <button type="button" data-script="My account is blocked. I tried to pay at the bakery and the debit card was declined. I think I entered the wrong PIN at the ATM yesterday. Please unblock it.">Blocked-account script</button>
      </div>
      <button class="primary" id="sendBtn" type="button" ${text && !live ? "" : "disabled"}>Send message</button>
    </div>
  `;
}

function statusLine() {
  if (state.recording) return state.status || "Listening… tap Stop when you are done.";
  if (!Speech && !navigator.mediaDevices) return "This browser cannot record. Type the message or use the script.";
  if (!Speech) return "Live transcription needs Chrome or Edge. You can still record, then type what you said.";
  return "Tap Record and allow the microphone. Chrome or Edge transcribes as you speak.";
}

function resultView(r) {
  const crm = r.crm || {};
  return `
    <div class="hello">
      <h1>We picked this up</h1>
      <p>No agent was waiting. The case is already in the CRM.</p>
    </div>
    <div class="transcript">${escapeHtml(r.transcript || "")}</div>
    ${state.audioUrl ? `<audio controls src="${state.audioUrl}" style="width:100%;margin-top:8px"></audio>` : ""}
    <section class="case">
      <div class="row">
        <h3>${crm.caseId || "Case"}</h3>
        <span class="pill ${crm.priority === "high" ? "" : "warn"}">${crm.priority || "normal"}</span>
      </div>
      <div class="kv">
        <span>Customer</span><b>${crm.customer}</b>
        <span>Account</span><b>${crm.account}</b>
        <span>Intent</span><b>${crm.intent}</b>
        <span>Channel</span><b>${crm.channel}</b>
        <span>Status</span><b>${crm.status}</b>
      </div>
      <div class="resolve">
        <strong>${escapeHtml(r.resolution.title)}</strong>
        <p>${escapeHtml(r.resolution.detail)}</p>
        <p class="note">${escapeHtml(r.resolution.why)}</p>
      </div>
      <div class="stack">
        ${r.resolution.actions.map((a) => `<button class="primary action-btn" type="button" data-action="${escapeHtml(a.id)}">${escapeHtml(a.label)}</button>`).join("")}
        <button class="secondary" type="button" id="again">Record another message</button>
      </div>
      <p class="note" id="actionNote"></p>
    </section>
  `;
}

function bars(live) {
  return Array.from({ length: 12 }, (_, i) => {
    const h = live ? 8 + ((i * 17) % 22) : 6;
    return `<i style="height:${h}px"></i>`;
  }).join("");
}

function bind() {
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.onclick = () => { state.tab = el.dataset.go; render(); };
  });
  const mic = document.getElementById("micBtn");
  if (mic) mic.onclick = () => (state.recording ? stopRecording(false) : startRecording());
  const send = document.getElementById("sendBtn");
  if (send) send.onclick = () => submit(currentText());
  const box = document.getElementById("transcript");
  if (box) box.oninput = () => {
    state.transcript = box.value;
    state.interim = "";
    if (send) send.disabled = state.recording || !box.value.trim();
  };
  document.querySelectorAll("[data-script]").forEach((el) => {
    el.onclick = () => {
      state.transcript = el.dataset.script;
      state.interim = "";
      state.error = "";
      render();
    };
  });
  document.querySelectorAll("[data-lang]").forEach((el) => {
    el.onclick = () => {
      state.lang = el.dataset.lang;
      render();
    };
  });
  const again = document.getElementById("again");
  if (again) again.onclick = () => {
    state.result = null;
    state.transcript = "";
    state.interim = "";
    state.seconds = 0;
    state.error = "";
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
    render();
  };
  document.querySelectorAll(".action-btn").forEach((el) => {
    el.onclick = () => applyAction(el.dataset.action, el.textContent);
  });
}

function currentText() {
  const box = document.getElementById("transcript");
  return ((box && box.value) || state.transcript || "").trim();
}

async function startRecording() {
  state.error = "";
  state.transcript = "";
  state.interim = "";
  state.seconds = 0;
  state.chunks = [];
  state.recording = true;
  state.status = "Asking for the microphone…";
  render();

  if (!window.isSecureContext) {
    fail("Recording needs a secure page. Open the https link.");
    return;
  }

  if (Speech) {
    startSpeech();
    armTimer();
    return;
  }

  try {
    await startMedia();
    state.status = "Recording. This browser cannot transcribe live — type what you said, then send.";
    const line = document.getElementById("statusLine");
    if (line) line.textContent = state.status;
    armTimer();
  } catch (err) {
    fail(micMessage(err));
  }
}

function startSpeech() {
  const rec = new Speech();
  rec.lang = state.lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (event) => {
    let finalText = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += piece + " ";
      else interim += piece;
    }
    if (finalText) state.transcript = (state.transcript + " " + finalText).replace(/\s+/g, " ").trim();
    state.interim = interim;
    const box = document.getElementById("transcript");
    if (box && document.activeElement !== box) box.value = (state.transcript + " " + state.interim).trim();
  };
  rec.onerror = (event) => {
    const code = event.error || "unknown";
    if (code === "aborted" || code === "no-speech") return;
    if (code === "not-allowed" || code === "service-not-allowed") {
      fail("Microphone blocked. Allow the mic for this site in the address bar, then tap Record again.");
      return;
    }
    state.status = "Speech engine error: " + code + ". You can type the message instead.";
    const line = document.getElementById("statusLine");
    if (line) line.textContent = state.status;
  };
  rec.onend = () => {
    if (!state.recording || state.recognition !== rec) return;
    try { rec.start(); } catch (e) {}
  };
  try {
    rec.start();
    state.recognition = rec;
    state.status = "Listening… speak about the blocked card, then tap Stop.";
    const line = document.getElementById("statusLine");
    if (line) line.textContent = state.status;
  } catch (err) {
    fail("Could not start speech recognition. Type the message or use the script.");
  }
}

async function startMedia() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.stream = stream;
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = (e) => { if (e.data.size) state.chunks.push(e.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    if (state.chunks.length) {
      state.audioUrl = URL.createObjectURL(new Blob(state.chunks, { type: recorder.mimeType || "audio/webm" }));
    }
  };
  recorder.start();
  state.recorder = recorder;
}

function armTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.seconds += 1;
    const label = document.querySelector(".timer");
    if (label) label.textContent = formatTime(state.seconds) + " / 0:30";
    const barsEl = document.getElementById("bars");
    if (barsEl) barsEl.innerHTML = bars(true);
    if (state.seconds >= 30) stopRecording(false);
  }, 1000);
}

function fail(message) {
  state.recording = false;
  state.error = message;
  clearInterval(state.timer);
  cleanupAudio();
  render();
}

function stopRecording(discard) {
  state.recording = false;
  clearInterval(state.timer);
  cleanupAudio();
  if (discard) {
    state.transcript = "";
    state.interim = "";
  } else {
    state.transcript = currentText();
    state.interim = "";
    if (!state.transcript) {
      state.error = "No speech detected. Type the message below, or use the blocked-account script.";
    }
  }
  render();
}

function cleanupAudio() {
  if (state.recognition) {
    const rec = state.recognition;
    state.recognition = null;
    try { rec.onend = null; rec.stop(); } catch (e) {}
  }
  if (state.recorder && state.recorder.state !== "inactive") {
    try { state.recorder.stop(); } catch (e) {}
  }
  state.recorder = null;
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
}

function micMessage(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone blocked. Allow the mic for this site, then tap Record again.";
  }
  if (name === "NotFoundError") return "No microphone found on this device.";
  return "Could not open the microphone. Type the message or use the script.";
}

async function submit(transcript) {
  if (!transcript) return;
  const send = document.getElementById("sendBtn");
  if (send) { send.disabled = true; send.textContent = "Opening CRM case…"; }
  const payload = {
    transcript,
    durationSec: state.seconds || 12,
    customerId: customer.id,
    customerName: customer.name,
    account: customer.accountName + " " + customer.iban,
    card: customer.card
  };
  let data;
  try {
    const res = await fetch("/api/case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    data = await res.json();
  } catch (e) {
    data = analyzeClient(payload);
  }
  if (!data.crm) data = analyzeClient(payload);
  state.result = data;
  state.cases.unshift(data.crm);
  state.tab = "voice";
  render();
}

function applyAction(id, label) {
  const note = document.getElementById("actionNote");
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (state.cases[0]) {
    state.cases[0].status = id === "unblock" ? "Unblock requested" : id === "replace" ? "Replacement ordered" : "Callback queued";
    state.cases[0].reaction = label + " · " + stamp;
  }
  if (note) note.textContent = label + ". CRM updated at " + stamp + ". An agent does not need to take the call.";
  paintCrm();
}

function analyzeClient(payload) {
  const t = (payload.transcript || "").toLowerCase();
  const blocked = /block|geblok|blokk|frozen|declin|pin|kaart|card|rekening|can't pay|cannot pay|unblok/.test(t);
  const caseId = "CRM-" + Date.now().toString(36).toUpperCase();
  const resolution = blocked
    ? {
        title: "Unblock the debit card after a quick confirm",
        detail: "Core banking mock: debit card ••4419 was blocked after 3 incorrect PIN attempts at a Bancontact ATM in Berchem on 29 Sep, 18:42. Transfers and standing orders are unaffected.",
        why: "You are already signed in to KBC Mobile, so we can act without a phone agent.",
        actions: [
          { id: "unblock", label: "Yes, that was me — unblock the card" },
          { id: "replace", label: "That was not me — keep the block and send a new card" }
        ]
      }
    : {
        title: "Case opened, specialist will react",
        detail: "We could not match this to the blocked-account playbook. The transcript is on the case for the next free agent.",
        why: "Still no hold music: the message is already filed.",
        actions: [{ id: "callback", label: "Ask an agent to call me back" }]
      };
  return {
    transcript: payload.transcript,
    resolution,
    crm: {
      caseId,
      customer: payload.customerName,
      customerId: payload.customerId,
      account: payload.account,
      card: payload.card,
      channel: "Voice message",
      intent: blocked ? "Blocked account / debit card" : "General service request",
      priority: blocked ? "high" : "normal",
      status: blocked ? "Auto-triaged" : "Queued",
      confidence: blocked ? 0.93 : 0.55,
      durationSec: payload.durationSec,
      transcript: payload.transcript,
      blockReason: blocked ? "3 incorrect PIN attempts · ATM Berchem · 29 Sep 18:42" : null,
      reaction: "Awaiting customer confirm"
    }
  };
}

function paintCrm() {
  if (!state.cases.length) {
    crmList.innerHTML = '<div class="empty">No cases yet. Record a message about the blocked account.</div>';
    return;
  }
  crmList.innerHTML = state.cases.map((c) => "<pre>" + escapeHtml(JSON.stringify(c, null, 2)) + "</pre>").join("");
}

function formatTime(s) {
  return "0:" + String(s).padStart(2, "0");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

render();
