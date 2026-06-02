<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PRO+ Educational Engine</title>

<script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-slate-100 text-gray-800">

<!-- ================= HEADER ================= -->
<header class="bg-slate-900 text-white p-4 flex justify-between items-center">

    <h1 class="font-bold">PRO+ Engine</h1>

    <div class="flex gap-2 items-center">

        <input type="password" id="apiKey"
            placeholder="Gemini API Key"
            class="px-2 py-1 rounded text-black text-sm w-64">

        <button onclick="saveApiKey()"
            class="bg-green-600 px-3 py-1 rounded text-sm font-bold">
            حفظ
        </button>

        <button onclick="openKeyGenerator()"
            class="bg-blue-600 px-3 py-1 rounded text-sm font-bold">
            توليد مفتاح
        </button>

    </div>

</header>

<!-- ================= INPUTS ================= -->
<main class="p-4 space-y-3">

    <input id="teacher" placeholder="المعلم" class="w-full p-2 rounded border">
    <input id="school" placeholder="المدرسة" class="w-full p-2 rounded border">
    <textarea id="topic" placeholder="الموضوع" class="w-full p-2 rounded border"></textarea>

    <textarea id="students" placeholder="الطلاب" class="w-full p-2 rounded border"></textarea>

    <textarea id="customPrompt" placeholder="طلب خاص" class="w-full p-2 rounded border"></textarea>

    <button onclick="executeProductionPipeline()"
        class="bg-indigo-600 text-white px-4 py-2 rounded font-bold">
        تشغيل النظام
    </button>

    <div id="statusLog" class="text-sm font-bold text-blue-600"></div>

</main>

<!-- ================= OUTPUT ================= -->
<div contenteditable="true"
     id="completePrintPackage"
     class="m-4 p-4 bg-white border rounded min-h-[300px]">
</div>

<script>
/* =========================================================
   API KEY SYSTEM
========================================================= */

function saveApiKey() {
    const key = document.getElementById("apiKey").value.trim();
    if (!key) return alert("أدخل المفتاح أولاً");
    localStorage.setItem("GEMINI_KEY", key);
    document.getElementById("statusLog").innerText = "✔ تم حفظ المفتاح";
}

function loadApiKey() {
    const key = localStorage.getItem("GEMINI_KEY");
    if (key) document.getElementById("apiKey").value = key;
}

function openKeyGenerator() {
    window.open("https://makersuite.google.com/app/apikey", "_blank");
}

/* override key access */
function key() {
    return localStorage.getItem("GEMINI_KEY")?.trim();
}

window.onload = loadApiKey;

/* =========================================================
   PRO ENGINE (SIMPLIFIED STABLE VERSION)
========================================================= */

const PRO = (() => {

    let running = false;

    function log(m) {
        document.getElementById("statusLog").innerText = m;
    }

    function validate(text) {
        if (!text || text.length < 20) return false;
        const bad = ["error", "undefined", "null", "failed"];
        return !bad.some(x => text.toLowerCase().includes(x));
    }

    async function call(prompt) {

        const apiKey = key();
        if (!apiKey) throw new Error("NO_KEY");

        const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await res.json();

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!res.ok || !validate(text)) {
            throw new Error("API_FAIL");
        }

        return text;
    }

    async function run(prompt) {

        if (running) return "⚠ busy";
        running = true;

        try {

            log("🧠 processing...");

            const result = await call(prompt);

            log("✅ success");

            return result;

        } catch (e) {

            log("❌ error → fallback");

            try {

                const result = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key(),
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    }
                );

                const data = await result.json();

                return data?.candidates?.[0]?.content?.parts?.[0]?.text || "SYSTEM FAILED";

            } catch {

                return "SYSTEM FAILED SAFE MODE";
            }

        } finally {
            running = false;
        }
    }

    return { run };

})();

/* =========================================================
   PIPELINE
========================================================= */

async function executeProductionPipeline() {

    const teacher = document.getElementById("teacher").value;
    const school = document.getElementById("school").value;
    const topic = document.getElementById("topic").value;
    const students = document.getElementById("students").value;
    const custom = document.getElementById("customPrompt").value;

    const base = `
المعلم: ${teacher}
المدرسة: ${school}
الموضوع: ${topic}
الطلاب: ${students}
`;

    const prompt = custom ? base + custom : base + `
أنشئ:
- خطة درس
- أوراق عمل
- اختبار
- تقييم
HTML فقط
`;

    const result = await PRO.run(prompt);

    document.getElementById("completePrintPackage").innerHTML = result;

    document.getElementById("statusLog").innerText =
        "✔ النظام جاهز";
}

</script>

</body>
</html>
