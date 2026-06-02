/* ================================
   AI KERNEL v1.0 (ONE FILE CORE)
   - Auto Key Switching
   - Auto Model Routing
   - Auto Fail Recovery
   - Cache First Strategy
   - Overrides external logic
================================ */

const AI_KERNEL = (() => {

    /* ========== STATE ========== */
    let KEYS = [];
    let KEY_INDEX = 0;

    const MODELS = [
        "gemini-2.5-flash",
        "gemini-2.5-pro"
    ];

    const CACHE = new Map();

    /* ========== INIT KEYS ========== */
    function loadKeys(){
        const raw = localStorage.getItem("k_pool") || localStorage.getItem("k") || "";
        KEYS = raw.split("\n").map(k => k.trim()).filter(Boolean);
    }

    /* ========== KEY ROTATION ========== */
    function nextKey(){
        if(KEYS.length === 0) return null;
        const key = KEYS[KEY_INDEX % KEYS.length];
        KEY_INDEX++;
        return key;
    }

    /* ========== CACHE ========== */
    async function getCache(key){
        return CACHE.get(key) || null;
    }

    async function setCache(key, value){
        CACHE.set(key, value);
    }

    /* ========== MODEL PICKER ========== */
    function pickModel(prompt){

        if(prompt.length < 500) return MODELS[0]; // fast

        if(prompt.includes("اختبار") || prompt.includes("تحليل"))
            return MODELS[1]; // pro

        return MODELS[0];
    }

    /* ========== CORE REQUEST ========== */
    async function request(prompt, retry = 2){

        loadKeys();

        const cacheKey = btoa(unescape(encodeURIComponent(prompt))).slice(0, 60);

        const cached = await getCache(cacheKey);
        if(cached) return cached;

        const model = pickModel(prompt);

        for(let i = 0; i < Math.max(1, KEYS.length); i++){

            const key = nextKey();
            if(!key) break;

            try{

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    }
                );

                if(!res.ok) continue;

                const data = await res.json();

                const output =
                    data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if(output){

                    await setCache(cacheKey, output);
                    return output;
                }

            } catch(e){
                // تجاهل الخطأ وتجربة مفتاح آخر
                continue;
            }
        }

        return fallback(prompt);
    }

    /* ========== FALLBACK (NO API MODE) ========== */
    function fallback(prompt){

        return `
<div style="font-family:Arial;direction:rtl">

<h3>وضع محلي (بدون API)</h3>

<p>تم إنشاء محتوى أساسي تلقائي بسبب عدم توفر نموذج مناسب.</p>

<hr>

<p><b>المطلوب:</b></p>
${prompt.slice(0, 800)}

<hr>

<p>⚠️ النظام يعمل بوضع الطوارئ</p>

</div>`;
    }

    /* ========== PUBLIC API ========== */
    return {
        run: request
    };

})();

/* ================================
   GLOBAL OVERRIDE (IMPORTANT)
================================ */

window.AI = async function(prompt){
    return await AI_KERNEL.run(prompt);
};
