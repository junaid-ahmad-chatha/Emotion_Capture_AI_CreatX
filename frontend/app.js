/* ═══════════════════════════════════════════════════════
   MindfulMirror — Frontend Logic
   ═══════════════════════════════════════════════════════ */

const API = "";

// Raw emotion → friendly display name mapping
const MOOD_MAPPING = {
    happy:   { title: "Happy",      desc: "Energetic & Positive", emoji: "😊" },
    neutral: { title: "Neutral",    desc: "Stable & Grounded",   emoji: "😐" },
    sad:     { title: "Sad",        desc: "Quiet & Inward",      emoji: "😢" },
    surprise:{ title: "Surprise",   desc: "Open & Curious",      emoji: "😲" },
    fear:    { title: "Fear",       desc: "Guard Up",            emoji: "😨" },
    disgust: { title: "Disgust",    desc: "Discontented",        emoji: "🤢" },
    angry:   { title: "Angry",      desc: "Tense & Active",      emoji: "😠" }
};

// Emotion-specific quotes for the dashboard
const EMOTION_QUOTES = {
    sad:      { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
    happy:    { text: "Happiness is not by chance, it is by choice.", author: "Jim Rohn" },
    fear:     { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
    angry:    { text: "Speak when you are angry, and you will make the best speech you'll ever regret.", author: "Ambrose Bierce" },
    surprise: { text: "Life is full of surprises, and every surprise is a new beginning.", author: "Unknown" },
    neutral:  { text: "Feelings are just visitors, let them come and go.", author: "Mooji" },
    disgust:  { text: "Focus on the beauty around you, and the ugly will fade away.", author: "Unknown" }
};

const PATTERN_EMOTION_LABELS = {
    happy: "Happy",
    sad: "Sad",
    angry: "Anger",
    fear: "Fear",
    surprise: "Surprise",
    disgust: "Disgust",
    neutral: "Neutral"
};

const PATTERN_ICONS = {
    happy: "\u{1F60A}",
    sad: "\u{1F622}",
    angry: "\u{1F621}",
    fear: "\u{1F628}",
    surprise: "\u{1F632}",
    disgust: "\u{1F922}"
};

const PATTERN_COLOR_BY_EMOTION = {
    happy: "brown-circle",
    sad: "blue-circle",
    angry: "red-circle",
    fear: "purple-circle",
    surprise: "orange-circle",
    disgust: "green-circle"
};

const EMOTIONAL_PATTERN_KEYS = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"];
const PATTERN_MATCH_TOLERANCE = 5;

const EMOTIONAL_PATTERN_RULES = [
    { primary: "happy", title: "Happy Pattern", mix: { happy: 80, surprise: 10, fear: 10 }, text: "Sudden joy after unexpected good news." },
    { primary: "happy", title: "Happy Pattern", mix: { happy: 70, sad: 20, surprise: 10 }, text: "Smiling while remembering emotional memories." },
    { primary: "happy", title: "Happy Pattern", mix: { happy: 60, surprise: 30, disgust: 10 }, text: "Excitement mixed with confusion." },
    { primary: "happy", title: "Happy Pattern", mix: { happy: 90, angry: 10 }, text: "Strong confidence and winning feeling." },

    { primary: "sad", title: "Sad Pattern", mix: { sad: 80, fear: 10, disgust: 10 }, text: "Feeling emotionally broken and uncomfortable." },
    { primary: "sad", title: "Sad Pattern", mix: { sad: 70, angry: 20, happy: 10 }, text: "Pain mixed with hidden frustration." },
    { primary: "sad", title: "Sad Pattern", mix: { sad: 60, fear: 30, surprise: 10 }, text: "Shock after hearing bad news." },
    { primary: "sad", title: "Sad Pattern", mix: { sad: 50, happy: 40, surprise: 10 }, text: "Emotional tears during a happy moment." },

    { primary: "angry", title: "Anger Pattern", mix: { angry: 80, disgust: 10, fear: 10 }, text: "Aggressive reaction with strong rejection." },
    { primary: "angry", title: "Anger Pattern", mix: { angry: 70, sad: 20, surprise: 10 }, text: "Hurt feelings turning into anger." },
    { primary: "angry", title: "Anger Pattern", mix: { angry: 60, fear: 30, disgust: 10 }, text: "Defensive anger caused by pressure." },
    { primary: "angry", title: "Anger Pattern", mix: { angry: 50, happy: 30, surprise: 20 }, text: "Competitive excitement during victory." },

    { primary: "fear", title: "Fear Pattern", mix: { fear: 80, surprise: 10, sad: 10 }, text: "Panic after something unexpected." },
    { primary: "fear", title: "Fear Pattern", mix: { fear: 70, disgust: 20, angry: 10 }, text: "Fear mixed with rejection and stress." },
    { primary: "fear", title: "Fear Pattern", mix: { fear: 60, sad: 30, happy: 10 }, text: "Nervousness before an important moment." },
    { primary: "fear", title: "Fear Pattern", mix: { fear: 50, surprise: 40, angry: 10 }, text: "Shocked and defensive reaction." },

    { primary: "surprise", title: "Surprise Pattern", mix: { surprise: 80, happy: 10, fear: 10 }, text: "Unexpected exciting moment." },
    { primary: "surprise", title: "Surprise Pattern", mix: { surprise: 70, fear: 20, disgust: 10 }, text: "Sudden strange or uncomfortable situation." },
    { primary: "surprise", title: "Surprise Pattern", mix: { surprise: 60, happy: 30, sad: 10 }, text: "Emotional unexpected memory." },
    { primary: "surprise", title: "Surprise Pattern", mix: { surprise: 50, angry: 30, fear: 20 }, text: "Reaction to sudden danger or conflict." },

    { primary: "disgust", title: "Disgust Pattern", mix: { disgust: 80, angry: 10, fear: 10 }, text: "Strong rejection toward something unpleasant." },
    { primary: "disgust", title: "Disgust Pattern", mix: { disgust: 70, sad: 20, fear: 10 }, text: "Emotional discomfort and disappointment." },
    { primary: "disgust", title: "Disgust Pattern", mix: { disgust: 60, angry: 30, surprise: 10 }, text: "Shocked by unacceptable behavior." },
    { primary: "disgust", title: "Disgust Pattern", mix: { disgust: 50, fear: 30, sad: 20 }, text: "Feeling unsafe and emotionally disturbed." }
];

/**
 * Match a pattern rule from EMOTIONAL_PATTERN_RULES based on
 * actual emotion percentage breakdown computed from recent history.
 * Falls back to the single dominant emotion rule if no close match.
 */
async function matchPatternFromHistory(primaryEmotion) {
    try {
        const res = await fetch(`${API}/api/patterns?days=7`);
        const data = await res.json();
        const counts = data.counts || {};

        // Build total & percentages from all-time counts
        let total = 0;
        const countMap = {};
        if (Array.isArray(counts)) {
            counts.forEach(c => { countMap[c.emotion] = c.count; total += c.count; });
        } else {
            Object.entries(counts).forEach(([k, v]) => { countMap[k] = v; total += v; });
        }

        if (total === 0) return null;

        const pct = {};
        EMOTIONAL_PATTERN_KEYS.forEach(e => {
            pct[e] = ((countMap[e] || 0) / total) * 100;
        });

        // Only consider rules whose primary emotion matches
        const candidates = EMOTIONAL_PATTERN_RULES.filter(r => r.primary === primaryEmotion);
        if (candidates.length === 0) return null;

        // Find closest rule by least absolute error
        let best = null;
        let minErr = Infinity;
        for (const rule of candidates) {
            let err = 0;
            for (const e of EMOTIONAL_PATTERN_KEYS) {
                err += Math.abs((pct[e] || 0) - (rule.mix[e] || 0));
            }
            if (err < minErr) { minErr = err; best = rule; }
        }
        return best;
    } catch {
        return null;
    }
}

// State
let currentTab = "log"; // default is "Home" (log tab)
let webcamStream = null;
let selectedManualEmotion = null;
let scanState = "scan"; // "scan" | "confirm"
let detectedEmotionRaw = null;
let detectedConfidenceVal = null;
let loggedEntryId = null;
let trendsChart = null;
let cameraPollInterval = null;

function toggleDropdown() {
    document.getElementById('dropdown-options').classList.toggle('hidden');
}

function initDropdown() {
    const optionsContainer = document.getElementById('dropdown-options');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    Object.values(MOOD_MAPPING).forEach(mood => {
        const div = document.createElement('div');
        div.className = 'dropdown-option';
        div.innerHTML = `
            <span class="mindful-btn-emoji">${mood.emoji}</span>
            <div class="mindful-btn-text">
                <span class="mindful-btn-title">${mood.title}</span>
                <span class="mindful-btn-desc">${mood.desc}</span>
            </div>
        `;
        div.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('dropdown-selected').innerHTML = div.innerHTML;
            document.getElementById('dropdown-options').classList.add('hidden');
            
            selectedManualEmotion = Object.keys(MOOD_MAPPING).find(key => MOOD_MAPPING[key].title === mood.title);
            document.getElementById("btn-confirm-manual").classList.remove("disabled");
            document.getElementById("btn-confirm-manual").disabled = false;
        };
        optionsContainer.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", initDropdown);

// ── Navigation ───────────────────────────────────────────

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add("active");

    if (tabName === "log") {
        startWebcam();
        resetCameraView();
    } else {
        stopWebcam();
    }

    if (tabName === "home")     loadDashboardData();
    if (tabName === "insights") loadInsightsData(currentChartDays);
    if (tabName === "profile")  loadProfileData();
}

// ── Webcam ───────────────────────────────────────────────

async function startWebcam() {
    const video = document.getElementById("webcam");
    if (!video || webcamStream) return;

    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 }
        });
        video.srcObject = webcamStream;
        
        if (!cameraPollInterval) {
            cameraPollInterval = setInterval(pollExpression, 1500);
        }
    } catch (err) {
        showToast("Camera access denied — try Manual Entry instead.", "error");
        console.error("Webcam error:", err);
    }
}

function stopWebcam() {
    if (cameraPollInterval) {
        clearInterval(cameraPollInterval);
        cameraPollInterval = null;
    }
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
    }
}

// ── Camera Scan State Machine ─────────────────────────────

function resetCameraView() {
    scanState = "scan";
    detectedEmotionRaw = null;
    detectedConfidenceVal = null;
    loggedEntryId = null;

    setGlassCard("Calm", "Awaiting Scan");
    setCameraBtn("scan");
    
    const retakeBtn = document.getElementById("btn-camera-retake");
    if (retakeBtn) retakeBtn.classList.add("hidden");

    document.getElementById("camera-log-view").classList.remove("hidden");
    document.getElementById("manual-log-view").classList.add("hidden");
    document.getElementById("reflection-log-view").classList.add("hidden");
}

function setGlassCard(emotionLabel, confidenceLabel) {
    document.getElementById("mirror-detected-emotion").textContent = emotionLabel;
    document.getElementById("mirror-detected-confidence").textContent = confidenceLabel;
}

function setCameraBtn(state) {
    const btn = document.getElementById("btn-camera-action");
    const text = document.getElementById("camera-action-text");
    const check = document.getElementById("camera-action-check");

    if (state === "scan") {
        text.textContent = "Save Mood";
        check.classList.add("hidden");
        btn.disabled = false;
    } else if (state === "confirm") {
        text.textContent = "Confirming...";
        check.classList.remove("hidden");
        btn.disabled = true;
    }
}

async function handleCameraAction() {
    if (scanState === "scan") {
        if (!detectedEmotionRaw) {
            showToast("No face detected yet. Please wait.", "error");
            return;
        }
        scanState = "confirm";
        setCameraBtn("confirm");
        
        const retakeBtn = document.getElementById("btn-camera-retake");
        if (retakeBtn) retakeBtn.classList.remove("hidden");
        
        const mapped = MOOD_MAPPING[detectedEmotionRaw] || MOOD_MAPPING.neutral;
        setGlassCard(mapped.title, `${detectedConfidenceVal}% (Locked)`);
        
        await confirmCameraMood();
    }
}

async function pollExpression() {
    if (scanState !== "scan") return; // Only poll while scanning

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("capture-canvas");

    if (!webcamStream || video.paused || video.ended) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.7);

    try {
        const res = await fetch(`${API}/api/detect-emotion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageData })
        });

        if (res.ok) {
            const result = await res.json();
            detectedEmotionRaw = result.emotion;
            detectedConfidenceVal = result.confidence;

            const mapped = MOOD_MAPPING[detectedEmotionRaw] || MOOD_MAPPING.neutral;
            setGlassCard(mapped.title, `Detected`);
        }
    } catch (err) {
        // Silently fail to not interrupt real-time scanning
    }
}

async function confirmCameraMood() {
    if (!detectedEmotionRaw) return;

    try {
        const res = await fetch(`${API}/api/log-emotion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emotion: detectedEmotionRaw,
                source: "camera",
                confidence: detectedConfidenceVal
            })
        });

        if (!res.ok) throw new Error("Log failed");
        const data = await res.json();
        loggedEntryId = data.id;

        showToast("Mood captured! Let's reflect.", "success");
        showReflectionView(detectedEmotionRaw);
    } catch (err) {
        showToast("Failed to save mood.", "error");
        console.error("Confirm error:", err);
    }
}

// ── Manual Entry Flow ─────────────────────────────────────

function toggleManualGrid() {
    document.getElementById("camera-log-view").classList.add("hidden");
    document.getElementById("manual-log-view").classList.remove("hidden");
    selectedManualEmotion = null;
    document.querySelectorAll(".mindful-emotion-btn").forEach(b => b.classList.remove("selected"));
    setConfirmManualBtn(false);
}

function toggleCameraView() {
    document.getElementById("manual-log-view").classList.add("hidden");
    document.getElementById("camera-log-view").classList.remove("hidden");
    resetCameraView();
}

function selectMindfulEmotion(btn) {
    document.querySelectorAll(".mindful-emotion-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedManualEmotion = btn.dataset.emotion;
    setConfirmManualBtn(true);
}

function setConfirmManualBtn(enabled) {
    const btn = document.getElementById("btn-confirm-manual");
    btn.disabled = !enabled;
    btn.classList.toggle("disabled", !enabled);
}

async function confirmManualMood() {
    if (!selectedManualEmotion) return;

    try {
        const res = await fetch(`${API}/api/log-emotion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emotion: selectedManualEmotion, source: "manual" })
        });

        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        loggedEntryId = data.id;

        showToast("Mood logged! Let's reflect.", "success");
        showReflectionView(selectedManualEmotion);
    } catch (err) {
        showToast("Failed to log mood.", "error");
        console.error("Manual mood error:", err);
    }
}

// ── Reflection Screen ─────────────────────────────────────

async function showReflectionView(emotionRaw) {
    const mapped = MOOD_MAPPING[emotionRaw] || MOOD_MAPPING.neutral;

    document.getElementById("manual-log-view").classList.add("hidden");
    document.getElementById("camera-log-view").classList.add("hidden");
    document.getElementById("reflection-log-view").classList.remove("hidden");

    document.getElementById("reflection-state-lbl").textContent = `CURRENT STATE: ${mapped.title.toUpperCase()}`;
    document.getElementById("reflection-heading").textContent = `Deepening Your ${mapped.title}`;
    document.getElementById("reflection-avatar").textContent = mapped.emoji;
    document.getElementById("reflection-user-note").value = "";
    
    // Reset solution modal state
    const solutionModal = document.getElementById("solution-modal");
    if (solutionModal) solutionModal.classList.add("hidden");
    document.getElementById("reflection-bottom-controls").classList.remove("hidden");

    // Load AI Advice
    const adviceEl = document.getElementById("reflection-gemini-advice");
    if (adviceEl) {
        adviceEl.textContent = "Thinking of a helpful insight...";
        fetch(`${API}/api/advice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emotion: emotionRaw })
        })
        .then(res => res.json())
        .then(data => { adviceEl.textContent = data.advice; })
        .catch(err => { adviceEl.textContent = `Be kind to yourself as you experience feeling ${mapped.title}.`; });
    }

    const promptEl = document.getElementById("reflection-gemini-prompt");
    promptEl.textContent = "Generating a reflection for you…";

    try {
        const res = await fetch(`${API}/api/reflect`, { method: "POST" });
        const data = await res.json();
        promptEl.textContent = data.question || `What aspect of feeling ${mapped.title.toLowerCase()} stands out most to you right now?`;
    } catch {
        promptEl.textContent = `What part of today made you feel ${mapped.title.toLowerCase()}?`;
    }

    // Populate Context Card with matched emotional pattern
    const ctxTitle = document.getElementById("context-card-title");
    const ctxDesc  = document.getElementById("context-card-desc");
    if (ctxTitle && ctxDesc) {
        ctxTitle.textContent = "Analyzing your pattern…";
        ctxDesc.textContent  = "";
    }
    matchPatternFromHistory(emotionRaw).then(rule => {
        if (ctxTitle && ctxDesc) {
            if (rule) {
                // Build percentage label string from the mix object
                const mixLabel = Object.entries(rule.mix)
                    .sort(([,a],[,b]) => b - a)
                    .map(([e, p]) => `${p}% ${MOOD_MAPPING[e]?.title || e}`)
                    .join(" + ");
                ctxTitle.textContent = `${PATTERN_ICONS[rule.primary] || ""} ${rule.title}`;
                ctxDesc.textContent  = `${mixLabel} = ${rule.text}`;
            } else {
                ctxTitle.textContent = `${mapped.emoji} A Moment of ${mapped.title}`;
                ctxDesc.textContent  = "Your reflection matters. Take a moment to honor what you're feeling.";
            }
        }
    });
}

async function submitReflectionText() {
    const note = document.getElementById("reflection-user-note").value.trim();
    if (!note) {
        showToast("Write something before submitting.", "error");
        return;
    }

    if (loggedEntryId) {
        try {
            await fetch(`${API}/api/update-note`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: loggedEntryId, note })
            });
        } catch {
            // Fail silently
        }
    }

    // Show solution modal
    const solutionModal = document.getElementById("solution-modal");
    const solutionText = document.getElementById("solution-text");
    if (solutionModal && solutionText) {
        solutionModal.classList.remove("hidden");
        solutionText.textContent = "Analyzing your reflection...";
        document.getElementById("reflection-bottom-controls").classList.add("hidden");

        const currentState = document.getElementById("reflection-state-lbl").textContent.replace("CURRENT STATE: ", "");
        const emotion = Object.keys(MOOD_MAPPING).find(key => MOOD_MAPPING[key].title.toUpperCase() === currentState) || "neutral";

        try {
            const res = await fetch(`${API}/api/analyze-reflection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emotion, note })
            });
            const data = await res.json();
            solutionText.textContent = data.response;
        } catch (err) {
            solutionText.textContent = "Thank you for reflecting. Your note has been saved.";
        }
    } else {
        finishReflection();
    }
}

function closeSolutionModal() {
    document.getElementById("solution-modal").classList.add("hidden");
    finishReflection();
}
function finishReflection() {
    switchTab("home");
}

// ── Dashboard Data ────────────────────────────────────────

async function loadDashboardData() {
    try {
        const res = await fetch(`${API}/api/history?limit=30`);
        const data = await res.json();
        const history = data.history || [];

        // Today's mood and Quote
        if (history.length > 0) {
            const latestEmotionRaw = history[0].emotion;
            const mapped = MOOD_MAPPING[latestEmotionRaw] || MOOD_MAPPING.neutral;
            document.getElementById("home-today-mood").textContent = mapped.title;
            document.getElementById("home-today-desc").textContent = mapped.desc;
            document.getElementById("home-today-emoji").textContent = mapped.emoji;

            // Update quote based on the most recent emotion
            const quoteData = EMOTION_QUOTES[latestEmotionRaw] || EMOTION_QUOTES.neutral;
            const quoteTextEl = document.getElementById("dashboard-quote-text");
            const quoteAuthorEl = document.getElementById("dashboard-quote-author");
            if (quoteTextEl) quoteTextEl.textContent = quoteData.text;
            if (quoteAuthorEl) quoteAuthorEl.textContent = `— ${quoteData.author}`;
        }

        // Streak
        document.getElementById("home-streak-count").textContent = calculateStreak(history);

        // Recent reflections horizontal scroll
        const scrollEl = document.getElementById("home-reflections-list");
        scrollEl.innerHTML = "";

        const items = history.slice(0, 6);
        if (items.length === 0) {
            scrollEl.innerHTML = `
                <div class="reflection-card-item" style="background-image:linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.6)),url('/static/forest_reflection.png')">
                    <div class="reflection-card-overlay"></div>
                    <div class="reflection-card-content">
                        <span class="card-item-date">Today</span>
                        <h4 class="card-item-title">Start logging!</h4>
                        <p class="card-item-desc">Your reflections will appear here.</p>
                    </div>
                </div>`;
            return;
        }

        items.forEach((entry, i) => {
            const mapped = MOOD_MAPPING[entry.emotion] || MOOD_MAPPING.neutral;
            const bg = i % 2 === 0 ? "/static/forest_reflection.png" : "/static/sunset_reflection.png";
            const note = entry.note ? `"${entry.note}"` : mapped.desc;
            const card = document.createElement("div");
            card.className = "reflection-card-item";
            card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.65)),url('${bg}')`;
            card.innerHTML = `
                <div class="reflection-card-overlay"></div>
                <span class="card-item-badge">${mapped.emoji}</span>
                <div class="reflection-card-content">
                    <span class="card-item-date">${formatCompactDate(entry.created_at)}</span>
                    <h4 class="card-item-title">${mapped.title}</h4>
                    <p class="card-item-desc">${note}</p>
                </div>`;
            scrollEl.appendChild(card);
        });
    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// ── Insights Data ─────────────────────────────────────────

let currentChartDays = 7;

function setChartPeriod(btn) {
    document.querySelectorAll(".period-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentChartDays = parseInt(btn.dataset.days);
    loadInsightsData(currentChartDays);
}

async function loadInsightsData(days = 7) {
    try {
        const res = await fetch(`${API}/api/patterns?days=${days}`);
        const data = await res.json();
        const counts = data.counts || [];
        const trendRows = data.trend || [];
        const historyLogs = data.history || []; // Use raw logs for the chart

        // Update heading based on period
        const headingMap = { 1: "Today's Journey", 7: "Weekly Journey", 30: "Monthly Journey" };
        const subMap = {
            1: "Your emotional landscape over the past 24 hours.",
            7: "Your emotional landscape over the past 7 days.",
            30: "Your emotional landscape over the past 30 days."
        };
        const titleEl = document.querySelector("#tab-insights .welcome-title");
        const subEl   = document.querySelector("#tab-insights .welcome-subtitle");
        if (titleEl) titleEl.textContent = headingMap[days] || "Weekly Journey";
        if (subEl)   subEl.textContent   = subMap[days]    || "Your emotional landscape.";

        // Filter logs to compute true peak and stability for this timeframe
        const now = new Date();
        const cutoff = new Date(now.getTime() - (days * 86400000));
        const filteredLogs = historyLogs.filter(log => new Date(log.created_at.replace(' ', 'T') + "Z") >= cutoff);

        let stabilityPctStr = "0%";
        if (filteredLogs.length > 0) {
            const emotionCounts = {};
            filteredLogs.forEach(log => {
                emotionCounts[log.emotion] = (emotionCounts[log.emotion] || 0) + 1;
            });
            
            let peakEmotion = "neutral";
            let maxCount = 0;
            for (const [emo, count] of Object.entries(emotionCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    peakEmotion = emo;
                }
            }
            
            const mapped = MOOD_MAPPING[peakEmotion] || MOOD_MAPPING.neutral;
            document.getElementById("insights-peak-mood-val").textContent = mapped.title;
            
            // Stability is the percentage of the peak emotion
            const stabilityPct = (maxCount / filteredLogs.length) * 100;
            stabilityPctStr = `${stabilityPct.toFixed(1)}%`;
        } else {
            document.getElementById("insights-peak-mood-val").textContent = "None";
        }
        
        document.getElementById("insights-stability-val").textContent = stabilityPctStr;

        renderTrendsChart(historyLogs, days);

        const trendCounts = getCountsFromTrend(trendRows);
        const periodCounts = trendCounts.length > 0 ? trendCounts : getCountsFromLogs(filteredLogs);
        const fallbackCounts = periodCounts.length > 0 ? periodCounts : counts;
        const matchedPatternCards = getMatchingEmotionalPatternCards(fallbackCounts);

        if (matchedPatternCards.length > 0) {
            renderPatternCards(matchedPatternCards);
        } else {
            fetchGeminiInsightCards();
        }
    } catch (err) {
        console.error("Insights error:", err);
    }
}

function getCountsFromTrend(trendRows) {
    const totals = {};
    trendRows.forEach(row => {
        const emotion = String(row.emotion || "").toLowerCase();
        const count = Number(row.count) || 0;
        if (!emotion || count <= 0) return;
        totals[emotion] = (totals[emotion] || 0) + count;
    });
    return Object.entries(totals).map(([emotion, count]) => ({ emotion, count }));
}

function getCountsFromLogs(logs) {
    const totals = {};
    logs.forEach(log => {
        const emotion = String(log.emotion || "").toLowerCase();
        if (!emotion) return;
        totals[emotion] = (totals[emotion] || 0) + 1;
    });
    return Object.entries(totals).map(([emotion, count]) => ({ emotion, count }));
}

function getMatchingEmotionalPatternCards(countRows) {
    const totals = {};
    countRows.forEach(row => {
        const emotion = String(row.emotion || "").toLowerCase();
        const count = Number(row.count) || 0;
        if (!emotion || count <= 0) return;
        totals[emotion] = (totals[emotion] || 0) + count;
    });

    const total = Object.values(totals).reduce((sum, count) => sum + count, 0);
    if (total <= 0) return [];

    const percentages = {};
    EMOTIONAL_PATTERN_KEYS.forEach(emotion => {
        percentages[emotion] = ((totals[emotion] || 0) / total) * 100;
    });

    let bestMatch = null;
    EMOTIONAL_PATTERN_RULES.forEach(rule => {
        let maxDiff = 0;
        let totalDiff = 0;

        EMOTIONAL_PATTERN_KEYS.forEach(emotion => {
            const diff = Math.abs((percentages[emotion] || 0) - (rule.mix[emotion] || 0));
            maxDiff = Math.max(maxDiff, diff);
            totalDiff += diff;
        });

        if (maxDiff <= PATTERN_MATCH_TOLERANCE && totalDiff <= 15) {
            if (!bestMatch || totalDiff < bestMatch.totalDiff) {
                bestMatch = { rule, totalDiff };
            }
        }
    });

    return bestMatch ? [patternRuleToCard(bestMatch.rule)] : [];
}

function patternRuleToCard(rule) {
    const formula = Object.entries(rule.mix)
        .map(([emotion, percent]) => `${percent}% ${PATTERN_EMOTION_LABELS[emotion] || emotion}`)
        .join(" + ");

    return {
        icon: PATTERN_ICONS[rule.primary] || "\u2728",
        color: PATTERN_COLOR_BY_EMOTION[rule.primary] || "blue-circle",
        title: rule.title,
        text: `${formula} = ${rule.text}`
    };
}

function renderPatternCards(cards) {
    const listEl = document.getElementById("insights-patterns-list");
    if (!listEl) return;

    listEl.innerHTML = "";
    cards.forEach((card, idx) => {
        const div = document.createElement("div");
        div.className = "pattern-list-card";

        const iconWrap = document.createElement("div");
        iconWrap.className = `pattern-icon-circle ${card.color || getDefaultPatternColor(idx)}`;

        const icon = document.createElement("span");
        icon.textContent = card.icon || "\u2728";
        iconWrap.appendChild(icon);

        const info = document.createElement("div");
        info.className = "pattern-card-info";

        const title = document.createElement("h4");
        title.textContent = card.title || "Mindful Observation";

        const text = document.createElement("p");
        text.textContent = card.text || "";

        info.appendChild(title);
        info.appendChild(text);
        div.appendChild(iconWrap);
        div.appendChild(info);
        listEl.appendChild(div);
    });
}

function getDefaultPatternColor(idx) {
    return ["blue-circle", "brown-circle", "green-circle"][idx % 3];
}

function insightStringToCard(insightStr, idx) {
    let icon = "\u2728";
    let title = "Mindful Observation";
    let text = insightStr;

    const match = insightStr.match(/^([\p{Emoji}]+)\s*(.*?):\s*(.*)$/u);
    if (match) {
        icon = match[1].trim() || "\u2728";
        title = match[2].trim() || "Mindful Observation";
        text = match[3].trim();
    } else {
        const firstChar = Array.from(insightStr)[0];
        if (firstChar && firstChar.match(/\p{Emoji}/u)) {
            icon = firstChar;
            text = insightStr.substring(firstChar.length).trim();
        }
    }

    return {
        icon,
        title,
        text,
        color: getDefaultPatternColor(idx)
    };
}

async function fetchGeminiInsightCards() {
    try {
        const res = await fetch(`${API}/api/insights`);
        const data = await res.json();
        const listEl = document.getElementById("insights-patterns-list");
        if (!listEl) return;

        if (data.insights && data.insights.length > 0) {
            renderPatternCards(data.insights.map((insightStr, idx) => insightStringToCard(insightStr, idx)));
        } else {
            listEl.innerHTML = "<p>No insights could be generated right now.</p>";
        }
    } catch (err) {
        console.error("Failed to fetch dynamic insights", err);
        const listEl = document.getElementById("insights-patterns-list");
        if (listEl) listEl.innerHTML = "<p>Failed to load insights. Please try again later.</p>";
    }
}

async function fetchGeminiInsightsLegacy() {
    try {
        const res = await fetch(`${API}/api/insights`);
        const data = await res.json();
        const listEl = document.getElementById("insights-patterns-list");
        
        if (data.insights && data.insights.length > 0) {
            listEl.innerHTML = ""; // Clear analyzing
            data.insights.forEach((insightStr, idx) => {
                let icon = "✨";
                let title = "Mindful Observation";
                let text = insightStr;
                
                // Try to match "Emoji Title: Description" format
                const match = insightStr.match(/^([\p{Emoji}]+)\s*(.*?):\s*(.*)$/u);
                if (match) {
                    icon = match[1].trim() || "✨";
                    title = match[2].trim();
                    text = match[3].trim();
                } else {
                    // Fallback basic parsing
                    const firstChar = Array.from(insightStr)[0];
                    if (firstChar && firstChar.match(/\p{Emoji}/u)) {
                        icon = firstChar;
                        text = insightStr.substring(firstChar.length).trim();
                    }
                }
                
                const colors = ["blue", "brown", "green"];
                const color = colors[idx % colors.length] + "-circle";
                
                const div = document.createElement("div");
                div.className = "pattern-list-card";
                div.innerHTML = `
                    <div class="pattern-icon-circle ${color}"><span>${icon}</span></div>
                    <div class="pattern-card-info">
                        <h4>${title}</h4>
                        <p>${text}</p>
                    </div>
                `;
                listEl.appendChild(div);
            });
        } else {
            listEl.innerHTML = "<p>No insights could be generated right now.</p>";
        }
    } catch (err) {
        console.error("Failed to fetch dynamic insights", err);
        const listEl = document.getElementById("insights-patterns-list");
        if (listEl) listEl.innerHTML = "<p>Failed to load insights. Please try again later.</p>";
    }
}


function renderTrendsChart(historyLogs, days = 7) {
    const ctx = document.getElementById("chart-trends-smooth");
    if (!ctx) return;
    if (trendsChart) { trendsChart.destroy(); trendsChart = null; }

    const now = new Date();
    const cutoff = new Date(now.getTime() - (days * 86400000));
    
    const filteredLogs = historyLogs
        .filter(log => new Date(log.created_at.replace(' ', 'T') + "Z") >= cutoff);

    const hasRealData = filteredLogs.length > 0;
    
    // 1. Generate X-axis labels (time buckets)
    let labels = [];
    if (days === 1) {
        // Last 24 hours
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 3600000);
            labels.push(d.toLocaleTimeString([], { hour: 'numeric' }));
        }
    } else {
        // Last N days
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        }
    }

    const emotionsConfig = {
        Happy:    { color: "rgba(245, 158, 11, 0.7)", border: "#f59e0b" },
        Surprise: { color: "rgba(249, 115, 22, 0.7)", border: "#f97316" },
        Neutral:  { color: "rgba(107, 114, 128, 0.5)", border: "#6b7280" },
        Sad:      { color: "rgba(59, 130, 246, 0.7)", border: "#3b82f6" },
        Fear:     { color: "rgba(139, 92, 246, 0.7)", border: "#8b5cf6" },
        Disgust:  { color: "rgba(34, 197, 94, 0.7)", border: "#22c55e" },
        Angry:    { color: "rgba(239, 68, 68, 0.7)",  border: "#ef4444" }
    };

    const emotionKeys = Object.keys(emotionsConfig);
    const datasetsData = {};
    emotionKeys.forEach(e => datasetsData[e] = new Array(labels.length).fill(0));

    if (hasRealData) {
        // Map real logs into the time buckets
        filteredLogs.forEach(log => {
            const d = new Date(log.created_at.replace(' ', 'T') + "Z");
            const labelMatch = days === 1 ? d.toLocaleTimeString([], { hour: 'numeric' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            const idx = labels.indexOf(labelMatch);
            if (idx !== -1) {
                const mapped = MOOD_MAPPING[log.emotion] || MOOD_MAPPING.neutral;
                const emoTitle = mapped.title;
                if (datasetsData[emoTitle]) {
                    datasetsData[emoTitle][idx]++;
                }
            }
        });
    } else {
        // Fallback demo data: random time series
        emotionKeys.forEach(emo => {
            for (let i = 0; i < labels.length; i++) {
                if (Math.random() > 0.7) {
                    datasetsData[emo][i] = Math.floor(Math.random() * 3);
                }
            }
        });
        // Ensure at least some data
        datasetsData["Neutral"][labels.length - 1] = 2;
        datasetsData["Happy"][labels.length - 1] = 1;
    }

    const datasets = emotionKeys.map(emo => {
        return {
            label: emo,
            data: datasetsData[emo],
            backgroundColor: emotionsConfig[emo].color,
            borderColor: emotionsConfig[emo].border,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        };
    });

    trendsChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: { 
                legend: { 
                    display: true, 
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { family: "'Plus Jakarta Sans'", size: 11, weight: "600" }
                    }
                },
                tooltip: { usePointStyle: true }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#5a665a",
                        font: { family: "'Plus Jakarta Sans'", size: 10, weight: "600" },
                        maxTicksLimit: days === 30 ? 8 : (days === 1 ? 8 : 7)
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: "rgba(67,98,73,0.08)", drawBorder: false },
                    ticks: {
                        color: "#5a665a",
                        font: { family: "'Plus Jakarta Sans'", size: 10 },
                        precision: 0
                    }
                }
            }
        }
    });
}

// ── Profile Data ──────────────────────────────────────────

async function loadProfileData() {
    try {
        const res = await fetch(`${API}/api/history?limit=50`);
        const data = await res.json();
        const history = data.history || [];

        document.getElementById("profile-total-logs").textContent = history.length;
        document.getElementById("profile-streak-count").textContent = calculateStreak(history);

        const listEl = document.getElementById("profile-history-list");
        listEl.innerHTML = "";

        if (history.length === 0) {
            listEl.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">No entries yet. Start logging your mood!</p>`;
            return;
        }

        history.forEach(entry => {
            const mapped = MOOD_MAPPING[entry.emotion] || MOOD_MAPPING.neutral;
            const note = entry.note ? `"${entry.note}"` : "No note added.";
            const source = entry.source === "camera" ? "📸 Camera" : "✏️ Manual";
            const div = document.createElement("div");
            div.className = "history-list-entry";
            div.innerHTML = `
                <span class="history-entry-emoji">${mapped.emoji}</span>
                <div class="history-entry-details">
                    <span class="history-entry-title">${mapped.title}</span>
                    <span class="history-entry-note">${note}</span>
                    <span class="history-entry-date">${formatDetailedDate(entry.created_at)} · ${source}</span>
                </div>`;
            listEl.appendChild(div);
        });
    } catch (err) {
        console.error("Profile error:", err);
    }
}

// ── Utilities ─────────────────────────────────────────────

function calculateStreak(history) {
    if (!history.length) return 0;
    const uniqueDates = [...new Set(history.map(h => h.created_at.split(" ")[0]))].sort().reverse();
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = Math.round((prev - curr) / 86400000);
        if (diff === 1) streak++;
        else break;
    }
    return streak;
}

function formatDateLabel(dateStr, days = 7) {
    const d = new Date(dateStr);
    if (days === 1) return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    if (days <= 7)  return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCompactDate(dateStr) {
    return new Date(dateStr.replace(' ', 'T') + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDetailedDate(dateStr) {
    return new Date(dateStr.replace(' ', 'T') + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Init ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    // Default to "Home" tab (log tab)
    startWebcam();
});

// ── MindfulMirror AI Chatbot (OpenRouter) ─────────────────

let chatHistory = [];
let chatIsOpen = false;

const QUICK_PROMPTS = [
    "How am I doing emotionally?",
    "Analyze my patterns",
    "Help me feel better",
    "What triggers my emotions?"
];

function toggleChat() {
    const w = document.getElementById("chat-window");
    chatIsOpen = !chatIsOpen;
    w.classList.toggle("hidden", !chatIsOpen);

    if (chatIsOpen) {
        document.getElementById("chat-input").focus();
        // Show welcome message and quick prompts on first open
        const container = document.getElementById("chat-messages");
        if (container.children.length === 0) {
            addChatMessage("Hi! I'm your MindfulMirror AI 🧠\n\nI'm connected to your emotion logs and can give you personalized insights. How can I support you today?", "ai");
            renderQuickPrompts();
        }
        // Hide badge
        document.getElementById("chat-fab-badge").classList.add("hidden");
    }
}

function renderQuickPrompts() {
    const container = document.getElementById("chat-messages");
    const wrapper = document.createElement("div");
    wrapper.className = "chat-quick-prompts";
    wrapper.id = "chat-quick-prompts";
    QUICK_PROMPTS.forEach(q => {
        const btn = document.createElement("button");
        btn.className = "chat-quick-btn";
        btn.textContent = q;
        btn.onclick = () => {
            wrapper.remove();
            document.getElementById("chat-input").value = q;
            sendChatMessage();
        };
        wrapper.appendChild(btn);
    });
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.querySelector(".btn-send-chat");
    const msg = input.value.trim();
    if (!msg) return;

    // Remove quick prompts if still visible
    document.getElementById("chat-quick-prompts")?.remove();

    input.value = "";
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    addChatMessage(msg, "user");

    const historyToSend = [...chatHistory];
    chatHistory.push({ role: "user", content: msg });

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        const res = await fetch(`${API}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, history: historyToSend })
        });
        const data = await res.json();
        removeTypingIndicator(typingId);
        
        const reply = data.reply || "I'm here for you. 💙";
        addChatMessage(reply, "ai");
        chatHistory.push({ role: "assistant", content: reply });

        // If chat is closed, show badge
        if (!chatIsOpen) {
            document.getElementById("chat-fab-badge").classList.remove("hidden");
        }
    } catch (e) {
        removeTypingIndicator(typingId);
        addChatMessage("I'm having a little trouble connecting right now. Please try again! 💙", "ai");
    } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

function addChatMessage(text, role) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = `chat-msg ${role === "user" ? "user" : "ai"}-msg`;
    
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    // Convert newlines to <br> for readability
    const htmlText = text.replace(/\n/g, "<br>");
    div.innerHTML = `<p>${htmlText}</p><span class="chat-msg-time">${now}</span>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById("chat-messages");
    const id = `typing-${Date.now()}`;
    const div = document.createElement("div");
    div.className = "chat-msg ai-msg typing-indicator";
    div.id = id;
    div.innerHTML = `<p><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    document.getElementById(id)?.remove();
}

// ── Image Upload ──────────────────────────────────────────

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Switch back to camera log view if on manual
    document.getElementById("manual-log-view").classList.add("hidden");
    document.getElementById("camera-log-view").classList.remove("hidden");
    
    setCameraBtn("loading");

    const reader = new FileReader();
    reader.onload = async (evt) => {
        // Strip data prefix
        const base64Str = evt.target.result.split(',')[1];
        
        try {
            const res = await fetch(`${API}/api/detect-emotion`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64Str })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Detection failed");
            }
            
            const result = await res.json();
            detectedEmotionRaw = result.emotion;
            detectedConfidenceVal = result.confidence;

            const mapped = MOOD_MAPPING[detectedEmotionRaw] || MOOD_MAPPING.neutral;
            setGlassCard(mapped.title, `${detectedConfidenceVal}% confidence (Uploaded)`);

            scanState = "confirm";
            setCameraBtn("confirm");
        } catch (err) {
            showToast("Failed to detect emotion from image.", "error");
            console.error(err);
            setCameraBtn("scan");
            scanState = "scan";
        } finally {
            e.target.value = ""; // clear input
        }
    };
    reader.readAsDataURL(file);
}
