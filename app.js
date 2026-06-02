/* Setup PDF.js Worker Channel globally */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

/* ================= STATE MANAGEMENT ================= */
let STUDENTS = [];
let API_KEY = localStorage.getItem("TEACHER_GEMINI_KEY") || "";
let EXTRACTED_PDF_DATA = { rawText: "", structuredText: "", cleanPagesCount: 0, fileHash: "" };

if(API_KEY) {
    document.getElementById("apiKeyField").value = "********";
}

function saveApiKey() {
    const key = document.getElementById("apiKeyField").value.trim();
    if(key === "********") return;
    if(key) {
        localStorage.setItem("TEACHER_GEMINI_KEY", key);
        API_KEY = key;
        alert("تم حفظ وتأمين مفتاح API بنجاح.");
    } else {
        localStorage.removeItem("TEACHER_GEMINI_KEY");
        API_KEY = "";
        alert("تم إزالة مفتاح API.");
    }
}

/* ================= UTILITIES ================= */
function clean(text){ return (text || "").replace(/\s+/g,' ').trim(); }

// دالة لتوليد معرف فريد للموضوع لضمان دقة الكاش المحلي والفرز
function generateCacheKey(topic, type) {
    return "CACHE_" + encodeURIComponent(topic.trim().replace(/\s+/g, '_')) + "_" + type;
}

/* ================= MODULE: PDF INTELLIGENCE LAYER ENGINE + LOCAL CACHE ================= */
async function processUploadedPDF() {
    const fileInput = document.getElementById("pdfFileInput");
    const metaDisplay = document.getElementById("pdfMetadataDisplay");
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("الرجاء اختيار ملف PDF صالح أولاً للمعالجة.");
        return;
    }
    
    const file = fileInput.files[0];
    metaDisplay.classList.remove("hidden");
    metaDisplay.innerText = "⏳ جاري قراءة حزم البيانات من المستند وهيكلة الصفحات محلياً وتفعيل الكاش الذكي...";
    
    // استخدام اسم وحجم الملف كمعرف بصمة محلي سريع لتقليل الاستهلاك وضبط الكاش
    EXTRACTED_PDF_DATA.fileHash = file.name + "_" + file.size;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const typedarray = new Uint8Array(e.target.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageItems = textContent.items.map(item => item.str);
                
                fullText += `\n--- [بداية الصفحة الدراسية رقم: ${i}] ---\n`;
                fullText += pageItems.join(" ");
            }
            
            // طبقة التنظيف الشاملة وحفظ ترتيب المستند بدون تشويه
            let cleanText = fullText
                .replace(/[\r\n]+/g, '\n')
                .replace(/[^\x00-\x7F\u0600-\u06FF\s\-().,;!?:]/g, '') 
                .replace(/ {2,}/g, ' '); 
            
            EXTRACTED_PDF_DATA.rawText = fullText;
            EXTRACTED_PDF_DATA.structuredText = cleanText;
            EXTRACTED_PDF_DATA.cleanPagesCount = pdf.numPages;
            
            metaDisplay.innerText = `✅ تمت المعالجة والحفظ المحلي بنجاح. عدد الصفحات: ${pdf.numPages} صفحة. ذاكرة الكاش مستعدة الآن للتوليد الاقتصادي.`;
            
            const textSnippet = " [تمت قراءة مادة المنهاج من ملف PDF المرفق بنجاح] ";
            if(!document.getElementById("input").value.includes(textSnippet)){
                document.getElementById("input").value += "\n" + textSnippet;
            }
        } catch (err) {
            console.error(err);
            metaDisplay.innerText = "❌ فشل محرك PDF.js في معالجة وفهرسة هذا الملف محلياً.";
        }
    };
    reader.readAsArrayBuffer(file);
}

async function runAdvancedPDFIntelligence() {
    const targetType = document.getElementById("pdfTargetOutput").value;
    const topicData = document.getElementById("lessonTopic").value.trim();
    const metaDisplay = document.getElementById("pdfMetadataDisplay");
    
    if (!EXTRACTED_PDF_DATA.structuredText) {
        alert("يرجى تحميل ومعالجة ملف الـ PDF أولاً عبر زر الاستخراج المخصص.");
        return;
    }
    if (!topicData) {
        alert("يرجى إدخال موضوع أو عنوان الدرس لتنظيم فهرسة وحفظ الكاش المحلي.");
        return;
    }

    // فحص كاش النظام المحلي المطور لتقليل الاستهلاك
    const cacheKey = generateCacheKey(topicData, targetType);
    const cachedOutput = localStorage.getItem(cacheKey);
    
    const titlesMap = {
        "lesson_plan": "خطة تحضير الحصة التنفيذية النموذجية (PDF)",
        "unit_plan": "الخطة البنائية والزمنية للوحدة الدراسية الشاملة",
        "semester_plan": "التوزيع الزمني الاستراتيجي لخطط الفصل الدراسي",
        "year_plan": "المصفوفة السنوية الوزارية الشاملة ومراحل تعلم المادة",
        "worksheet": "ورقة عمل تطبيقية وتقييمية متعددة المستويات المعرفية",
        "exam": "نموذج الاختبار التحصيلي الرسمي الموحد والمعايير",
        "rubric": "قوائم الرصد والتقييم المهاري ومستويات كفاءة الأداء"
    };
    document.getElementById("documentPrintTitle").innerText = titlesMap[targetType] || "وثيقة تخطيطية معتمدة";
    updatePrintMetadata();

    if (cachedOutput) {
        // استرجاع فوري ومجاني بدون استهلاك الـ API
        document.getElementById("output").innerText = cachedOutput;
        document.getElementById("status").innerText = "⚡ تم استرداد المخرج فوراً ومجاناً من ذاكرة الكاش المحلية (صفر استهلاك للـ API)";
        document.getElementById("status").className = "text-xs text-center font-bold text-green-600";
        
        // إخطار النواة المركزية v18 بالاستدعاء الذكي المحلي للكاش
        sendToCore({
            type: "pdf_intelligence_packet",
            data: {
                targetOutputType: targetType,
                pagesIndexed: EXTRACTED_PDF_DATA.cleanPagesCount,
                topic: topicData + " (مسترجع من الكاش المحلي)",
                extractedContentLength: cachedOutput.length,
                timestamp: new Date().toISOString()
            }
        });
        return;
    }

    if (!API_KEY) {
        alert("يرجى إدخال وتأمين مفتاح Gemini API أولاً لتوليد المستند لأول مرة قبل حفظه محلياً.");
        return;
    }

    document.getElementById("status").innerText = "🔄 جاري ضخ محتوى الـ PDF للذكاء المركزي لبناء الوثيقة عبر نموذج Gemini 2.5-Flash لأول مرة...";
    document.getElementById("status").className = "text-xs text-center font-bold text-indigo-600";

    let specializedPrompt = `أنت موجه تربوي وزاري وخبير في هندسة المناهج التعليمية وتحليل الوثائق.
أمامك المادة العلمية المستخرجة بدقة من ملف الـ PDF التالي:
${EXTRACTED_PDF_DATA.structuredText.substring(0, 8000)} 

العنوان أو الموضوع المرجعي التوجيهي: ${topicData}
عدد طلاب الصف المتابعين: ${STUDENTS.length} طالباً.

المطلوب منك توليد المخرج البرمجي والتربوي التالي بشكل مفصل بالكامل دون أي اختصارات أو تعليقات مفقودة:

`;

    if(targetType === "lesson_plan") {
        specializedPrompt += `[المخرج المطلوب: تحضير درس كامل وتفصيلي]
يجب أن يحتوي البناء على هيكلية الحصة الدقيقة:
- أهداف إجرائية سلوكية (معرفية، مهارية، وجدانية) قابلة للقياس.
- التمهيد المباشر والجاذب لإثارة الانتباه (5 دقائق).
- الشرح الإجرائي العميق لصلب الدرس وتفكيك المفاهيم.
- النشاط التطبيقي التعاوني القائم على المجموعات.
- التقويم التكويني واللحظي المباشر.
- الإغلاق التلخيصي للحصة (3 دقائق).`;
    } else if(targetType === "unit_plan") {
        specializedPrompt += `[المخرج المطلوب: خطة وحدة دراسية متكاملة]
يجب أن يتضمن البناء:
- الأهداف الختامية الكبرى للوحدة الدراسية.
- عدد الدروس المقترحة لتغطية المادة وسياقها الزمني.
- تسلسل تدفق المفاهيم والمصطلحات من السهل إلى الصعب.
- الأنشطة التراكمية المشتركة التي تربط دروس الوحدة ببعضها.`;
    } else if(targetType === "semester_plan") {
        specializedPrompt += `[المخرج المطلوب: خطة فصل دراسي كامل]
... مصفوفة التوزيع الزمني للأسابيع والوحدات على مدار أشهر الفصل الدراسي مع رصد زمن التنفيذ والحصص المخصصة لكل وحدة فرعية، بالإضافة إلى المهارات الكلية المستهدفة بنهاية الفصل.`;
    } else if(targetType === "year_plan") {
        specializedPrompt += `[المخرج المطلوب: خطة سنة دراسية شاملة]
... خطة التوزيع الشامل للمادة التعليمية على مدار العام الدراسي بالكامل، تتابع مراحل التعلم والبناء المعرفي التراكمي، مع استراتيجيات دمج وتنمية مهارات التفكير العليا (تحليل، تركيب، تقييم).`;
    } else if(targetType === "worksheet") {
        specializedPrompt += `[المخرج المطلوب: أوراق عمل تطبيقية متميزة]
تصميم ورقة عمل جاهزة للطباعة تحتوي على أسئلة تطبيقية غنية ومتنوعة مقسمة بوضوح إلى ٣ مستويات معرفية متدرجة: سهل، متوسط، صعب (مهارات تفكير عليا وحل مشكلات مركبة لغرض التحدي الإثرائي).`;
    } else if(targetType === "exam") {
        specializedPrompt += `[المخرج المطلوب: نموذج اختبار تحصيلي رسمي]
صياغة اختبار شامل متوازن يحتوي على الأسئلة التالية مع ترك مساحات للإجابة: اختيار من متعدد دقيق، أسئلة الصواب والخطأ مع طلب تصحيح الخطأ، وأسئلة مقالية قصيرة تقيس الفهم والتعليل.`;
    } else if(targetType === "rubric") {
        specializedPrompt += `[المخرج المطلوب: قوائم رصد ومستويات أداء متكاملة]
جدول أو قائمة رصد مهارية واضحة المعايير ومستخرجة من صلب المنهاج، مع تحديد مستويات الأداء ومؤشرات التحقق بدقة موزعة على المستويات الثلاثة: (ضعيف / جيد / ممتاز).`;
    }

    specializedPrompt += `\n\nاكتب الوثيقة المخرجة بلغة عربية تربوية رصينة وفخمة، واجعلها جاهزة للاستخدام والطباعة والاعتماد مباشرة بدون أي مقدمات نظرية أو حشو.`;

    try {
        // الاتصال المباشر بنموذج الاعتماد المطوّر gemini-2.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: specializedPrompt }] }]
            })
        });

        const jsonResult = await response.json();
        const aiResponseText = jsonResult.candidates[0].content.parts[0].text;

        // تفعيل طبقة الحفظ المحلي الاقتصادي (حفظ المستند كاملاً محلياً لمنع تكرار الاستهلاك)
        localStorage.setItem(cacheKey, aiResponseText);

        document.getElementById("output").innerText = aiResponseText;

        sendToCore({
            type: "pdf_intelligence_packet",
            data: {
                targetOutputType: targetType,
                pagesIndexed: EXTRACTED_PDF_DATA.cleanPagesCount,
                topic: topicData + " (تم التوليد والحفظ في الكاش 💾)",
                extractedContentLength: aiResponseText.length,
                timestamp: new Date().toISOString()
            }
        });

        document.getElementById("status").innerText = "✔ تم التوليد عبر Gemini 2.5 وحفظ المخرج بنجاح في الكاش المحلي للمتصفح لمنع تكرار الاستهلاك المستقبلي.";
        document.getElementById("status").className = "text-xs text-center font-bold text-green-600";

    } catch (error) {
        console.error(error);
        document.getElementById("status").innerText = "❌ فشل محرك الذكاء في معالجة طلب الـ PDF. تحقق من الاتصال والمفتاح.";
        document.getElementById("status").className = "text-xs text-center font-bold text-red-600";
    }
}

/* ================= STUDENT CORE MANAGEMENT ================= */
function addStudent(){
    const inputElement = document.getElementById("newStudent");
    const name = clean(inputElement.value);
    if(!name) return;
    
    if(!STUDENTS.includes(name)){
        STUDENTS.push(name);
        renderStudents();
        sendToCore({ type: "student_add", data: { name: name } });
    }
    inputElement.value = "";
}

function renderStudents(){
    const listContainer = document.getElementById("studentsList");
    if(STUDENTS.length === 0){
        listContainer.innerHTML = `<div class="text-gray-400 text-center text-xs py-4">لا يوجد طلاب مسجلون حالياً</div>`;
        return;
    }
    listContainer.innerHTML = STUDENTS.map((student, index) => 
        `<div class="bg-white p-2 rounded shadow-sm border border-gray-100 flex justify-between items-center">
            <span class="font-bold text-gray-700">${index + 1}. ${student}</span>
        </div>`
    ).join("");
}

/* ================= ANALYTICS LAYER ================= */
function analyze(text, topic, target){
    const t = clean(text);
    return {
        text: t,
        topic: topic,
        target: target,
        weak: /ضعيف|تبسيط|علاج/.test(t) || target === "ضعيف",
        strong: /متفوق|إثراء|متقدم/.test(t) || target === "متفوق",
        review: /مراجعة|تثبيت/.test(t),
        exam: /اختبار|امتحان|تقييم/.test(t),
        worksheet: /ورقة|نشاط/.test(t),
        lesson: /درس|شرح/.test(t) || topic.length > 0,
        complex: t.length > 80
    };
}

/* ================= DECISION ENGINE ================= */
function decide(analysis, studentCount){
    let type = "حصة درس";
    let goal = "تعلم أساسي";
    let mode = "عادي";

    if(analysis.exam) type = "حصة اختبار";
    else if(analysis.worksheet) type = "نشاط تطبيقي";
    else if(analysis.lesson) type = "حصة درس";

    if(analysis.weak){ 
        type = "حصة علاجية"; 
        goal = "رفع الفهم وتثبيت الأساسيات المعرفية للطلاب"; 
    } else if(analysis.strong){ 
        type = "حصة إثرائية"; 
        goal = "توسيع التفكير الاستراتيجي والمهارات العليا للمتفوقين"; 
    } else if(analysis.review){ 
        type = "حصة مراجعة"; 
        goal = "تثبيت وتكرار المعرفة المكتسبة سابقاً"; 
    }

    if(analysis.complex || studentCount > 25){
        mode = "متقدم";
        goal += " + إدارة صفية متكاملة لضبط المستويات التفاعلية";
    }

    return { type, goal, mode, topic: analysis.topic };
}

/* ================= LESSON STRUCTURER ================= */
function buildLesson(decision, studentCount){
    const groupsCount = Math.max(2, Math.ceil(studentCount / 5));
    return `🎯 العنوان التعليمي: ${decision.topic || "عام وموحد"}
📌 النمط الإجرائي: ${decision.type} | البيئة التشغيلية: ${decision.mode}
👥 القوة الاستيعابية: ${studentCount} طالباً | تشكيل المجموعات: ${groupsCount} مجموعات نشطة

🕒 البروتوكول الزمني المعتمد لإدارة الحصة (45 دقيقة):
[05 د] 🟡 التمهيد المباشر: استدعاء التغذية القبلية وتهيئة الأذهان.
[10 د] 📘 الشرح الإجرائي: عرض المفاهيم المباشرة وتحقيق هدف (${decision.goal}).
[20 د] 🧠 النشاط التطبيقي: توزيع المهام والعمل المستقل داخل المجموعات الـ ${groupsCount}.
[07 د] 📊 القياس والتقويم: رصد الأداء اللحظي وجمع البيانات الاستدلالية.
[03 د] 🏁 الغلق والإنهاء: تلخيص المكتسبات وتثبيت المهام القادمة.`;
}

/* ================= NETWORK PROTOCOL BRIDGE ================= */
function sendToCore(packet){
    try {
        const payload = JSON.stringify({ id: Date.now(), ...packet });
        localStorage.setItem("V18_BRIDGE", payload);
        
        const statusLabel = document.getElementById("connectionStatus");
        statusLabel.innerText = "متصل بنجاح ✔";
        statusLabel.className = "font-bold text-green-600";
        
        setTimeout(() => {
            statusLabel.innerText = "جاهز للإرسال التالي ⚡";
            statusLabel.className = "font-bold text-blue-600";
        }, 1500);
    } catch(e) {
        document.getElementById("connectionStatus").innerText = "خطأ في المزامنة";
        document.getElementById("connectionStatus").className = "font-bold text-red-600";
    }
}

/* ================= SYNC METADATA FOR PRINTING ================= */
function updatePrintMetadata() {
    const teacherName = document.getElementById("teacher").value || "______";
    const schoolName = document.getElementById("school").value || "______";
    document.getElementById("printTeacherName").innerText = "المعلم: " + teacherName;
    document.getElementById("printSchoolName").innerText = "المدرسة: " + schoolName;
}

/* ================= SYSTEM EXECUTION LOOPS ================= */
function runSystem(){
    const inputData = document.getElementById("input").value;
    const topicData = document.getElementById("lessonTopic").value;
    const targetData = document.getElementById("lessonTarget").value;

    if(!inputData && !topicData){
        document.getElementById("status").innerText = "⚠️ إدخال البيانات أو الموضوع إلزامي للتشغيل المعياري";
        document.getElementById("status").className = "text-xs text-center font-bold text-red-600";
        return;
    }

    document.getElementById("documentPrintTitle").innerText = "خطة تحضير الحصة التنفيذية الشاملة";
    updatePrintMetadata();
    const currentAnalysis = analyze(inputData, topicData, targetData);
    const currentDecision = decide(currentAnalysis, STUDENTS.length);
    const formattedLesson = buildLesson(currentDecision, STUDENTS.length);

    sendToCore({ type: "students_snapshot", data: { students: STUDENTS } });
    sendToCore({ type: "analysis", data: currentAnalysis });
    sendToCore({ type: "lesson", data: currentDecision });

    document.getElementById("output").innerText = formattedLesson;
    document.getElementById("status").innerText = "✔ تم التنفيذ العادي وتحديث المنظومة المركزية";
    document.getElementById("status").className = "text-xs text-center font-bold text-green-600";
}

/* ================= ADVANCED DEEP API INTEGRATION VIA GEMINI 2.5 ================= */
async function runGeminiSystem() {
    const inputData = document.getElementById("input").value;
    const topicData = document.getElementById("lessonTopic").value.trim();
    const targetData = document.getElementById("lessonTarget").value;

    if(!API_KEY) {
        alert("خطأ: يرجى إدخال وحفظ مفتاح Gemini API أولاً في أعلى الصفحة.");
        return;
    }
    if(!topicData) {
        alert("يرجى كتابة موضوع الدرس لتوجيه محرك الذكاء الاصطناعي وبناء الكاش الذكي.");
        return;
    }

    // تفعيل الكاش المحلي لحصص الشرح العادية أيضاً
    const regularCacheKey = generateCacheKey(topicData, "REGULAR_LESSON_PLAN");
    const cachedPlan = localStorage.getItem(regularCacheKey);

    document.getElementById("documentPrintTitle").innerText = "خطة تحضير الحصة التنفيذية الشاملة";
    updatePrintMetadata();

    if (cachedPlan) {
        document.getElementById("output").innerText = cachedPlan;
        document.getElementById("status").innerText = "⚡ تم استدعاء خطة الشرح الفاخرة من الكاش المحلي الفوري (صفر استهلاك للمفتاح)";
        document.getElementById("status").className = "text-xs text-center font-bold text-green-600";
        return;
    }

    document.getElementById("status").innerText = "🔄 جاري الاتصال بخوادم جيميناي 2.5 وبناء المستند عالي المعايير لأول مرة...";
    document.getElementById("status").className = "text-xs text-center font-bold text-indigo-600";

    const currentAnalysis = analyze(inputData, topicData, targetData);
    const currentDecision = decide(currentAnalysis, STUDENTS.length);
    const localPlan = buildLesson(currentDecision, STUDENTS.length);

    const promptText = `أنت خبير وموجه تربوي وزاري أول. قم بتوليد خطة درس رسمية نموذجية على أعلى مستوى للطباعة والتنفيذ بناءً على المعطيات التالية:
موضوع الدرس: ${topicData}
النمط والهدف المستنتج: ${currentDecision.type} - ${currentDecision.goal}
الملاحظات التشغيلية: ${inputData}
عدد الطلاب: ${STUDENTS.length} طالباً.

قم ببناء المستند كاملاً بالتفصيل التام وبدون أي اختصارات أو كلام جانبي، متضمناً الأقسام النموذجية: الأهداف، خطة المجموعات، استراتيجيات الدعم، وأدوات التقويم التكويني والختامي المباشر.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const jsonResult = await response.json();
        const aiResponseText = jsonResult.candidates[0].content.parts[0].text;

        const finalComprehensiveDocument = `===================================================================
                       خطة التحضير الهيكلية والنظامية للحصة
===================================================================\n${localPlan}\n\n===================================================================\n                  التفصيل التربوي والمادة الموسعة (Gemini 2.5)\n===================================================================\n${aiResponseText}`;

        // حفظ محلي فوري لمنع تكرار الاستهلاك
        localStorage.setItem(regularCacheKey, finalComprehensiveDocument);

        document.getElementById("output").innerText = finalComprehensiveDocument;
        
        sendToCore({ type: "students_snapshot", data: { students: STUDENTS } });
        sendToCore({ type: "analysis", data: currentAnalysis });
        sendToCore({ 
            type: "lesson_impact", 
            data: { 
                topic: topicData, 
                type: "توليد ذكي عبر جميناي 2.5 مع كاش محلي", 
                students_count: STUDENTS.length,
                timestamp: new Date().toISOString()
            } 
        });

        document.getElementById("status").innerText = "✔ تم التوليد المعياري وحفظ المستند في الكاش المحلي وتمت مزامنة البيانات مع v18";
        document.getElementById("status").className = "text-xs text-center font-bold text-green-600";

    } catch (error) {
        console.error(error);
        document.getElementById("status").innerText = "❌ فشل الاتصال بالـ API لنموذج 2.5.";
        document.getElementById("status").className = "text-xs text-center font-bold text-red-600";
    }
}
