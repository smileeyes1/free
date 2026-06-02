const DB_NAME = "PRO_EDU_V7";
const DB_VERSION = 1;

let dbInstance = null;

async function initDB(){

if(dbInstance) return dbInstance;

return new Promise((resolve,reject)=>{

const request = indexedDB.open(DB_NAME,DB_VERSION);

request.onupgradeneeded = e=>{

const db = e.target.result;

if(!db.objectStoreNames.contains("cache")){
db.createObjectStore("cache");
}

if(!db.objectStoreNames.contains("pdf")){
db.createObjectStore("pdf");
}

if(!db.objectStoreNames.contains("results")){
db.createObjectStore("results");
}

};

request.onsuccess=e=>{
dbInstance=e.target.result;
resolve(dbInstance);
};

request.onerror=e=>reject(e);

});

}

async function dbSet(store,key,value){

const db=await initDB();

return new Promise((resolve,reject)=>{

const tx=db.transaction(store,"readwrite");

tx.objectStore(store).put(value,key);

tx.oncomplete=()=>resolve();
tx.onerror=e=>reject(e);

});

}

async function dbGet(store,key){

const db=await initDB();

return new Promise((resolve,reject)=>{

const tx=db.transaction(store,"readonly");

const req=tx.objectStore(store).get(key);

req.onsuccess=()=>resolve(req.result);
req.onerror=e=>reject(e);

});

}
