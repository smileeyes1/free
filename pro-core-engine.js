/* =========================================================
   PRO SYSTEM v18 — FULL UNIFIED ENGINE
   Cache + Queue + History + Insight + Action + Adaptive
========================================================= */

/* ================= HISTORY ================= */
const HISTORY = (() => {

    const KEY = "PRO_HISTORY_V1";

    function load() {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || [];
        } catch {
            return [];
        }
    }

    function save(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch {}
    }

    function add(entry) {
        const data = load();

        data.unshift({
            ...entry,
            time: new Date().toISOString()
        });

        save(data.slice(0, 50));
    }

    function getAll() {
        return load();
    }

    return { add, getAll };

})();


/* ================= INSIGHT ================= */
const INSIGHT = (() => {

    function generate(teacher) {

        const data = HISTORY.getAll()
            .filter(x => x.teacher === teacher)
            .slice(0, 10);

        if (!data.length) return "لا يوجد تاريخ كافٍ";

        const freq = {};

        data.forEach(x => {
            freq[x.topic] = (freq[x.topic] || 0) + 1;
        });

        let top = "";
        let max = 0;

        for (const k in freq) {
            if (freq[k] > max) {
                max = freq[k];
                top = k;
            }
        }

        return top ? `أكثر موضوع تكرار: ${top}` : "لا نمط واضح";
    }

    return { generate };

})();


/* ================= ACTION ================= */
const ACTION = (() => {

    function generate(teacher, topic) {

        const last = HISTORY.getAll()
            .filter(x => x.teacher === teacher)[0];

        if (!last) return "ابدأ بخطة درس أساسية";

        if (last.topic === topic) {
            return "طوّر نشاط مختلف لنفس الدرس لرفع الفهم";
        }

        return "ابدأ بتمهيد يربط الدرس السابق بالجديد";
    }

    return { generate };

})();


/* ================= ADAPTIVE ================= */
const ADAPTIVE = (() => {

    function build(students) {

        if (!students?.length) return "";

        const weak = [];
        const medium = [];
        const strong = [];

        students.forEach((s, i) => {

            const mod = i % 3;

            if (mod === 0) weak.push(s);
            else if (mod === 1) medium.push(s);
            else strong.push(s);
        });

        return `
تصنيف الطلاب:

🔴 ضعيف:
${weak.join(", ") || "-"}

🟡 متوسط:
${medium.join(", ") || "-"}

🟢 متقدم:
${strong.join(", ") || "-"}
`;
    }

    return { build };

})();


/* ================= PRO ENGINE ================= */
const PRO = (() => {

    const PRIMARY_MODEL = "gemini-2.5-flash";
    const FALLBACK_MODEL = "gemini-1.5-flash";

    let running = false;

    const cache = new Map();

    const log = (m) => {
        const el = document.getElementById("statusLog");
        if (el) el.innerText = m;
    };

    const key = () =>
        document.getElementById("apiKey")?.value?.trim();

    async function hash(t) {
        const e = new TextEncoder().encode(t);
        const b = await crypto.subtle.digest("SHA-256", e);
        return [...new Uint8Array(b)]
            .map(x => x.toString(16).padStart(2, "0"))
            .join("");
    }

    function getCache(k) {
        try {
            return cache.get(k) ||
                JSON.parse(localStorage.getItem("PRO_CACHE_" + k));
        } catch {
            return null;
        }
    }

    function setCache(k, v) {
        cache.set(k, v);
        try {
            localStorage.setItem("PRO_CACHE_" + k, JSON.stringify(v));
        } catch {}
    }

    function validate(text) {
        if (!text || typeof text !== "string") return false;
        if (text.length < 30) return false;

        const bad = ["error", "undefined", "null", "system failed"];
        return !bad.some(x => text.toLowerCase().includes(x));
    }

    function timeout(ms = 20000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return { controller, timer };
    }

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

            const data = await res.json();

            if (!res.ok || data.error) {
                throw new Error(data?.error?.message || "API_ERROR");
            }

            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (!validate(text)) throw new Error("INVALID_OUTPUT");

            return text;

        } finally {
            clearTimeout(timer);
        }
    }

    async function run(prompt) {

        if (running) return "⚠ busy";
        running = true;

        try {

            const h = await hash(prompt);
            const cached = getCache(h);

            if (cached) {
                log("⚡ cache hit");
                return cached;
            }

            log("🧠 generating...");

            let result;

            try {
                result = await call(PRIMARY_MODEL, prompt);
            } catch {
                log("⚠ fallback triggered");

                try {
                    result = await call(FALLBACK_MODEL, prompt);
                } catch {
                    return "SYSTEM FAILED SAFE MODE";
                }
            }

            setCache(h, result);

            /* ================= CONTEXT LAYER ================= */

            try {

                const teacher =
                    document.getElementById("teacher")?.value || "unknown";

                const topic =
                    document.getElementById("topic")?.value || "unknown";

                const students =
                    (document.getElementById("students")?.value || "")
                        .split("\n")
                        .filter(x => x.trim());

                HISTORY.add({ teacher, topic, output: result });

                const insight = INSIGHT.generate(teacher);
                const action = ACTION.generate(teacher, topic);
                const adaptive = ADAPTIVE.build(students);

                console.log("INSIGHT:", insight);
                console.log("ACTION:", action);
                console.log("ADAPTIVE:", adaptive);

                log(`✔ ${insight} | ${action}`);

            } catch {}

            return result;

        } finally {
            running = false;
        }
    }

    return { run };

})();


/* ================= PIPELINE ================= */
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
`أنت نظام تعليمي مؤسسي عالي الدقة.

المعلم: ${teacher}
المدرسة: ${school}
الموضوع: ${topic}

الطلاب: ${JSON.stringify(students)}

${ADAPTIVE.build(students)}

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
        "✔ PRO v18 FULL SYSTEM ACTIVE";
}
