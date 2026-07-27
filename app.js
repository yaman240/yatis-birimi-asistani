import { db, auth, googleProvider } from "./firebase.js?v=6";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const SEED = [{"clinic":"Ortopedi","name":"Kalça Protezi","sgkPrice":null,"privatePrice":null,"minPrice":500000,"maxPrice":null,"description":"İthal protez dahil","cashOnly":false,"id":100000},{"clinic":"Genel Cerrahi","name":"Total Mastektomi","sgkPrice":null,"privatePrice":null,"minPrice":280000,"maxPrice":null,"description":"Preop hazırlık dahil","cashOnly":false,"id":100001},{"clinic":"Ortopedi","name":"Ayak Bileği Artroskopisi","sgkPrice":null,"privatePrice":null,"minPrice":200000,"maxPrice":250000,"description":"Preop hazırlık Medikent’te yapılırsa 10.000 TL eklenir","cashOnly":false,"id":100002},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P619930","cashOnly":false,"id":100003},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Normal Doğum","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P619920 • Epidural uygulanırsa kateter için ek ücret alınır.","cashOnly":false,"id":100004},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen + Tüpligasyon (Tüp Bağlama)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100005},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen + Salpenjektomi (Tüplerin Alınması / Çıkarılması)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100006},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Probe (10 Hafta ve Altı) Küretaj (İsteğe Bağlı)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100007},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Tıbbi Nedenli Tahliye (10 Hafta ve Daha Üstü)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620370","cashOnly":false,"id":100008},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Kondilom Koterizasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620250","cashOnly":false,"id":100009},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Apse Drenajı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: 620210","cashOnly":false,"id":100010},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Endometriyal Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620050","cashOnly":false,"id":100011},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Koterizasyon","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620130","cashOnly":false,"id":100012},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620110","cashOnly":false,"id":100013},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Polip Çıkarılması","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620140","cashOnly":false,"id":100014},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Kisti Koterizasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620220","cashOnly":false,"id":100015},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histeroskopi, Diagnostik","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620970","cashOnly":false,"id":100016},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Dilatasyon ve Küretaj (10 Haftadan Küçük)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620380","cashOnly":false,"id":100017},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Terapötik Küretaj, Teşhis ve Tedavi Amaçlı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620160","cashOnly":false,"id":100018},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bumm Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620101","cashOnly":false,"id":100019},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Biyopsi ve Tanısal Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620120","cashOnly":false,"id":100020},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopi, Tanısal","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620990","cashOnly":false,"id":100021},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Polipektomi ve Tanısal Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620150","cashOnly":false,"id":100022},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Konizasyon Operasyonu (Soğuk)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620260","cashOnly":false,"id":100023},{"clinic":"Kadın Hastalıkları ve Doğum","name":"McDonald–Shirodkar (Serklaj; İp Dahil Değil)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620010","cashOnly":false,"id":100024},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histeroskopi, Operatif","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620980","cashOnly":false,"id":100025},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Kisti Çıkarılması","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620020","cashOnly":false,"id":100026},{"clinic":"Kadın Hastalıkları ve Doğum","name":"LEEP Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620270","cashOnly":false,"id":100027},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sistosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620340","cashOnly":false,"id":100028},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparotomi, Tanısal","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P604070","cashOnly":false,"id":100029},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sistorektosel Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620330","cashOnly":false,"id":100030},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Kolposkopi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620240","cashOnly":false,"id":100031},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Overyel veya Paraoveryel Kist Eksizyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620600","cashOnly":false,"id":100032},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Salpenjektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620640","cashOnly":false,"id":100033},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Ooferektomi (Tek veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620580","cashOnly":false,"id":100034},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Myomektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620570","cashOnly":false,"id":100035},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Myomektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620570","cashOnly":false,"id":100036},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620419","cashOnly":false,"id":100037},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Burch Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620690","cashOnly":false,"id":100038},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histerektomi, Abdominal (TAH)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620530","cashOnly":false,"id":100039},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Salpingo-Ooferektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620630","cashOnly":false,"id":100040},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Salpingo-Ooferektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100041},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histerektomi ile Birlikte Salpingo-Ooferektomi, Abdominal (TAH+USO veya TAH+BSO)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620540","cashOnly":false,"id":100042},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Sistorektosel Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620440","cashOnly":false,"id":100043},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi Rektosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620420","cashOnly":false,"id":100044},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Sistosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620421","cashOnly":false,"id":100045},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Salpingo-Ooferektomi (Tek veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620430","cashOnly":false,"id":100046},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Histerektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620740","cashOnly":false,"id":100047},{"clinic":"Kulak Burun Boğaz","name":"Konka Submukozal Rezeksiyonu, İki Taraf","sgkPrice":35000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P601460","cashOnly":false,"id":100048},{"clinic":"Kulak Burun Boğaz","name":"Adenoidektomi","sgkPrice":40000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602380","cashOnly":false,"id":100049},{"clinic":"Kulak Burun Boğaz","name":"Adenoidektomi ve Tüp","sgkPrice":48000,"privatePrice":48000,"minPrice":null,"maxPrice":null,"description":"Kod: P602390","cashOnly":false,"id":100050},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi","sgkPrice":45000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"Kod: P603080 • SGK listede 45–60 bin aralığında.","cashOnly":false,"id":100051},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi ve Adenoidektomi","sgkPrice":50000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"Kod: P603090","cashOnly":false,"id":100052},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi, Adenoidektomi ve Tüp","sgkPrice":55000,"privatePrice":73000,"minPrice":null,"maxPrice":null,"description":"Kod: P603100","cashOnly":false,"id":100053},{"clinic":"Kulak Burun Boğaz","name":"Endoskopik Konka Bulloza Rezeksiyonu","sgkPrice":25000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602230","cashOnly":false,"id":100054},{"clinic":"Kulak Burun Boğaz","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi, İki Taraf","sgkPrice":50000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"Kod: P602320","cashOnly":false,"id":100055},{"clinic":"Kulak Burun Boğaz","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi, Tek Taraf","sgkPrice":40000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602330","cashOnly":false,"id":100056},{"clinic":"Kulak Burun Boğaz","name":"Nazal Fraktür Onarımı","sgkPrice":30000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P601500","cashOnly":false,"id":100057},{"clinic":"Kulak Burun Boğaz","name":"Septoplasti","sgkPrice":45000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P601620 • SGK listede 45–50 bin aralığında.","cashOnly":false,"id":100058},{"clinic":"Kulak Burun Boğaz","name":"Septorinoplasti","sgkPrice":65000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P601630 • SGK listede 65–70 bin aralığında.","cashOnly":false,"id":100059},{"clinic":"Kulak Burun Boğaz","name":"Endolaringeal Mikrocerrahi ile Larinks Poliplerine Girişim","sgkPrice":45000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"Kod: P601750","cashOnly":false,"id":100060},{"clinic":"Kulak Burun Boğaz","name":"Açık Rinoplasti ile Total Septal Rekonstrüksiyon","sgkPrice":60000,"privatePrice":130000,"minPrice":null,"maxPrice":null,"description":"Kod: P601290","cashOnly":false,"id":100061},{"clinic":"Kulak Burun Boğaz","name":"Radyofrekans / Plazma ile Konka Küçültülmesi","sgkPrice":30000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P601331","cashOnly":false,"id":100062},{"clinic":"Kulak Burun Boğaz","name":"Timpanoplasti","sgkPrice":65000,"privatePrice":105000,"minPrice":null,"maxPrice":null,"description":"Kod: P618410","cashOnly":false,"id":100063},{"clinic":"Kulak Burun Boğaz","name":"Ventilasyon Tüpü Uygulaması, Tek Taraf","sgkPrice":25000,"privatePrice":25000,"minPrice":null,"maxPrice":null,"description":"Kod: P618411","cashOnly":false,"id":100064},{"clinic":"Kulak Burun Boğaz","name":"Radikal veya Çok Modifiye Radikal Mastoidektomi","sgkPrice":75000,"privatePrice":155000,"minPrice":null,"maxPrice":null,"description":"Kod: P618380","cashOnly":false,"id":100065},{"clinic":"Kulak Burun Boğaz","name":"Endoskopik Frontal Sinüs Cerrahisi","sgkPrice":55000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P602210","cashOnly":false,"id":100066},{"clinic":"Kulak Burun Boğaz","name":"Stapedektomi","sgkPrice":75000,"privatePrice":165000,"minPrice":null,"maxPrice":null,"description":"Kod: P618390","cashOnly":false,"id":100067},{"clinic":"Cildiye","name":"Kriyoterapi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100068},{"clinic":"Cildiye","name":"Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.000 / 2.000 / 3.000 TL","cashOnly":false,"id":100069},{"clinic":"Cildiye","name":"Kriyo + Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 2.000 / 3.000 / 4.000 TL","cashOnly":false,"id":100070},{"clinic":"Cildiye","name":"ILS","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100071},{"clinic":"Cildiye","name":"Elektrokoter","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100072},{"clinic":"Cildiye","name":"Shave Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":5000,"maxPrice":null,"description":"","cashOnly":false,"id":100073},{"clinic":"Cildiye","name":"Punch Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":6000,"maxPrice":null,"description":"","cashOnly":false,"id":100074},{"clinic":"Cildiye","name":"Punch Biyopsi + IF","sgkPrice":null,"privatePrice":null,"minPrice":8000,"maxPrice":null,"description":"","cashOnly":false,"id":100075},{"clinic":"Cildiye","name":"Eksizyonel Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":null,"description":"","cashOnly":false,"id":100076},{"clinic":"Cildiye","name":"İntralezyonel Enjeksiyon","sgkPrice":null,"privatePrice":null,"minPrice":2500,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100077},{"clinic":"Genel Cerrahi","name":"Meme CA (MRM) Operasyonu","sgkPrice":220000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100078},{"clinic":"Genel Cerrahi","name":"Meme CA (Meme Koruyucu Cerrahi)","sgkPrice":275000,"privatePrice":350000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100079},{"clinic":"Genel Cerrahi","name":"Kolostomi Açma / Kapama","sgkPrice":220000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100080},{"clinic":"Genel Cerrahi","name":"Mide Perforasyonu Operasyonu","sgkPrice":175000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100081},{"clinic":"Genel Cerrahi","name":"İleus Operasyonu","sgkPrice":175000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100082},{"clinic":"Genel Cerrahi","name":"Laparoskopik Kolesistektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ve fazla yatış ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100083},{"clinic":"Genel Cerrahi","name":"İnsizyonel Herni Onarımı","sgkPrice":100000,"privatePrice":120000,"minPrice":null,"maxPrice":null,"description":"SGK 100–220 bin; ücretli 120–300 bin. Yoğun bakım ve fazla yatış ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100084},{"clinic":"Genel Cerrahi","name":"Açık İnguinal Herni Onarımı","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100085},{"clinic":"Genel Cerrahi","name":"Umbilikal Herni Onarımı","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"SGK 50–150 bin; ücretli 100–175 bin. Preop tetkikler hariçtir.","cashOnly":false,"id":100086},{"clinic":"Genel Cerrahi","name":"Apendektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"SGK 60–120 bin; ücretli 100–140 bin. Preop tetkikler hariçtir.","cashOnly":false,"id":100087},{"clinic":"Genel Cerrahi","name":"Pilonidal Sinüs Eksizyonu","sgkPrice":50000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100088},{"clinic":"Genel Cerrahi","name":"Limberg Flep Uygulaması","sgkPrice":60000,"privatePrice":85000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100089},{"clinic":"Genel Cerrahi","name":"Kristalize Fenol Uygulaması","sgkPrice":20000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100090},{"clinic":"Genel Cerrahi","name":"Hemoroidektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100091},{"clinic":"Genel Cerrahi","name":"Longo (Stapler Hemoroidopeksi)","sgkPrice":100000,"privatePrice":125000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100092},{"clinic":"Genel Cerrahi","name":"Lazer Hemoroidopeksi","sgkPrice":80000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100093},{"clinic":"Genel Cerrahi","name":"Sfinkterotomi","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100094},{"clinic":"Genel Cerrahi","name":"Fistülotomi / Fistülektomi","sgkPrice":75000,"privatePrice":120000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100095},{"clinic":"Genel Cerrahi","name":"Perianal Apse Drenajı","sgkPrice":75000,"privatePrice":140000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100096},{"clinic":"Genel Cerrahi","name":"Memeden Kitle Eksizyonu / Biyopsi","sgkPrice":35000,"privatePrice":45000,"minPrice":null,"maxPrice":null,"description":"Yatış ve anestezi ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100097},{"clinic":"Genel Cerrahi","name":"Küçük Lokaller","sgkPrice":6000,"privatePrice":12000,"minPrice":null,"maxPrice":null,"description":"SGK 6–12 bin; ücretli 12–25 bin. Yatış ve anestezi ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100098},{"clinic":"Göz Hastalıkları","name":"Katarakt","sgkPrice":30000,"privatePrice":45000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 45.000 TL.","cashOnly":false,"id":100099},{"clinic":"Göz Hastalıkları","name":"YAG Lazer","sgkPrice":15000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 20.000 TL.","cashOnly":false,"id":100100},{"clinic":"Göz Hastalıkları","name":"Şalazyon","sgkPrice":15000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 20.000 TL.","cashOnly":false,"id":100101},{"clinic":"Göz Hastalıkları","name":"Pterjium","sgkPrice":24000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 30.000 TL.","cashOnly":false,"id":100102},{"clinic":"Göz Hastalıkları","name":"Akıllı Lens","sgkPrice":null,"privatePrice":140000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100103},{"clinic":"Göz Hastalıkları","name":"Üst Göz Kapağı","sgkPrice":null,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100104},{"clinic":"Göz Hastalıkları","name":"Alt Göz Kapağı","sgkPrice":null,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100105},{"clinic":"Göz Hastalıkları","name":"DSR","sgkPrice":null,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Anestezi dahil notu mevcut.","cashOnly":false,"id":100106},{"clinic":"Plastik Cerrahi","name":"Rinoplasti","sgkPrice":null,"privatePrice":null,"minPrice":80000,"maxPrice":null,"description":"","cashOnly":false,"id":100107},{"clinic":"Plastik Cerrahi","name":"Meme Büyütme","sgkPrice":null,"privatePrice":null,"minPrice":120000,"maxPrice":140000,"description":"","cashOnly":false,"id":100108},{"clinic":"Plastik Cerrahi","name":"Meme Büyütme ve Dikleştirme","sgkPrice":null,"privatePrice":null,"minPrice":160000,"maxPrice":180000,"description":"","cashOnly":false,"id":100109},{"clinic":"Plastik Cerrahi","name":"Meme Küçültme","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100110},{"clinic":"Plastik Cerrahi","name":"Karın Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100111},{"clinic":"Plastik Cerrahi","name":"Gıdı Liposuction","sgkPrice":null,"privatePrice":null,"minPrice":35000,"maxPrice":null,"description":"","cashOnly":false,"id":100112},{"clinic":"Plastik Cerrahi","name":"Liposuction (2 Bölge)","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":null,"description":"","cashOnly":false,"id":100113},{"clinic":"Plastik Cerrahi","name":"Liposuction (3 Bölge)","sgkPrice":null,"privatePrice":null,"minPrice":75000,"maxPrice":null,"description":"","cashOnly":false,"id":100114},{"clinic":"Plastik Cerrahi","name":"Kol Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100115},{"clinic":"Plastik Cerrahi","name":"Uyluk Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100116},{"clinic":"Plastik Cerrahi","name":"Jinekomasti","sgkPrice":null,"privatePrice":null,"minPrice":70000,"maxPrice":null,"description":"","cashOnly":false,"id":100117},{"clinic":"Plastik Cerrahi","name":"Yüz Germe","sgkPrice":null,"privatePrice":null,"minPrice":175000,"maxPrice":null,"description":"","cashOnly":false,"id":100118},{"clinic":"Plastik Cerrahi","name":"Temporal Lift","sgkPrice":null,"privatePrice":null,"minPrice":80000,"maxPrice":null,"description":"","cashOnly":false,"id":100119},{"clinic":"Plastik Cerrahi","name":"Üst Göz Kapağı Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":35000,"maxPrice":null,"description":"","cashOnly":false,"id":100120},{"clinic":"Plastik Cerrahi","name":"Alt Göz Kapağı Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":null,"description":"","cashOnly":false,"id":100121},{"clinic":"Plastik Cerrahi","name":"Dört Kapak Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":75000,"maxPrice":null,"description":"","cashOnly":false,"id":100122},{"clinic":"Plastik Cerrahi","name":"Kepçe Kulak Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":65000,"maxPrice":null,"description":"","cashOnly":false,"id":100123},{"clinic":"Plastik Cerrahi","name":"Botoks","sgkPrice":null,"privatePrice":null,"minPrice":7500,"maxPrice":null,"description":"","cashOnly":false,"id":100124},{"clinic":"Plastik Cerrahi","name":"Dolgu","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":null,"description":"","cashOnly":false,"id":100125},{"clinic":"Plastik Cerrahi","name":"Greft / Flep","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":60000,"description":"","cashOnly":false,"id":100126},{"clinic":"Plastik Cerrahi","name":"Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":15000,"description":"","cashOnly":false,"id":100127},{"clinic":"Çocuk Cerrahisi","name":"Sünnet (Genel)","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620731 • Kurumsal fiyat.","cashOnly":false,"id":100128},{"clinic":"Çocuk Cerrahisi","name":"Sünnet (Lokal, Çocuk)","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620732 • Kurumsal fiyat.","cashOnly":false,"id":100129},{"clinic":"Çocuk Cerrahisi","name":"Apendektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620100","cashOnly":false,"id":100130},{"clinic":"Çocuk Cerrahisi","name":"Testis Detorsiyonu ve Orşiopeksi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620110","cashOnly":false,"id":100131},{"clinic":"Çocuk Cerrahisi","name":"Skrotal Orşiektomi (Tek)","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620120","cashOnly":false,"id":100132},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı (Bilateral)","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620130","cashOnly":false,"id":100133},{"clinic":"Çocuk Cerrahisi","name":"İnmemiş Testis (Cilt Tarafı)","sgkPrice":50000,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Kod: P621250","cashOnly":false,"id":100134},{"clinic":"Çocuk Cerrahisi","name":"Hidroselektomi, Tek Taraf","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620300","cashOnly":false,"id":100135},{"clinic":"Çocuk Cerrahisi","name":"Hidroselektomi ve Herniyopeksi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620310","cashOnly":false,"id":100136},{"clinic":"Çocuk Cerrahisi","name":"Hipospadias Onarımı, Distal","sgkPrice":50000,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Kod: P620320","cashOnly":false,"id":100137},{"clinic":"Çocuk Cerrahisi","name":"Labial Füzyon Açılması, Lokal","sgkPrice":3000,"privatePrice":5000,"minPrice":null,"maxPrice":null,"description":"Kod: P620330","cashOnly":false,"id":100138},{"clinic":"Çocuk Cerrahisi","name":"Karaciğer Kist Hidatiğinde Kistotomi","sgkPrice":80000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P620400 • 5 yaşına kadar notu mevcut.","cashOnly":false,"id":100139},{"clinic":"Çocuk Cerrahisi","name":"Ovarial veya Paraovarial Kist Eksizyonu","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"Kod: P620420","cashOnly":false,"id":100140},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik Varikoselektomi","sgkPrice":70000,"privatePrice":80000,"minPrice":null,"maxPrice":null,"description":"Kod: P621620","cashOnly":false,"id":100141},{"clinic":"Çocuk Cerrahisi","name":"Varikoselektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P621770","cashOnly":false,"id":100142},{"clinic":"Çocuk Cerrahisi","name":"Tanısal Sistoskopi","sgkPrice":25000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P619530","cashOnly":false,"id":100143},{"clinic":"Çocuk Cerrahisi","name":"Bronkoskopi, Yabancı Cisim Çıkarılması","sgkPrice":80000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620820 • Özel fiyat net okunamadı.","cashOnly":false,"id":100144},{"clinic":"Çocuk Cerrahisi","name":"Meatotomi / Meatoplasti","sgkPrice":20000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P620910 • İşlem adı el yazısıyla düzeltilmiş.","cashOnly":false,"id":100145},{"clinic":"Çocuk Cerrahisi","name":"Üretra Dilatasyonu","sgkPrice":20000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P619750","cashOnly":false,"id":100146},{"clinic":"Çocuk Cerrahisi","name":"Perianal Apse Drenajı","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P601710","cashOnly":false,"id":100147},{"clinic":"Çocuk Cerrahisi","name":"Pilonidal Sinüs Lazer","sgkPrice":50000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100148},{"clinic":"Çocuk Cerrahisi","name":"İnguinal Herni Onarımı (Açık)","sgkPrice":60000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100149},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnguinal Herni Onarımı, Tek Taraf","sgkPrice":45000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100150},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnguinal Herni Onarımı, Çift Taraf","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100151},{"clinic":"Çocuk Cerrahisi","name":"Ladd Bant Eksizyonu / Malrotasyon","sgkPrice":90000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620500","cashOnly":false,"id":100152},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz Umbilikal Herni Onarımı","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620600 • Göbek fıtığı.","cashOnly":false,"id":100153},{"clinic":"Çocuk Cerrahisi","name":"Servikal Lenf Nodu Diseksiyonu","sgkPrice":25000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P620440","cashOnly":false,"id":100154},{"clinic":"Çocuk Cerrahisi","name":"Trakeotomi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620470","cashOnly":false,"id":100155},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı, Tek Taraf","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620730 • Kasık fıtığı.","cashOnly":false,"id":100156},{"clinic":"Çocuk Cerrahisi","name":"İnmemiş Testis (Tek Taraflı)","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P621550","cashOnly":false,"id":100157},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı, İnkarsere veya Strangüle","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620760","cashOnly":false,"id":100158},{"clinic":"Çocuk Cerrahisi","name":"Frenulum Linguae Plastiği (Basit Dilbağı)","sgkPrice":5000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620770","cashOnly":false,"id":100159},{"clinic":"Çocuk Cerrahisi","name":"Hipertrofik Lingual Frenulum Düzeltilmesi (İleri)","sgkPrice":10000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620830","cashOnly":false,"id":100160},{"clinic":"Çocuk Cerrahisi","name":"Meckel Divertikülü","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"Kod: P620900 • 5 yaşına kadar notu mevcut.","cashOnly":false,"id":100161},{"clinic":"Çocuk Cerrahisi","name":"Memeden Kist / Benign Tümör Çıkarılması","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620730 • Kod görüntüde bu şekilde yazılı.","cashOnly":false,"id":100162},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik Apendektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P610131","cashOnly":false,"id":100163},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnmemiş Testis","sgkPrice":70000,"privatePrice":80000,"minPrice":null,"maxPrice":null,"description":"Kod: P621600 • Anestezi notu mevcut.","cashOnly":false,"id":100164},{"clinic":"Ortopedi","name":"Diz Artroskopisi - Menisküs Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":130000,"maxPrice":180000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200001},{"clinic":"Ortopedi","name":"Diz Artroskopisi - Ön Çapraz Bağ ve Menisküs Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":150000,"maxPrice":200000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200002},{"clinic":"Ortopedi","name":"Omuz Artroskopisi - Tendon Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":130000,"maxPrice":200000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200003},{"clinic":"Ortopedi","name":"Omuz Artroskopisi - Bankart Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":null,"description":"Tekrarlayan omuz çıkıklarında.","cashOnly":false,"id":200004},{"clinic":"Ortopedi","name":"Kalça Kırığı - PFNA","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":200000,"description":"Yaklaşık 2 gece yatış ve 2 ünite kan ihtiyacı olabilir.","cashOnly":false,"id":200005},{"clinic":"Ortopedi","name":"Kalça Kırığı - Bipolar Kalça Protezi","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":200000,"description":"Yaklaşık 2 gece yatış ve 2 ünite kan ihtiyacı olabilir.","cashOnly":false,"id":200006},{"clinic":"Ortopedi","name":"Tırnak Yatağı Revizyonu","sgkPrice":null,"privatePrice":null,"minPrice":20000,"maxPrice":null,"description":"","cashOnly":false,"id":200007},{"clinic":"Ortopedi","name":"Çocuklarda Kapalı Redüksiyon ve Alçılama","sgkPrice":null,"privatePrice":null,"minPrice":30000,"maxPrice":50000,"description":"Çocuk kırıklarında.","cashOnly":false,"id":200008},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 1. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":100000,"maxPrice":120000,"description":"","cashOnly":false,"id":200009},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 2. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":140000,"maxPrice":180000,"description":"","cashOnly":false,"id":200010},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 3. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":250000,"maxPrice":300000,"description":"","cashOnly":false,"id":200011},{"clinic":"Ortopedi","name":"Klasik Diz Protezi","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":null,"description":"","cashOnly":false,"id":200012},{"clinic":"Ortopedi","name":"Robotik Diz Protezi","sgkPrice":null,"privatePrice":null,"minPrice":200000,"maxPrice":null,"description":"","cashOnly":false,"id":200013}];
const COLLECTION_NAME = "surgeryPrices";
const ADMIN_EMAIL = "yaman615@gmail.com";

let data = [];
let editing = null;
let migrating = false;
let isAdmin = false;

const listElement = document.getElementById("list");
const connectionStatus = document.getElementById("connectionStatus");
const adminStatus = document.getElementById("adminStatus");
const adminPanel = document.getElementById("adminPanel");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const saveButton = document.getElementById("saveButton");
const backupButton = document.getElementById("backupButton");
const restoreButton = document.getElementById("restoreButton");
const restoreFile = document.getElementById("restoreFile");

document.getElementById("search").addEventListener("input", render);
document.getElementById("filter").addEventListener("change", render);
document.getElementById("clearButton").addEventListener("click", clearForm);
saveButton.addEventListener("click", save);
loginButton.addEventListener("click", login);
logoutButton.addEventListener("click", logout);
backupButton.addEventListener("click", downloadBackup);
restoreButton.addEventListener("click", () => restoreFile.click());
restoreFile.addEventListener("change", restoreBackup);

function setConnectionStatus(message, type = "") {
  connectionStatus.textContent = message;
  connectionStatus.className = `status ${type}`.trim();
}

function updateAdminUi(user) {
  isAdmin = Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL);

  if (isAdmin) {
    adminStatus.textContent = `Yönetici modu • ${user.email}`;
    adminStatus.className = "admin-status admin";
    adminPanel.classList.remove("hidden");
    loginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");
  } else {
    adminStatus.textContent = user
      ? `Bu hesap yönetici değil: ${user.email || "Bilinmeyen hesap"}`
      : "Ziyaretçi modu • Kayıtlar yalnızca görüntülenebilir.";
    adminStatus.className = user ? "admin-status denied" : "admin-status visitor";
    adminPanel.classList.add("hidden");
    loginButton.classList.remove("hidden");
    logoutButton.classList.add("hidden");
    clearForm();
  }

  render();
}

async function login() {
  loginButton.disabled = true;
  loginButton.textContent = "Giriş yapılıyor...";
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user.email || result.user.email.toLowerCase() !== ADMIN_EMAIL) {
      await signOut(auth);
      alert("Bu Google hesabının yönetici yetkisi yok.");
    }
  } catch (error) {
    console.error(error);
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Google ile giriş yapılamadı. Tekrar dene.");
    }
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "🔐 Google ile Yönetici Girişi";
  }
}

async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("Çıkış yapılamadı.");
  }
}

onAuthStateChanged(auth, updateAdminUi);

function normalise(item) {
  return {
    id: Number(item.id) || Date.now(),
    clinic: String(item.clinic || "Diğer"),
    name: String(item.name || ""),
    minPrice: item.minPrice ?? null,
    maxPrice: item.maxPrice ?? null,
    sgkPrice: item.sgkPrice ?? null,
    privatePrice: item.privatePrice ?? null,
    description: String(item.description || ""),
    cashOnly: Boolean(item.cashOnly)
  };
}

function getInitialData() {
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem("surgeryPrices") || "null") || [];
  } catch (error) {
    console.warn(error);
  }

  const merged = local.map(normalise);
  const keys = new Set(merged.map(item => `${item.clinic}|${item.name}`.toLowerCase()));

  SEED.map(normalise).forEach(item => {
    const key = `${item.clinic}|${item.name}`.toLowerCase();
    if (!keys.has(key)) {
      merged.push(item);
      keys.add(key);
    }
  });

  return merged;
}

async function migrate() {
  if (migrating || !isAdmin) return;
  migrating = true;
  try {
    setConnectionStatus("İlk kayıtlar ortak veritabanına aktarılıyor...");
    const batch = writeBatch(db);
    getInitialData().forEach(item => batch.set(doc(db, COLLECTION_NAME, String(item.id)), item));
    await batch.commit();
    localStorage.removeItem("surgeryPrices");
    setConnectionStatus("Ortak veritabanı hazır.", "ok");
  } catch (error) {
    migrating = false;
    console.error(error);
    setConnectionStatus("Veriler aktarılamadı. Firestore kurallarını kontrol et.", "error");
  }
}

onSnapshot(
  collection(db, COLLECTION_NAME),
  async snapshot => {
    if (snapshot.empty) {
      data = [];
      render();
      if (isAdmin) await migrate();
      else setConnectionStatus("Veritabanı boş. İlk aktarım için yönetici girişi gerekli.", "error");
      return;
    }

    data = snapshot.docs
      .map(snapshotDoc => normalise(snapshotDoc.data()))
      .sort((a, b) => a.clinic.localeCompare(b.clinic, "tr") || a.name.localeCompare(b.name, "tr"));

    setConnectionStatus("Firebase bağlı • Değişiklikler tüm cihazlara anında yansır.", "ok");
    render();
  },
  error => {
    console.error(error);
    setConnectionStatus("Firebase bağlantısı kurulamadı. Firestore kurallarını kontrol et.", "error");
    listElement.innerHTML = '<p class="muted">Veriler yüklenemedi.</p>';
  }
);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value) {
  return new Intl.NumberFormat("tr-TR").format(value) + " TL";
}

function prices(item) {
  const result = [];
  if (item.sgkPrice != null) result.push(`<span class="chip">SGK: ${money(item.sgkPrice)}</span>`);
  if (item.privatePrice != null) result.push(`<span class="chip">Özel: ${money(item.privatePrice)}</span>`);
  if (!result.length && item.minPrice != null) {
    const label = item.maxPrice != null && item.maxPrice !== item.minPrice
      ? `${money(item.minPrice)} - ${money(item.maxPrice)}`
      : money(item.minPrice);
    result.push(`<span class="chip">${label}</span>`);
  }
  if (!result.length) result.push('<span class="chip">Fiyat girilmedi</span>');
  return result.join("");
}

function updateFilter() {
  const filter = document.getElementById("filter");
  const current = filter.value;
  const clinics = [...new Set(data.map(item => item.clinic))].sort((a, b) => a.localeCompare(b, "tr"));

  filter.innerHTML =
    '<option value="">Tüm poliklinikler</option>' +
    clinics.map(clinic => `<option value="${escapeHtml(clinic)}">${escapeHtml(clinic)}</option>`).join("");

  if (clinics.includes(current)) filter.value = current;
}

function render() {
  updateFilter();

  const query = document.getElementById("search").value.toLowerCase();
  const selectedClinic = document.getElementById("filter").value;

  const rows = data.filter(item => {
    const text = `${item.name} ${item.clinic} ${item.description}`.toLowerCase();
    return (!selectedClinic || item.clinic === selectedClinic) && text.includes(query);
  });

  const groups = {};
  rows.forEach(item => (groups[item.clinic] ??= []).push(item));

  listElement.innerHTML =
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, "tr"))
      .map(clinic => `
        <h3 class="group-title">${escapeHtml(clinic)} (${groups[clinic].length})</h3>
        ${groups[clinic].map(item => `
          <div class="card ${item.cashOnly ? "cash" : ""}">
            ${item.cashOnly ? '<div class="cashwarn">⚠ SADECE NAKİT ÖDEME</div>' : ""}
            <div class="name">${escapeHtml(item.name)}</div>
            <div class="prices">${prices(item)}</div>
            <div class="note">${escapeHtml(item.description)}</div>
            ${isAdmin ? `
              <div class="actions">
                <button class="secondary" data-edit="${item.id}">Düzenle</button>
                <button class="danger" data-delete="${item.id}">Sil</button>
              </div>` : ""}
          </div>
        `).join("")}
      `)
      .join("") || '<p class="muted">Kayıt bulunamadı.</p>';

  if (isAdmin) {
    document.querySelectorAll("[data-edit]").forEach(button => {
      button.addEventListener("click", () => edit(Number(button.dataset.edit)));
    });
    document.querySelectorAll("[data-delete]").forEach(button => {
      button.addEventListener("click", () => removeRecord(Number(button.dataset.delete)));
    });
  }
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function numberOf(id) {
  const value = valueOf(id);
  return value === "" ? null : Number(value);
}

async function save() {
  if (!isAdmin) {
    alert("Bu işlem için yönetici girişi gerekli.");
    return;
  }

  const clinic = valueOf("clinic");
  const name = valueOf("name");

  if (!clinic || !name) {
    alert("Poliklinik ve işlem adı zorunludur.");
    return;
  }

  const item = {
    id: editing || Date.now(),
    clinic,
    name,
    minPrice: numberOf("minPrice"),
    maxPrice: numberOf("maxPrice"),
    sgkPrice: numberOf("sgkPrice"),
    privatePrice: numberOf("privatePrice"),
    description: valueOf("description"),
    cashOnly: document.getElementById("cashOnly").checked
  };

  saveButton.disabled = true;
  saveButton.textContent = "Kaydediliyor...";

  try {
    await setDoc(doc(db, COLLECTION_NAME, String(item.id)), item);
    clearForm();
  } catch (error) {
    console.error(error);
    alert("Kayıt Firebase'e kaydedilemedi.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Kaydet";
  }
}

function edit(id) {
  if (!isAdmin) return;

  const item = data.find(record => record.id === id);
  if (!item) return;

  editing = id;
  ["clinic", "name", "description"].forEach(key => {
    document.getElementById(key).value = item[key] || "";
  });
  ["minPrice", "maxPrice", "sgkPrice", "privatePrice"].forEach(key => {
    document.getElementById(key).value = item[key] ?? "";
  });
  document.getElementById("cashOnly").checked = item.cashOnly;
  adminPanel.scrollIntoView({ behavior: "smooth" });
}

async function removeRecord(id) {
  if (!isAdmin) {
    alert("Bu işlem için yönetici girişi gerekli.");
    return;
  }

  const item = data.find(record => record.id === id);
  if (!confirm(`${item?.name || "Kayıt"} silinsin mi?`)) return;

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, String(id)));
    if (editing === id) clearForm();
  } catch (error) {
    console.error(error);
    alert("Kayıt silinemedi.");
  }
}


function backupFileName() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");
  return `yatis-birimi-yedek-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

function downloadBackup() {
  if (!isAdmin) {
    alert("Yedek almak için yönetici girişi gerekli.");
    return;
  }
  const payload = { app: "Yatış Birimi Asistanı", version: 1, exportedAt: new Date().toISOString(), recordCount: data.length, records: data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateBackup(parsed) {
  const records = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(records)) throw new Error("Yedek dosyasında records listesi bulunamadı.");
  return records.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`${index + 1}. kayıt geçersiz.`);
    const normalised = normalise(item);
    if (!normalised.name.trim()) throw new Error(`${index + 1}. kaydın işlem adı boş.`);
    return normalised;
  });
}

async function restoreBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!isAdmin) {
    alert("Yedek geri yüklemek için yönetici girişi gerekli.");
    return;
  }
  try {
    const records = validateBackup(JSON.parse(await file.text()));
    const confirmed = confirm(`${records.length} kayıt Firestore'a aktarılacak.\n\nAynı kimliğe sahip kayıtlar güncellenecek, diğer mevcut kayıtlar silinmeyecek.\n\nDevam edilsin mi?`);
    if (!confirmed) return;
    restoreButton.disabled = true;
    restoreButton.textContent = "Geri yükleniyor...";
    for (let start = 0; start < records.length; start += 450) {
      const batch = writeBatch(db);
      records.slice(start, start + 450).forEach(item => batch.set(doc(db, COLLECTION_NAME, String(item.id)), item));
      await batch.commit();
    }
    alert(`${records.length} kayıt başarıyla geri yüklendi.`);
  } catch (error) {
    console.error(error);
    alert(`Yedek geri yüklenemedi: ${error.message || "Dosya geçersiz."}`);
  } finally {
    restoreButton.disabled = false;
    restoreButton.textContent = "⬆ Yedekten Geri Yükle";
  }
}

function clearForm() {
  editing = null;
  ["clinic", "name", "minPrice", "maxPrice", "sgkPrice", "privatePrice", "description"]
    .forEach(key => document.getElementById(key).value = "");
  document.getElementById("cashOnly").checked = false;
}
