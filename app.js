import { db, auth, googleProvider } from "./firebase.js?v=10.4";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const C="surgeryPrices";
const ADMIN_EMAIL="yaman615@gmail.com";
const FIXED_CLINICS=["Beyin ve Sinir Cerrahisi","Cildiye","Çocuk Cerrahisi","Genel Cerrahi","Göğüs Cerrahisi","Göz Hastalıkları","Kadın Hastalıkları ve Doğum","Kalp ve Damar Cerrahisi","Kulak Burun Boğaz","Ortopedi","Plastik Cerrahi","Üroloji"];
const P=(name,min,max=null,note="",aliases=[])=>({clinic:"Çocuk Cerrahisi",name,minPrice:min,maxPrice:max,sgkPrice:null,privatePrice:null,description:note,cashOnly:false,aliases});
const PEDIATRIC=[
P("Sünnet",25000,null,"Muayene ve tetkikler dahil."),P("Laparoskopik Apendektomi (Simple)",60000,null,"Tetkikler hariç.",["Laparoskopik Apendektomi"]),P("Laparoskopik Perfore Apandisit",100000,null,"5 gün yatışa kadar dahil."),P("Hipospadias (Distal)",75000,null,"3 gece yatış dahil."),P("Hipospadias Proksimal – 1. Seans (Bukkal Greft)",90000,null,"3 gece yatış dahil."),P("Hipospadias Proksimal – 2. Seans",100000,null,"6 gece yatış dahil."),P("İleus Ameliyatı",120000,null,"5 gece yatış dahil."),P("Kolostomi Açılması",150000,null,"5 gece yatış dahil.",["Kolostomi Açma"]),P("Kolostomi Kapatılması",150000,null,"5 gece yatış dahil.",["Kolostomi Kapama"]),P("Laparoskopik Kolesistektomi",90000,null,"2 gece yatış dahil."),P("Mide Perforasyonu Onarımı",120000,null,"5 gece yatış dahil."),P("Diyafragma Hernisi Onarımı",150000,null,"5 gece yatış dahil."),P("Pilor Stenozu Onarımı",90000,null,"3 gece yatış dahil."),P("Karaciğer Kist Hidatik Ameliyatı",150000,null,"4 gece yatış dahil."),P("Meckel Divertikülü Onarımı",120000,null,"4 gece yatış dahil."),P("Laparoskopik Over Kisti Eksizyonu",80000,null,"2 gece yatış dahil."),P("Laparoskopik Over Tümörü Eksizyonu (Ooferektomi ±)",100000,null,"2 gece yatış dahil."),P("İnguinal Herni Onarımı – Tek Taraf (Açık)",50000,null,"Aynı gün taburcu."),P("İnguinal Herni Onarımı – Bilateral (Açık)",80000,null,"Aynı gün taburcu."),P("Laparoskopik İnguinal Herni Onarımı – Tek Taraf",60000,null,"1 gece yatış dahil."),P("Laparoskopik İnguinal Herni Onarımı – Bilateral",90000,null,"1 gece yatış dahil."),P("Umbilikal / Epigastrik Herni Onarımı",40000,null,"Aynı gün taburcu."),P("Varikoselektomi – Tek Taraf",60000,null,"Aynı gün taburcu."),P("Spermatik Kord Kisti Eksizyonu",50000,null,"Aynı gün taburcu."),P("Hidroselektomi – Tek Taraf",50000,null,"Aynı gün taburcu."),P("Hidroselektomi – Bilateral",80000,null,"Aynı gün taburcu."),P("Testis Torsiyonu Düzeltilmesi",60000,null,"1 gece yatış dahil."),P("Orşiektomi",40000,null,"Aynı gün taburcu."),P("İnmemiş Testis – Tek Taraf",60000,null,"Aynı gün taburcu."),P("İnmemiş Testis – Bilateral",100000,null,"1 gece yatış dahil."),P("Bartholin Kisti Eksizyonu",50000,null,"1 gece yatış dahil."),P("Pilonidal Sinüs – Flep",60000,null,"1 gece yatış dahil."),P("Pilonidal Sinüs – Lazer (Lokal)",20000,null,"Aynı gün taburcu."),P("Cilt Altı Lipom Eksizyonu",20000,30000,"Aynı gün taburcu."),P("Tırnak Yatağı Revizyonu – Tek Tırnak",15000,null,"Aynı gün taburcu."),P("Tırnak Yatağı Revizyonu – İki Tırnak",25000,null,"Aynı gün taburcu."),P("Frenulum Linguae Plastisi (Poliklinik–Lokal)",7500,null,"Sanal yatış."),P("Hipertrofik Dil Bağı Eksizyonu (Ameliyathane)",15000,null,"Aynı gün taburcu."),P("Labial Füzyon Açılması (Poliklinik)",4000,null,"Sanal yatış."),P("Lenf Nodu Eksizyonel Biyopsisi",30000,null,"Aynı gün taburcu."),P("Pnömotoraks – Tüp Torakostomi",50000,null,"Yatış süresi hariç."),P("Akciğer Bül / Blep Eksizyonu (Torakoskopik)",120000,null,"5 gece yatış dahil."),P("Memeden Kist / Kitle Çıkarılması",60000,null,"Aynı gün taburcu."),P("Jinekomasti Düzeltilmesi – Tek Taraf",60000,null,"1 gece yatış dahil."),P("Jinekomasti Düzeltilmesi – Bilateral",100000,null,"1 gece yatış dahil."),P("Pektus Ekskavatum Düzeltilmesi (Nuss Cerrahisi)",200000,null,"5 gece yatış dahil."),P("Kesi Süturasyonu – 5 cm'den Küçük",20000,null,"Aynı gün taburcu."),P("Kesi Süturasyonu – 5 cm'den Büyük",30000,40000,"1 gece yatış dahil."),P("Lenfanjiom – Bleomisin Enjeksiyonu",25000,null,"İlaç hariç."),P("Lenfanjiom – Açık Cerrahi",80000,100000,"1 gece yatış dahil."),P("Laparoskopik Urakus Kisti Eksizyonu",100000,null,"4 gece yatış dahil."),P("Fimozis Açılması (Poliklinik)",5000,null,"Sanal yatış.")];

let data=[],editing=null,updating=false,isAdmin=false,unsubscribeData=null,lastRenderKey="",lastClinicKey="",lastFilterKey="";
const el=id=>document.getElementById(id);
const normText=s=>String(s||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9çğıöşü]+/g," ").trim();
const norm=x=>({id:String(x.id||Date.now()),clinic:String(x.clinic||"Diğer").trim(),name:String(x.name||"").trim(),minPrice:x.minPrice??null,maxPrice:x.maxPrice??null,sgkPrice:x.sgkPrice??null,privatePrice:x.privatePrice??null,description:String(x.description||""),cashOnly:Boolean(x.cashOnly)});
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const money=n=>new Intl.NumberFormat("tr-TR").format(n)+" TL";
const setStatus=(m,t="")=>{const s=el("connectionStatus");if(s){s.textContent=m;s.className=`status ${t}`.trim();}};
const debounce=(fn,wait=140)=>{let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait);};};

function priceHtml(x){const a=[];if(x.sgkPrice!=null)a.push(`<span class="chip">SGK: ${money(x.sgkPrice)}</span>`);if(x.privatePrice!=null)a.push(`<span class="chip">Özel: ${money(x.privatePrice)}</span>`);if(!a.length&&x.minPrice!=null)a.push(`<span class="chip">${x.maxPrice!=null&&x.maxPrice!==x.minPrice?money(x.minPrice)+" – "+money(x.maxPrice):money(x.minPrice)}</span>`);return a.length?a.join(""):'<span class="chip">Fiyat girilmedi</span>';}
function clinicList(){return [...new Set([...FIXED_CLINICS,...data.map(x=>x.clinic)])].sort((a,b)=>a.localeCompare(b,"tr"));}
function refreshSelects(){
  const clinics=clinicList(), key=clinics.join("|");
  const c=el("clinic");
  if(c&&key!==lastClinicKey){const current=c.value;c.innerHTML=clinics.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");c.value=clinics.includes(current)?current:"Çocuk Cerrahisi";lastClinicKey=key;}
  const available=[...new Set(data.map(x=>x.clinic))].sort((a,b)=>a.localeCompare(b,"tr")),fkey=available.join("|");
  const f=el("filter");
  if(f&&fkey!==lastFilterKey){const current=f.value;f.innerHTML='<option value="">Tüm branşlar</option>'+available.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");if(available.includes(current))f.value=current;lastFilterKey=fkey;}
}
function filtered(){const q=normText(el("search")?.value),c=el("filter")?.value||"";return data.filter(x=>(!c||x.clinic===c)&&(!q||normText(`${x.name} ${x.description} ${x.clinic}`).includes(q)));}
function render(force=false){
  const rows=filtered();
  const key=`${isAdmin}|${el("filter")?.value}|${normText(el("search")?.value)}|${rows.map(x=>x.id+":"+x.name+":"+x.minPrice+":"+x.maxPrice+":"+x.description+":"+x.cashOnly).join(";")}`;
  if(!force&&key===lastRenderKey)return;lastRenderKey=key;
  const list=el("list");if(!list)return;
  if(!rows.length){list.innerHTML='<p class="muted">Kayıt bulunamadı.</p>';return;}
  const groups=rows.reduce((a,x)=>((a[x.clinic]??=[]).push(x),a),{});
  list.innerHTML=Object.keys(groups).sort((a,b)=>a.localeCompare(b,"tr")).map(c=>`<section><div class="group-title"><h3>${esc(c)}</h3><span class="count">${groups[c].length} kayıt</span></div>${groups[c].map(x=>`<article class="card ${x.cashOnly?'cash':''}">${x.cashOnly?'<div class="cashwarn">SADECE NAKİT ÖDEME</div>':''}<div class="name">${esc(x.name)}</div><div class="prices">${priceHtml(x)}</div>${x.description?`<div class="note">${esc(x.description)}</div>`:''}${isAdmin?`<div class="actions no-print"><button class="secondary edit" data-id="${esc(x.id)}">Düzenle</button><button class="danger del" data-id="${esc(x.id)}">Sil</button></div>`:''}</article>`).join("")}</section>`).join("");
}
async function applyPediatric(){if(!isAdmin||updating||localStorage.getItem("pediatricUpdate20260804")==="done")return;updating=true;try{setStatus("Çocuk Cerrahisi listesi güncelleniyor...");const existing=data.filter(x=>x.clinic==="Çocuk Cerrahisi"),byName=new Map(existing.map(x=>[normText(x.name),x]));const batch=writeBatch(db);PEDIATRIC.forEach((p,i)=>{const old=[p.name,...p.aliases].map(normText).map(k=>byName.get(k)).find(Boolean);const id=`cocuk-20260804-${String(i+1).padStart(3,"0")}`;if(old&&old.id!==id)batch.delete(doc(db,C,old.id));const clean={...p,id};delete clean.aliases;batch.set(doc(db,C,id),clean);});await batch.commit();localStorage.setItem("pediatricUpdate20260804","done");setStatus("Firebase bağlı • Çocuk Cerrahisi listesi güncel.","ok");}catch(e){console.error(e);setStatus("Çocuk Cerrahisi güncellemesi uygulanamadı.","error");}finally{updating=false;}}
function startData(){
  if(unsubscribeData)unsubscribeData();
  setStatus("Kayıtlar yükleniyor...");
  let firstSnapshot=true;
  unsubscribeData=onSnapshot(collection(db,C),s=>{
    const next=s.docs.map(d=>norm({...d.data(),id:d.id})).sort((a,b)=>a.clinic.localeCompare(b.clinic,"tr")||a.name.localeCompare(b.name,"tr"));
    const changed=JSON.stringify(next)!==JSON.stringify(data);
    data=next;
    if(changed||firstSnapshot){
      refreshSelects();
      render(firstSnapshot);
    }
    if(firstSnapshot){
      setStatus("Firebase bağlı • Sistem hazır.","ok");
      firstSnapshot=false;
    }
  },e=>{
    console.error(e);
    setStatus("Firebase bağlantısı kurulamadı. Firestore kurallarını kontrol et.","error");
    const list=el("list");if(list)list.innerHTML='<p class="muted">Veriler yüklenemedi.</p>';
  });
}
function num(id){const v=el(id).value.trim();return v===""?null:Number(v);}
async function save(){if(!isAdmin)return alert("Bu işlem için yönetici yetkisi gerekir.");const clinic=el("clinic").value,name=el("name").value.trim();if(!clinic||!name)return alert("Branş ve işlem adı zorunludur.");const minPrice=num("minPrice"),maxPrice=num("maxPrice");if(minPrice!=null&&maxPrice!=null&&maxPrice<minPrice)return alert("En yüksek fiyat en düşük fiyattan küçük olamaz.");const id=editing||String(Date.now());await setDoc(doc(db,C,id),{id,clinic,name,minPrice,maxPrice,sgkPrice:num("sgkPrice"),privatePrice:num("privatePrice"),description:el("description").value.trim(),cashOnly:el("cashOnly").checked});clearForm();}
function edit(id){if(!isAdmin)return;const x=data.find(y=>y.id===id);if(!x)return;editing=id;el("clinic").value=x.clinic;el("name").value=x.name;["minPrice","maxPrice","sgkPrice","privatePrice"].forEach(k=>el(k).value=x[k]??"");el("description").value=x.description;el("cashOnly").checked=x.cashOnly;el("saveButton").textContent="Güncelle";el("recordForm").scrollIntoView({behavior:"smooth",block:"start"});}
async function remove(id){if(!isAdmin)return;const x=data.find(y=>y.id===id);if(!x||!confirm(`“${x.name}” kaydı silinsin mi?`))return;await deleteDoc(doc(db,C,id));if(editing===id)clearForm();}
function clearForm(){editing=null;el("name").value="";["minPrice","maxPrice","sgkPrice","privatePrice"].forEach(k=>el(k).value="");el("description").value="";el("cashOnly").checked=false;el("saveButton").textContent="Kaydet";}
function printList(){const rows=filtered();if(!rows.length)return alert("Yazdırılacak kayıt yok.");const selected=el("filter").value;el("printHeader").innerHTML=`<h1>${esc(selected||"Yatış Birimi Fiyat Listesi")}</h1><div>${selected?"Ameliyat ve İşlem Fiyatları":"Tüm Branşlar"} • ${new Intl.DateTimeFormat("tr-TR").format(new Date())}</div>`;el("printFooter").textContent="Bu liste kurum içi bilgilendirme amaçlıdır.";window.print();}
function updateRole(user){isAdmin=(user.email||"").toLowerCase()===ADMIN_EMAIL;el("userName").textContent=user.displayName||user.email;el("userRole").textContent=isAdmin?"Yönetici":"Görüntüleyici";el("userRole").className=`role-badge ${isAdmin?'admin':''}`;el("recordForm").classList.toggle("hidden",!isAdmin);lastRenderKey="";render(true);}
async function login(){const s=el("loginStatus");try{s.textContent="Google giriş penceresi açılıyor...";await signInWithPopup(auth,googleProvider);}catch(e){console.error(e);s.textContent=e.code==="auth/popup-closed-by-user"?"Giriş penceresi kapatıldı.":"Giriş yapılamadı. Firebase Authentication ayarlarını kontrol edin.";}}
async function logout(){await signOut(auth);}
function bindEvents(){
  el("loginButton")?.addEventListener("click",login);el("logoutButton")?.addEventListener("click",logout);el("saveButton")?.addEventListener("click",save);el("clearButton")?.addEventListener("click",clearForm);el("printButton")?.addEventListener("click",printList);el("filter")?.addEventListener("change",()=>render());el("search")?.addEventListener("input",debounce(()=>render(),140));
  el("list")?.addEventListener("click",e=>{const b=e.target.closest("button[data-id]");if(!b)return;b.classList.contains("edit")?edit(b.dataset.id):b.classList.contains("del")&&remove(b.dataset.id);});
}

bindEvents();
onAuthStateChanged(auth,user=>{
  const loginScreen=el("loginScreen"),app=el("app"),loginStatus=el("loginStatus");
  if(user){loginScreen.classList.add("hidden");app.classList.remove("hidden");updateRole(user);startData();}
  else{if(unsubscribeData){unsubscribeData();unsubscribeData=null;}data=[];isAdmin=false;app.classList.add("hidden");loginScreen.classList.remove("hidden");loginStatus.textContent="Google hesabınızla giriş yapın.";}
});
