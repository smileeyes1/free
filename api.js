// إدارة واستخراج النصوص من ملفات الكتب المدرسية PDF
document.getElementById('pdfUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById('pdfProgress');
    prog.classList.remove('hidden');
    try {
        const reader = new FileReader();
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = "";
            const pages = Math.min(pdf.numPages, 15);
            for (let i = 1; i <= pages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(i => i.str).join(" ") + "\n";
            }
            S.pdf = compressText(text);
            S.pdfHash = await hashText(S.pdf);
            localStorage.setItem("last_pdf_hash", S.pdfHash);
            
            prog.classList.add('hidden');
            switchTab('dashboard-tab');
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        prog.classList.add('hidden');
    }
});

// محرك الإنتاج السحابي الحاسم وحل مشكلة مسار التوليد والتوافقية
async function executeProductionPipeline() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const log = document.getElementById("statusLog");
    const printArea = document.getElementById("completePrintPackage");
    
    const teacher = document.getElementById("teacher").value.trim() || "المعلم الفاضل";
    const school = document.getElementById("school").value.trim() || "المدرسة الأساسية";
    const topic = document.getElementById("topic").value.trim() || "الدرس الحالي";
    const customPrompt = document.getElementById("customPrompt").value.trim();
    const students = document.getElementById("students").value.split('\n').filter(x => x.trim().length > 0);
    
    if (!apiKey) {
        log.innerText = "⚠️ تعذر الاتصال: يرجى إدخال مفتاح Gemini API الصالح أعلى الشاشة.";
        return;
    }

    log.innerText = "⏳ جاري إرسال الطلب وهندسة المحتوى إدارياً ومؤسسياً...";
    
    // بناء وتدقيق كود المذاكرة والذاكرة الكاش لعدم تكرار استهلاك الرموز
    const cacheKey = await hashText(topic + S.pdfHash + teacher + school + customPrompt);
    const cached = await cacheGet(cacheKey);
    if(cached) {
        printArea.innerHTML = cached;
        log.innerText = "✅ تم استرجاع النسخة الجاهزة من الذاكرة المحلية فوراً.";
        return;
    }

    // صياغة الموجه الإلزامي الصارم للإنتاج المؤسسي الوزاري
    let systemInstruction = `أنت نظام إخراج تعليمي ومصمم وثائق ومستندات تربوية على مستوى وزاري رسمي متكامل ونظيف.
    المعطيات الإدارية الثابتة:
    - اسم المعلم: ${teacher}
    - اسم المدرسة والمؤسسة: ${school}
    - عنوان الدرس / المبحث: ${topic}
    - النص المرجعي من الكتاب: ${S.pdf || 'اعتماد معايير المنهاج المعتمدة'}
    
    السياسات الإلزامية الهندسية الصارمة للمخرجات:
    ١- طباعة واستخدام الأرقام بصيغتها العربية (٠١٢٣٤٥٦٧٨٩) حصرًا في كامل السجلات والأسئلة والتواريخ والخطط.
    ٢- المخرجات يجب أن تكون عبارة عن كود HTML نظيف جداً ومرتب هندسياً، يوضع مباشرة بداخل وسوم <div> (يمنع منعاً باتاً استخدام مارك داون \`\`\`html أو \`\`\`).
    ٣- لا تكتب أي جملة تمهيدية أو حوارية أو ختامية (المتن النظيف الجاهز للمطبعة والقصاصات فقط).
    ٤- توفير فواصل صفحات تامة عبر كود <div class="page-break"> لفرز الأوراق عن بعضها عند إعطاء أمر الطباعة.`;

    if (customPrompt) {
        systemInstruction += `\n\n🎯 **توجيه مخصص واستثنائي من المعلم (نفذه بحرفية تامة دون حشو):**\n"${customPrompt}"\n\nقم بصياغة وهندسة هذا الطلب التربوي المخصص ليكون جاهزاً ومكتوباً بمتن نظيف وراقٍ، واحرص على دمج ترويسة المدرسة والبيانات الإدارية أعلاه بشكل رسمي ومؤسسي.`;
    } else {
        systemInstruction += `\n\nأنتج الحزمة التربوية الشاملة مقسمة بـ <div class="page-break"> بين كل جزء:
        ١- تحضير وخطة درس نموذجية (الأهداف، التمهيد المشوق، الاستراتيجيات، التقويم المستمر).
        ٢- ورقة عمل تطبيقية مبتكرة متدرجة من السهل إلى الصعب ومناسبة للفروق الفردية.
        ٣- اختبار قصير لتقييم الأداء والمخرجات مع مفتاح الإجابة النموذجي بالأسفل.
        ٤- كشف رصد ومتابعة مهارات مصمم كجدول رسمي يحتوي على أسماء الطلاب التالية: ${JSON.stringify(students.length > 0 ? students : ['طالب١', 'طالب٢'])}.`;
    }

    // المسار المعتمد والقياسي لعدم حدوث أخطاء عدم العثور على النماذج
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
        });
        
        const resData = await response.json();
        if(resData.error) throw new Error(resData.error.message);
        
        let outText = resData.candidates[0].content.parts[0].text;
        
        // تنظيف المتن النهائي لضمان عدم وجود شوائب برمجية
        outText = outText.replace(/```html/gi, "").replace(/```/g, "").trim();
        
        printArea.innerHTML = outText;
        await cacheSet(cacheKey, outText);
        localStorage.setItem("last_result_html", outText);
        log.innerText = "✅ تم الإنتاج والتنفيذ بنجاح. يمكنك التحرير المباشر بداخل المساحة أدناه أو الطباعة.";
        
        printArea.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        log.innerText = `❌ خطأ في الاتصال أو المعالجة: ${err.message}`;
        console.error("API Error Detail:", err);
    }
}
