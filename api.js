document.getElementById("pdfUpload").addEventListener("change", async (e)=>{
const file=e.target.files[0];
if(!file)return;

document.getElementById("pdfProgress").classList.remove("hidden");

const buf=await file.arrayBuffer();
const pdf=await pdfjsLib.getDocument({data:buf}).promise;

let text="";
const pages=Math.min(pdf.numPages,12); // تقليل استهلاك

for(let i=1;i<=pages;i++){
const page=await pdf.getPage(i);
const content=await page.getTextContent();
text+=content.items.map(x=>x.str).join(" ")+"\n";
}

S.pdf = compressText(text);
S.pdfHash = await hashText(S.pdf);

document.getElementById("pdfProgress").classList.add("hidden");
log("تم تحميل PDF");
});

/* ================= GEMINI CORE ================= */
async function callGemini(prompt){

const key=getKey();
if(!key) return "لا يوجد مفتاح";

const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
contents:[{parts:[{text:prompt}]}]
})
});

const data=await res.json();
return data?.candidates?.[0]?.content?.parts?.[0]?.text || "خطأ";
}

/* ================= PIPELINE ================= */
async function executeProductionPipeline(){

const cacheKey = await hashText(
teacher.value + school.value + topic.value + S.pdfHash
);

const cached = cacheGet(cacheKey);
if(cached){
document.getElementById("completePrintPackage").innerHTML=cached;
log("تم استرجاع من الكاش");
return;
}

const prompt = buildPrompt();

/* تقليل API */
let result;

if(!shouldUseAPI()){
result = `
<div>
<h2>وضع محلي</h2>
<p>تحليل بيانات فقط بدون API</p>
</div>
`;
}else{
result = await callGemini(prompt);
}

/* تنظيف */
result = result.replace(/```html/g,"").replace(/```/g,"");

document.getElementById("completePrintPackage").innerHTML=result;
cacheSet(cacheKey,result);

log("تم التنفيذ");
}
