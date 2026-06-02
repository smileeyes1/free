window.S = {
pdf:"",
pdfHash:"",
cache:new Map(),
useAPI:true
};

function cacheSet(k,v){ S.cache.set(k,v); }
function cacheGet(k){ return S.cache.get(k); }

async function hashText(text){
const data=new TextEncoder().encode(text);
const hash=await crypto.subtle.digest("SHA-256",data);
return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

function compressText(text){
return text.split(/\n+/).slice(0,120).join("\n");
}

function log(msg){
document.getElementById("statusLog").innerText=msg;
}

/* قرار ذكي لتقليل API */
function shouldUseAPI(){
const mode = "smart";
if(!S.pdf || S.pdf.length < 1500) return false;
return true;
}

/* كاش ذكي للمطالب */
async function cachedAI(key, fn){
if(S.cache.has(key)) return S.cache.get(key);
const res = await fn();
S.cache.set(key,res);
return res;
}

function buildPrompt(){
return `
نظام تعليمي مؤسسي:

المعلم:${teacher.value}
المدرسة:${school.value}
الموضوع:${topic.value}

النص:
${S.pdf}

أخرج:
1- خطة درس
2- أوراق عمل
3- اختبار
4- تقييم
`;
}

function generateKey(){
apiKey.value = "GEM-" + crypto.randomUUID().slice(0,10);
}

function saveKey(){
localStorage.setItem("gemini_key",apiKey.value);
log("تم حفظ المفتاح");
}

function getKey(){
return localStorage.getItem("gemini_key") || apiKey.value;
}
