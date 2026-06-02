importScripts(
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
);

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

self.onmessage = async e=>{

const fileBuffer=e.data;

const pdf=
await pdfjsLib.getDocument({
data:fileBuffer
}).promise;

let pages=[];

for(
let i=1;
i<=Math.min(pdf.numPages,40);
i++
){

const page=
await pdf.getPage(i);

const content=
await page.getTextContent();

const text=
content.items
.map(x=>x.str)
.join(" ");

pages.push(text);

}

const chunks=[];

for(let i=0;i<pages.length;i++){

const text=pages[i];

for(
let p=0;
p<text.length;
p+=1500
){

chunks.push({
page:i+1,
text:text.slice(p,p+1500)
});

}

}

postMessage(chunks);

};
