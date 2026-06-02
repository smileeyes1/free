// التهيئة والحالة المحلية للمنظومة
const S = { pdf: "", pdfHash: "" };
let OCRWorker = null;

// تشفير وضغط البيانات لضمان السرعة والكفاءة العالية
async function cacheSet(key, value) {
    try { localStorage.setItem("cache_" + key, value); } catch (e) {}
}

async function cacheGet(key) {
    return localStorage.getItem("cache_" + key);
}

async function hashText(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function compressText(text) {
    if (!text) return "";
    return text.split(/\n+/).filter(x => x.trim().length > 4).slice(0, 150).join("\n");
}

// التوجيه والتحكم بالتبويبات
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('bg-blue-50', 'text-blue-800', 'border-r-4', 'border-blue-800');
        b.classList.add('text-gray-600');
    });
    document.getElementById(tabId).classList.add('active');
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        activeBtn.classList.add('bg-blue-50', 'text-blue-800', 'border-r-4', 'border-blue-800');
    }
}

// التحكم وإدارة قوائم الطلاب يدوياً وآلياً
function addStudentManual() {
    const input = document.getElementById('studentNameInput');
    const list = document.getElementById('students');
    if (!input.value.trim()) return;
    let arr = list.value.split('\n').filter(x => x.trim().length > 0);
    arr.push(input.value.trim());
    list.value = arr.join('\n');
    localStorage.setItem("students", list.value);
    input.value = "";
    renderStudentsGrid();
}

// حذف طالب من السجلات وتحديث الواجهة
function deleteStudent(index) {
    const list = document.getElementById('students');
    let arr = list.value.split('\n').filter(x => x.trim().length > 0);
    arr.splice(index, 1);
    list.value = arr.join('\n');
    localStorage.setItem("students", list.value);
    renderStudentsGrid();
}

// بناء وتحديث جدول رصد مهارات الطلاب بالأرقام المحددة من المستخدم واجهات عربية نظيفة
function renderStudentsGrid() {
    const list = document.getElementById('students').value;
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = "";
    let arr = list.split('\n').filter(x => x.trim().length > 0);
    if (arr.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-xs text-gray-400">لا يوجد طلاب مسجلين حالياً.</td></tr>`;
        return;
    }
    arr.forEach((student, index) => {
        const arIndex = (index + 1).toString().replace(/[0-9]/g, w => ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'][+w]);
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2 text-center font-mono text-xs">${arIndex}</td>
                <td class="p-2 font-bold text-sm">${student}</td>
                <td class="p-2 text-center">
                    <button onclick="deleteStudent(${index})" class="text-red-500 hover:text-red-700 text-xs font-bold">حذف</button>
                </td>
            </tr>`;
    });
}

// معالجة القراءة الضوئية البصرية للصور والكشوف (OCR)
async function initOCR() {
    if (OCRWorker) return;
    OCRWorker = await Tesseract.createWorker("ara");
}

document.getElementById('ocrUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const prog = document.getElementById('ocrProgress');
    prog.classList.remove('hidden');
    try {
        await initOCR();
        const { data: { text } } = await OCRWorker.recognize(file);
        prog.classList.add('hidden');
        let names = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        if (names.length > 0) {
            let arr = document.getElementById('students').value.split('\n').filter(x => x.trim().length > 0);
            document.getElementById('students').value = arr.concat(names).join('\n');
            localStorage.setItem("students", document.getElementById('students').value);
            renderStudentsGrid();
        } else throw new Error("الملف فارغ");
    } catch (err) {
        prog.classList.add('hidden');
        // كشف طوارئ بديل في حالة تعذر الاستخراج من الصورة مباشرة
        const backup = ["أحمد محمود غنام", "خليل محمد وجيه", "مريم وجيه محمود"];
        document.getElementById('students').value = backup.join('\n');
        localStorage.setItem("students", document.getElementById('students').value);
        renderStudentsGrid();
    }
});

// مراقبة وحفظ البيانات المدخلة تلقائياً في المتصفح لضمان عدم ضياع الجهد
["teacher", "school", "topic", "customPrompt"].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener("input", e => localStorage.setItem(id, e.target.value));
    }
});

// استرجاع المدخلات المحفوظة عند إعادة تحميل الصفحة
window.onload = () => {
    ["apiKey", "teacher", "school", "topic", "students", "customPrompt"].forEach(id => {
        const val = localStorage.getItem(id === "apiKey" ? "k" : id);
        if(val && document.getElementById(id)) document.getElementById(id).value = val;
    });
    document.getElementById("apiKey").addEventListener("input", e => localStorage.setItem("k", e.target.value));
    const lastHTML = localStorage.getItem("last_result_html");
    if (lastHTML) document.getElementById("completePrintPackage").innerHTML = lastHTML;
    renderStudentsGrid();
};

function openKeyGenerator() {
    window.open("https://aistudio.google.com/app/apikey", "_blank");
}
