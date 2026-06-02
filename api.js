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
            
            if (localStorage.getItem("last_pdf_hash") === S.pdfHash) {
                console.log("PDF مجود مسبقاً");
            } else {
                localStorage.setItem("last_pdf_hash", S.pdfHash);
            }
            
            prog.classList.add('hidden');
            switchTab('dashboard-tab');
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        prog.classList.add('hidden');
    }
});

async function executeProductionPipeline() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const log = document.getElementById("statusLog");
    const printArea = document.getElementById("completePrintPackage");
    
    const teacher = document.getElementById("teacher").value.trim() || "المعلم";
    const school = document.getElementById("school").value.trim() || "المدرسة";
    const topic = document.getElementById("topic").value.trim() || "الدرس";
    const customPrompt = document.getElementById("customPrompt").value.trim();
    const students = document.getElementById("students").value.split('\n').filter(x => x.trim().length > 0);
    
    log.innerText = "⏳ جاري إرسال الطلب ومعالجة البيانات...";
    
    const cacheKey = await hashText(topic + S.pdfHash + teacher + school + customPrompt);
    const cached = await cacheGet(cacheKey);
    if(cached) {
        printArea.innerHTML = cached;
        log.innerText = "✅ تم استرجاع النتيجة من الذاكرة المحلية.";
        return;
    }

    let systemPrompt = `أنت نظام إخراج تعليمي مؤسسي وزاري يعمل بدقة متناهية.
    البيانات الأساسية:
    - المعلم: ${teacher}
    - المدرسة: ${school}
    - الموضوع: ${topic}
    - المرجعية: ${S.pdf || 'لا يوجد'}
    
    القواعد الإلزامية الصارمة:
    ١- الأرقام يجب أن تكون بالصيغة العربية المشرقية (٠١٢٣٤٥٦٧٨٩) حصرًا في كافة المخرجات والعمليات.
    ٢- الإخراج يكون بصيغة HTML نظيفة وجاهزة فوراً بداخل وسوم <div> (لا تستخدم markdown أو \`\`\`html).
    ٣- لا تكتب أي جملة حوارية. المتن فقط.
    ٤- استخدم تنسيقات مهنية تعكس مستوى مؤسسي.
    `;

    if (customPrompt) {
        systemPrompt += `\n\n🎯 **توجيه خاص وإلزامي من المعلم:**\n"${customPrompt}"\n\nيجب عليك تلبية هذا الطلب المخصص بدقة متناهية وبصيغة نهائية جاهزة للطباعة، مستخدما الارقام المشرقية ٠١٢٣٤٥٦٧٨٩.`;
    } else {
        systemPrompt += `\n\nأنتج الحزمة الافتراضية الكاملة مقسمة بـ <div class="page-break"> بين كل قسم:
        ١- خطة درس شاملة.
        ٢- ورقة عمل احترافية.
        ٣- اختبار قصير مع مفتاح الإجابة.
        ٤- كشف رصد مهارات باستخدام قائمة الطلاب المرفقة: ${JSON.stringify(students.length > 0 ? students : ['طالب١', 'طالب٢'])}.`;
    }

    if (!apiKey) {
        log.innerText = "⚠️ تعذر الاتصال: لا يوجد مفتاح API.";
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });
        
        const resData = await response.json();
        if(resData.error) throw new Error(resData.error.message);
        
        let outText = resData.candidates[0].content.parts[0].text;
        outText = outText.replace(/```html/gi, "").replace(/```/g, "").trim();
        
        printArea.innerHTML = outText;
        await cacheSet(cacheKey, outText);
        localStorage.setItem("last_result_html", outText);
        log.innerText = "✅ تمت المعالجة بنجاح. يمكنك التعديل والطباعة.";
        
        printArea.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        log.innerText = `❌ خطأ في الاتصال: ${err.message}`;
    }
}
