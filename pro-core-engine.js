/* =========================================================
   PRO+ CORE v18 — HARD STABLE PRODUCTION ENGINE (FIXED)
========================================================= */

const PRO = (() => {

    const PRIMARY_MODEL = "gemini-2.5-flash";
    const FALLBACK_MODEL = "gemini-1.5-flash";

    const CACHE_TTL = 1000 * 60 * 60 * 24;
    const MAX_QUEUE = 10;

    let running = false;
    const queue = [];

    const cache = new Map();

    const log = (m) => {
        const el = document.getElementById("statusLog");
        if (el) el.innerText = m;
    };

    const key = () =>
        document.getElementById("apiKey")?.value?.trim();

    /* ================= HASH ================= */
    async function hash(t) {
        const e = new TextEncoder().encode(t);
        const b = await crypto.subtle.digest("SHA-256", e);
        return [...new Uint8Array(b)]
            .map(x => x.toString(16).padStart(2, "0"))
            .join("");
    }

    /* ================= CACHE SAFE ================= */
    function setCache(k, v) {
        const obj = { value: v, time: Date.now() };
        cache.set(k, obj);
        try {
            localStorage.setItem("PRO_CACHE_" + k, JSON.stringify(obj));
        } catch {}
    }

    function getCache(k) {
        try {
            const raw = cache.get(k) || localStorage.getItem("PRO_CACHE_" + k);
            if (!raw) return null;

            const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (!obj?.value || !obj?.time) return null;

            if (Date.now() - obj.time > CACHE_TTL) return null;

            return obj.value;

        } catch {
            return null;
        }
    }

    /* ================= VALIDATION ================= */
    function validate(text) {
        if (!text || typeof text !== "string") return false;
        if (text.length < 30) return false;

        const bad = ["error", "undefined", "null", "system failed"];
        return !bad.some(x => text.toLowerCase().includes(x));
    }

    /* ================= ERROR CLASS ================= */
    function classifyError(e) {
        const m = String(e?.message || "").toLowerCase();

        if (m.includes("abort") || m.includes("timeout")) return "NETWORK";
        if (m.includes("rate") || m.includes("quota")) return "LIMIT";
        if (m.includes("model")) return "MODEL";
        if (m.includes("invalid")) return "OUTPUT";
        if (m.includes("fetch")) return "NETWORK";

        return "UNKNOWN";
    }

    /* ================= TIMEOUT ================= */
    function timeout(ms = 20000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return { controller, timer };
    }

    /* ================= API CALL ================= */
    async function call(model, prompt) {

        const apiKey = key();
        if (!apiKey) throw new Error("NO_KEY");

        const { controller, timer } = timeout();

        try {

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok || !data) {
                throw new Error("NETWORK");
            }

            if (data.error) {
                throw new Error(data.error.message || "API_ERROR");
            }

            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (!validate(text)) throw new Error("INVALID_OUTPUT");

            return text;

        } finally {
            clearTimeout(timer);
        }
    }

    /* ================= EXECUTE CORE ================= */
    async function execute(prompt) {

        const h = await hash(prompt);
        const cached = getCache(h);

        if (cached) {
            log("⚡ cache hit");
            return cached;
        }

        log("🧠 primary");

        try {

            const result = await call(PRIMARY_MODEL, prompt);
            setCache(h, result);

            log("✅ primary success");
            return result;

        } catch (e1) {

            const type = classifyError(e1);

            log("⚠ fallback: " + type);

            if (type === "LIMIT" || type === "NETWORK" || type === "OUTPUT") {

                try {

                    // retry once
                    try {
                        const retry = await call(PRIMARY_MODEL, prompt);
                        setCache(h, retry);
                        log("✅ retry success");
                        return retry;
                    } catch {}

                    // fallback
                    const fb = await call(FALLBACK_MODEL, prompt);
                    setCache(h, fb);

                    log("✅ fallback success");
                    return fb;

                } catch {
                    log("❌ full failure");
                    return "SYSTEM FAILED SAFE MODE";
                }
            }

            return "SYSTEM FAILED SAFE MODE";
        }
    }

    /* ================= QUEUE ================= */
    async function processQueue() {

        if (running) return;
        running = true;

        while (queue.length > 0) {

            const job = queue.shift();

            try {
                const result = await execute(job.prompt);
                job.resolve(result);
            } catch (e) {
                job.reject(e);
            }
        }

        running = false;
    }

    function run(prompt) {

        return new Promise((resolve, reject) => {

            if (queue.length >= MAX_QUEUE) {
                reject("QUEUE_OVERFLOW");
                return;
            }

            queue.push({ prompt, resolve, reject });
            processQueue();
        });
    }

    return { run };

})();

/* =========================================================
   PIPELINE ENGINE
========================================================= */

async function executeProductionPipeline() {

    const printArea = document.getElementById("completePrintPackage");

    const teacher = document.getElementById("teacher").value.trim() || "المعلم";
    const school = document.getElementById("school").value.trim() || "المدرسة";
    const topic = document.getElementById("topic").value.trim() || "الدرس";

    const students = (document.getElementById("students").value || "")
        .split("\n")
        .filter(x => x.trim());

    const pdf = S.pdf || "";

    const custom = document.getElementById("customPrompt").value.trim();

    const base =
`أنت نظام تعليمي مؤسسي.

المعلم: ${teacher}
المدرسة: ${school}
الموضوع: ${topic}

الطلاب: ${JSON.stringify(students)}

المرجع:
${pdf}
`;

    const prompt = custom
        ? base + "\nتنفيذ خاص:\n" + custom
        : base + `
المطلوب:
- خطة درس
- أوراق عمل
- اختبار
- رصد طلاب

HTML فقط بدون شرح.
`;

    const result = await PRO.run(prompt);

    printArea.innerHTML = result;

    localStorage.setItem("last_result_html", result);

    document.getElementById("statusLog").innerText =
        "✔ PRO v18 STABLE QUEUE ENGINE ACTIVE";
}
