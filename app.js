import { db } from "./firebase.js?v=10.2";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const C="surgeryPrices";
const FIXED_CLINICS=["Beyin ve Sinir Cerrahisi","Cildiye","Çocuk Cerrahisi","Genel Cerrahi","Göğüs Cerrahisi","Göz Hastalıkları","Kadın Hastalıkları ve Doğum","Kalp ve Damar Cerrahisi","Kulak Burun Boğaz","Ortopedi","Plastik Cerrahi","Üroloji"];
const P=(name,min,max=null,note="",aliases=[])=>({clinic:"Çocuk Cerrahisi",name,minPrice:min,maxPrice:max,sgkPrice:null,privatePrice:null,description:note,cashOnly:false,aliases});
const PEDIATRIC=[
P("Sünnet",25000,null,"Muayene ve tetkikler dahil."),
P("Laparoskopik Apendektomi (Simple)",60000,null,"Tetkikler hariç.",["Laparoskopik Apendektomi"]),
P("Laparoskopik Perfore Apandisit",100000,null,"5 gün yatışa kadar dahil."),
P("Hipospadias (Distal)",75000,null,"3 gece yatış dahil."),
P("Hipospadias Proksimal – 1. Seans (Bukkal Greft)",90000,null,"3 gece yatış dahil."),
P("Hipospadias Proksimal – 2. Seans",100000,null,"6 gece yatış dahil."),
P("İleus Ameliyatı",120000,null,"5 gece yatış dahil."),
P("Kolostomi Açılması",150000,null,"5 gece yatış dahil.",["Kolostomi Açma"]),
P("Kolostomi Kapatılması",150000,null,"5 gece yatış dahil.",["Kolostomi Kapama"]),
P("Laparoskopik Kolesistektomi",90000,null,"2 gece yatış dahil."),
P("Mide Perforasyonu Onarımı",120000,null,"5 gece yatış dahil.",["Mide Perforasyonu Operasyonu"]),
P("Diyafragma Hernisi Onarımı",150000,null,"5 gece yatış dahil."),
P("Pilor Stenozu Onarımı",90000,null,"3 gece yatış dahil."),
P("Karaciğer Kist Hidatik Ameliyatı",150000,null,"4 gece yatış dahil."),
P("Meckel Divertikülü Onarımı",120000,null,"4 gece yatış dahil."),
P("Laparoskopik Over Kisti Eksizyonu",80000,null,"2 gece yatış dahil."),
P("Laparoskopik Over Tümörü Eksizyonu (Ooferektomi ±)",100000,null,"2 gece yatış dahil."),
P("İnguinal Herni Onarımı – Tek Taraf (Açık)",50000,null,"Aynı gün taburcu.",["İnguinal Herni Onarımı (Açık)","Açık İnguinal Herni Onarımı"]),
P("İnguinal Herni Onarımı – Bilateral (Açık)",80000,null,"Aynı gün taburcu."),
P("Laparoskopik İnguinal Herni Onarımı – Tek Taraf",60000,null,"1 gece yatış dahil.",["Laparoskopik İnguinal Herni Onarımı, Tek Taraf"]),
P("Laparoskopik İnguinal Herni Onarımı – Bilateral",90000,null,"1 gece yatış dahil.",["Laparoskopik İnguinal Herni Onarımı, Çift Taraf"]),
P("Umbilikal / Epigastrik Herni Onarımı",40000,null,"Aynı gün taburcu.",["Greftsiz Umbilikal Herni Onarımı","Umblikal Herni Onarımı"]),
P("Varikoselektomi – Tek Taraf",60000,null,"Aynı gün taburcu."),
P("Spermatik Kord Kisti Eksizyonu",50000,null,"Aynı gün taburcu."),
P("Hidroselektomi – Tek Taraf",50000,null,"Aynı gün taburcu."),
P("Hidroselektomi – Bilateral",80000,null,"Aynı gün taburcu."),
P("Testis Torsiyonu Düzeltilmesi",60000,null,"1 gece yatış dahil."),
P("Orşiektomi",40000,null,"Aynı gün taburcu."),
P("İnmemiş Testis – Tek Taraf",60000,null,"Aynı gün taburcu.",["Laparoskopik İnmemiş Testis"]),
P("İnmemiş Testis – Bilateral",100000,null,"1 gece yatış dahil."),
P("Bartholin Kisti Eksizyonu",50000,null,"1 gece yatış dahil."),
P("Pilonidal Sinüs – Flep",60000,null,"1 gece yatış dahil.",["Pilonidal Sinüs Eksizyonu"]),
P("Pilonidal Sinüs – Lazer (Lokal)",20000,null,"Aynı gün taburcu.",["Pilonidal Sinüs Lazer"]),
P("Cilt Altı Lipom Eksizyonu",20000,30000,"Aynı gün taburcu."),
P("Tırnak Yatağı Revizyonu – Tek Tırnak",15000,null,"Aynı gün taburcu."),
P("Tırnak Yatağı Revizyonu – İki Tırnak",25000,null,"Aynı gün taburcu."),
P("Frenulum Linguae Plastisi (Poliklinik–Lokal)",7500,null,"Sanal yatış."),
P("Hipertrofik Dil Bağı Eksizyonu (Ameliyathane)",15000,null,"Aynı gün taburcu."),
P("Labial Füzyon Açılması (Poliklinik)",4000,null,"Sanal yatış."),
P("Lenf Nodu Eksizyonel Biyopsisi",30000,null,"Aynı gün taburcu."),
P("Pnömotoraks – Tüp Torakostomi",50000,null,"Yatış süresi hariç."),
P("Akciğer Bül / Blep Eksizyonu (Torakoskopik)",120000,null,"5 gece yatış dahil."),
P("Memeden Kist / Kitle Çıkarılması",60000,null,"Aynı gün taburcu.",["Memeden Kist / Benign Tümör Çıkarılması"]),
P("Jinekomasti Düzeltilmesi – Tek Taraf",60000,null,"1 gece yatış dahil."),
P("Jinekomasti Düzeltilmesi – Bilateral",100000,null,"1 gece yatış dahil."),
P("Pektus Ekskavatum Düzeltilmesi (Nuss Cerrahisi)",200000,null,"5 gece yatış dahil."),
P("Kesi Süturasyonu – 5 cm'den Küçük",20000,null,"Aynı gün taburcu."),
P("Kesi Süturasyonu – 5 cm'den Büyük",30000,40000,"1 gece yatış dahil."),
P("Lenfanjiom – Bleomisin Enjeksiyonu",25000,null,"İlaç hariç."),
P("Lenfanjiom – Açık Cerrahi",80000,100000,"1 gece yatış dahil."),
P("Laparoskopik Urakus Kisti Eksizyonu",100000,null,"4 gece yatış dahil."),
P("Fimozis Açılması (Poliklinik)",5000,null,"Sanal yatış.")
];
let data=[],editing=null,updating=false;
const el=id=>document.getElementById(id), status=el("connectionStatus"), list=el("list");
const normText=s=>String(s||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9çğıöşü]+/g," ").trim();
const norm=x=>({id:String(x.id||Date.now()),clinic:String(x.clinic||"Diğer").trim(),name:String(x.name||"").trim(),minPrice:x.minPrice??null,maxPrice:x.maxPrice??null,sgkPrice:x.sgkPrice??null,privatePrice:x.privatePrice??null,description:String(x.description||""),cashOnly:Boolean(x.cashOnly)});
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const money=n=>new Intl.NumberFormat("tr-TR").format(n)+" TL";
function setStatus(m,t=""){status.textContent=m;status.className=`status ${t}`.trim()}
function priceHtml(x){const a=[];if(x.sgkPrice!=null)a.push(`<span class="chip">SGK: ${money(x.sgkPrice)}</span>`);if(x.privatePrice!=null)a.push(`<span class="chip">Özel: ${money(x.privatePrice)}</span>`);if(!a.length&&x.minPrice!=null)a.push(`<span class="chip">${x.maxPrice!=null&&x.maxPrice!==x.minPrice?money(x.minPrice)+" – "+money(x.maxPrice):money(x.minPrice)}</span>`);if(!a.length)a.push('<span class="chip">Fiyat girilmedi</span>');return a.join("")}
function clinicOptions(){
  const select=el("clinic");
  if(!select)return;
  const current=select.value;
  const clinics=[...new Set([...FIXED_CLINICS,...data.map(x=>x.clinic)])].sort((a,b)=>a.localeCompare(b,"tr"));
  select.innerHTML=clinics.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  select.value=clinics.includes(current)?current:"Çocuk Cerrahisi";
}
function updateFilter(){
  const f=el("filter");
  if(!f)return;
  const current=f.value;
  const clinics=[...new Set(data.map(x=>x.clinic))].sort((a,b)=>a.localeCompare(b,"tr"));
  f.innerHTML='<option value="">Tüm branşlar</option>'+clinics.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(clinics.includes(current))f.value=current;
}
function refreshSelects(){
  updateFilter();
  clinicOptions();
}
function filtered(){const q=normText(el("search").value),c=el("filter").value;return data.filter(x=>(!c||x.clinic===c)&&(!q||normText(x.name+" "+x.description+" "+x.clinic).includes(q)))}
function render(){
  const rows=filtered();
  const groups=rows.reduce((a,x)=>((a[x.clinic]??=[]).push(x),a),{});
  const names=Object.keys(groups).sort((a,b)=>a.localeCompare(b,"tr"));
  if(!names.length){list.innerHTML='<p class="muted">Kayıt bulunamadı.</p>';return}
  list.innerHTML=names.map(c=>`<section><div class="group-title"><h3>${esc(c)}</h3><span class="count">${groups[c].length} kayıt</span></div>${groups[c].map(x=>`<article class="card ${x.cashOnly?'cash':''}">${x.cashOnly?'<div class="cashwarn">SADECE NAKİT ÖDEME</div>':''}<div class="name">${esc(x.name)}</div><div class="prices">${priceHtml(x)}</div>${x.description?`<div class="note">${esc(x.description)}</div>`:''}<div class="actions no-print"><button class="secondary edit" data-id="${esc(x.id)}">Düzenle</button><button class="danger del" data-id="${esc(x.id)}">Sil</button></div></article>`).join("")}</section>`).join("");
  list.querySelectorAll(".edit").forEach(b=>b.onclick=()=>edit(b.dataset.id));
  list.querySelectorAll(".del").forEach(b=>b.onclick=()=>remove(b.dataset.id));
}
async function applyPediatric(){if(updating)return;updating=true;try{setStatus("Çocuk Cerrahisi listesi güncelleniyor...");const snapData=data.filter(x=>x.clinic==="Çocuk Cerrahisi");const byName=new Map();snapData.forEach(x=>byName.set(normText(x.name),x));const batch=writeBatch(db);PEDIATRIC.forEach((p,i)=>{const keys=[p.name,...p.aliases].map(normText);const old=keys.map(k=>byName.get(k)).find(Boolean);const id=`cocuk-20260804-${String(i+1).padStart(3,"0")}`;if(old&&old.id!==id)batch.delete(doc(db,C,String(old.id)));const clean={...p,id};delete clean.aliases;batch.set(doc(db,C,id),clean)});await batch.commit();localStorage.setItem("pediatricUpdate20260804","done");setStatus("Firebase bağlı • Çocuk Cerrahisi listesi güncel.","ok")}catch(e){console.error(e);setStatus("Çocuk Cerrahisi güncellemesi uygulanamadı. Firestore yazma iznini kontrol et.","error")}finally{updating=false}}
onSnapshot(collection(db,C),async s=>{const scrollY=window.scrollY;data=s.docs.map(d=>norm({...d.data(),id:d.id})).sort((a,b)=>a.clinic.localeCompare(b.clinic,"tr")||a.name.localeCompare(b.name,"tr"));setStatus("Firebase bağlı • Değişiklikler tüm cihazlara anında yansır.","ok");refreshSelects();render();requestAnimationFrame(()=>window.scrollTo({top:scrollY,left:0,behavior:"auto"}));if(localStorage.getItem("pediatricUpdate20260804")!=="done")await applyPediatric()},e=>{console.error(e);setStatus("Firebase bağlantısı kurulamadı. Firestore kurallarını kontrol et.","error");list.innerHTML='<p class="muted">Veriler yüklenemedi.</p>'});
function num(id){const v=el(id).value.trim();return v===""?null:Number(v)}
async function save(){const clinic=el("clinic").value,name=el("name").value.trim();if(!clinic||!name){alert("Branş ve işlem adı zorunludur.");return}const minPrice=num("minPrice"),maxPrice=num("maxPrice");if(minPrice!=null&&maxPrice!=null&&maxPrice<minPrice){alert("En yüksek fiyat en düşük fiyattan küçük olamaz.");return}const id=editing||String(Date.now());const item={id,clinic,name,minPrice,maxPrice,sgkPrice:num("sgkPrice"),privatePrice:num("privatePrice"),description:el("description").value.trim(),cashOnly:el("cashOnly").checked};await setDoc(doc(db,C,id),item);clearForm()}
function edit(id){const x=data.find(y=>y.id===id);if(!x)return;editing=id;el("clinic").value=x.clinic;el("name").value=x.name;["minPrice","maxPrice","sgkPrice","privatePrice"].forEach(k=>el(k).value=x[k]??"");el("description").value=x.description;el("cashOnly").checked=x.cashOnly;el("saveButton").textContent="Güncelle";el("recordForm")?.scrollIntoView({behavior:"smooth",block:"start"})}
async function remove(id){const x=data.find(y=>y.id===id);if(!x||!confirm(`“${x.name}” kaydı silinsin mi?`))return;await deleteDoc(doc(db,C,id));if(editing===id)clearForm()}
function clearForm(){editing=null;el("name").value="";["minPrice","maxPrice","sgkPrice","privatePrice"].forEach(k=>el(k).value="");el("description").value="";el("cashOnly").checked=false;el("saveButton").textContent="Kaydet"}
function printList(){const rows=filtered();if(!rows.length){alert("Yazdırılacak kayıt yok.");return}const selected=el("filter").value;el("printHeader").innerHTML=`<h1>${esc(selected||"Yatış Birimi Fiyat Listesi")}</h1><div>${selected?"Ameliyat ve İşlem Fiyatları":"Tüm Branşlar"} • ${new Intl.DateTimeFormat("tr-TR").format(new Date())}</div>`;el("printFooter").textContent="Bu liste kurum içi bilgilendirme amaçlıdır.";window.print()}
function bindEvents(){
  const events = [
    ["search", "input", render],
    ["filter", "change", render],
    ["saveButton", "click", save],
    ["clearButton", "click", clearForm],
    ["printButton", "click", printList]
  ];
  events.forEach(([id,event,handler])=>{
    const node=el(id);
    if(node) node.addEventListener(event,handler);
    else console.warn(`Eksik arayüz öğesi: #${id}`);
  });
}

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindEvents, {once:true});
else bindEvents();
