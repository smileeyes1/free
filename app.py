import streamlit as st
import google.generativeai as genai
from PyPDF2 import PdfReader

st.set_page_config(page_title="المنصة التعليمية الشاملة")
st.title("منصة المعلم الذكية")

# إدخال المفتاح
api_key = st.sidebar.text_input("أدخل مفتاح Google API:", type="password")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
else:
    st.warning("يرجى إدخال مفتاح API في القائمة الجانبية للبدء.")
    st.stop()

uploaded_file = st.file_uploader("ارفع الكتاب المدرسي (PDF)", type="pdf")

if uploaded_file:
    reader = PdfReader(uploaded_file)
    text = "".join([page.extract_text() for page in reader.pages])
    
    task = st.selectbox("اختر المهمة:", ["تحضير يومي", "خطة سنوية", "أوراق عمل", "اختبارات"])
    
    if st.button("توليد المحتوى"):
        prompt = f"بناءً على الكتاب التالي، قم بإنشاء {task} بشكل حرفي ومنظم: {text[:10000]}"
        response = model.generate_content(prompt)
        st.markdown(response.text)
