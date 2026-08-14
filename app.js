import { db, auth, googleProvider } from "./firebase.js?v=11";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { normalizeUserProfile, permissionsFor } from "./access-control.js?v=11";
import { UserProfileRepository } from "./user-profile-repository.js?v=11";
import { createPriceListenerController } from "./price-listener-controller.js?v=11";
import { PendingUserRepository } from "./pending-user-repository.js?v=11";
import { emailAuthErrorMessage, requireCorporateEmailAddress } from "./corporate-auth-policy.js?v=11";
import { UserInvitationRepository } from "./user-invitation-repository.js?v=11";

const SEED = [{"clinic":"Ortopedi","name":"Kalça Protezi","sgkPrice":null,"privatePrice":null,"minPrice":500000,"maxPrice":null,"description":"İthal protez dahil","cashOnly":false,"id":100000},{"clinic":"Genel Cerrahi","name":"Total Mastektomi","sgkPrice":null,"privatePrice":null,"minPrice":280000,"maxPrice":null,"description":"Preop hazırlık dahil","cashOnly":false,"id":100001},{"clinic":"Ortopedi","name":"Ayak Bileği Artroskopisi","sgkPrice":null,"privatePrice":null,"minPrice":200000,"maxPrice":250000,"description":"Preop hazırlık Medikent’te yapılırsa 10.000 TL eklenir","cashOnly":false,"id":100002},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P619930","cashOnly":false,"id":100003},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Normal Doğum","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P619920 • Epidural uygulanırsa kateter için ek ücret alınır.","cashOnly":false,"id":100004},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen + Tüpligasyon (Tüp Bağlama)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100005},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sezaryen + Salpenjektomi (Tüplerin Alınması / Çıkarılması)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100006},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Probe (10 Hafta ve Altı) Küretaj (İsteğe Bağlı)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100007},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Tıbbi Nedenli Tahliye (10 Hafta ve Daha Üstü)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620370","cashOnly":false,"id":100008},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Kondilom Koterizasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620250","cashOnly":false,"id":100009},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Apse Drenajı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: 620210","cashOnly":false,"id":100010},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Endometriyal Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620050","cashOnly":false,"id":100011},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Koterizasyon","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620130","cashOnly":false,"id":100012},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620110","cashOnly":false,"id":100013},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Polip Çıkarılması","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620140","cashOnly":false,"id":100014},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Kisti Koterizasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620220","cashOnly":false,"id":100015},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histeroskopi, Diagnostik","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620970","cashOnly":false,"id":100016},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Dilatasyon ve Küretaj (10 Haftadan Küçük)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620380","cashOnly":false,"id":100017},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Terapötik Küretaj, Teşhis ve Tedavi Amaçlı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620160","cashOnly":false,"id":100018},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bumm Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620101","cashOnly":false,"id":100019},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Biyopsi ve Tanısal Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620120","cashOnly":false,"id":100020},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopi, Tanısal","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620990","cashOnly":false,"id":100021},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Servikal Polipektomi ve Tanısal Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620150","cashOnly":false,"id":100022},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Konizasyon Operasyonu (Soğuk)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620260","cashOnly":false,"id":100023},{"clinic":"Kadın Hastalıkları ve Doğum","name":"McDonald–Shirodkar (Serklaj; İp Dahil Değil)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620010","cashOnly":false,"id":100024},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histeroskopi, Operatif","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620980","cashOnly":false,"id":100025},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Bartholin Kisti Çıkarılması","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620020","cashOnly":false,"id":100026},{"clinic":"Kadın Hastalıkları ve Doğum","name":"LEEP Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620270","cashOnly":false,"id":100027},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sistosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620340","cashOnly":false,"id":100028},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparotomi, Tanısal","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P604070","cashOnly":false,"id":100029},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Sistorektosel Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620330","cashOnly":false,"id":100030},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Kolposkopi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620240","cashOnly":false,"id":100031},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Overyel veya Paraoveryel Kist Eksizyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620600","cashOnly":false,"id":100032},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Salpenjektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620640","cashOnly":false,"id":100033},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Ooferektomi (Tek veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620580","cashOnly":false,"id":100034},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Myomektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620570","cashOnly":false,"id":100035},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Myomektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620570","cashOnly":false,"id":100036},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620419","cashOnly":false,"id":100037},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Burch Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620690","cashOnly":false,"id":100038},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histerektomi, Abdominal (TAH)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620530","cashOnly":false,"id":100039},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Salpingo-Ooferektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620630","cashOnly":false,"id":100040},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Salpingo-Ooferektomi (Tek Taraf veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100041},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Histerektomi ile Birlikte Salpingo-Ooferektomi, Abdominal (TAH+USO veya TAH+BSO)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620540","cashOnly":false,"id":100042},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Sistorektosel Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620440","cashOnly":false,"id":100043},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi Rektosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620420","cashOnly":false,"id":100044},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Sistosel Operasyonu","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620421","cashOnly":false,"id":100045},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Vajinal Histerektomi ve Salpingo-Ooferektomi (Tek veya İki Taraf)","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620430","cashOnly":false,"id":100046},{"clinic":"Kadın Hastalıkları ve Doğum","name":"Laparoskopik Histerektomi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620740","cashOnly":false,"id":100047},{"clinic":"Kulak Burun Boğaz","name":"Konka Submukozal Rezeksiyonu, İki Taraf","sgkPrice":35000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P601460","cashOnly":false,"id":100048},{"clinic":"Kulak Burun Boğaz","name":"Adenoidektomi","sgkPrice":40000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602380","cashOnly":false,"id":100049},{"clinic":"Kulak Burun Boğaz","name":"Adenoidektomi ve Tüp","sgkPrice":48000,"privatePrice":48000,"minPrice":null,"maxPrice":null,"description":"Kod: P602390","cashOnly":false,"id":100050},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi","sgkPrice":45000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"Kod: P603080 • SGK listede 45–60 bin aralığında.","cashOnly":false,"id":100051},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi ve Adenoidektomi","sgkPrice":50000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"Kod: P603090","cashOnly":false,"id":100052},{"clinic":"Kulak Burun Boğaz","name":"Tonsillektomi, Adenoidektomi ve Tüp","sgkPrice":55000,"privatePrice":73000,"minPrice":null,"maxPrice":null,"description":"Kod: P603100","cashOnly":false,"id":100053},{"clinic":"Kulak Burun Boğaz","name":"Endoskopik Konka Bulloza Rezeksiyonu","sgkPrice":25000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602230","cashOnly":false,"id":100054},{"clinic":"Kulak Burun Boğaz","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi, İki Taraf","sgkPrice":50000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"Kod: P602320","cashOnly":false,"id":100055},{"clinic":"Kulak Burun Boğaz","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi, Tek Taraf","sgkPrice":40000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P602330","cashOnly":false,"id":100056},{"clinic":"Kulak Burun Boğaz","name":"Nazal Fraktür Onarımı","sgkPrice":30000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P601500","cashOnly":false,"id":100057},{"clinic":"Kulak Burun Boğaz","name":"Septoplasti","sgkPrice":45000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P601620 • SGK listede 45–50 bin aralığında.","cashOnly":false,"id":100058},{"clinic":"Kulak Burun Boğaz","name":"Septorinoplasti","sgkPrice":65000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P601630 • SGK listede 65–70 bin aralığında.","cashOnly":false,"id":100059},{"clinic":"Kulak Burun Boğaz","name":"Endolaringeal Mikrocerrahi ile Larinks Poliplerine Girişim","sgkPrice":45000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"Kod: P601750","cashOnly":false,"id":100060},{"clinic":"Kulak Burun Boğaz","name":"Açık Rinoplasti ile Total Septal Rekonstrüksiyon","sgkPrice":60000,"privatePrice":130000,"minPrice":null,"maxPrice":null,"description":"Kod: P601290","cashOnly":false,"id":100061},{"clinic":"Kulak Burun Boğaz","name":"Radyofrekans / Plazma ile Konka Küçültülmesi","sgkPrice":30000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P601331","cashOnly":false,"id":100062},{"clinic":"Kulak Burun Boğaz","name":"Timpanoplasti","sgkPrice":65000,"privatePrice":105000,"minPrice":null,"maxPrice":null,"description":"Kod: P618410","cashOnly":false,"id":100063},{"clinic":"Kulak Burun Boğaz","name":"Ventilasyon Tüpü Uygulaması, Tek Taraf","sgkPrice":25000,"privatePrice":25000,"minPrice":null,"maxPrice":null,"description":"Kod: P618411","cashOnly":false,"id":100064},{"clinic":"Kulak Burun Boğaz","name":"Radikal veya Çok Modifiye Radikal Mastoidektomi","sgkPrice":75000,"privatePrice":155000,"minPrice":null,"maxPrice":null,"description":"Kod: P618380","cashOnly":false,"id":100065},{"clinic":"Kulak Burun Boğaz","name":"Endoskopik Frontal Sinüs Cerrahisi","sgkPrice":55000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P602210","cashOnly":false,"id":100066},{"clinic":"Kulak Burun Boğaz","name":"Stapedektomi","sgkPrice":75000,"privatePrice":165000,"minPrice":null,"maxPrice":null,"description":"Kod: P618390","cashOnly":false,"id":100067},{"clinic":"Cildiye","name":"Kriyoterapi","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100068},{"clinic":"Cildiye","name":"Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.000 / 2.000 / 3.000 TL","cashOnly":false,"id":100069},{"clinic":"Cildiye","name":"Kriyo + Küretaj","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 2.000 / 3.000 / 4.000 TL","cashOnly":false,"id":100070},{"clinic":"Cildiye","name":"ILS","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100071},{"clinic":"Cildiye","name":"Elektrokoter","sgkPrice":null,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Liste fiyatları: 1.500 / 2.500 / 3.500 TL","cashOnly":false,"id":100072},{"clinic":"Cildiye","name":"Shave Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":5000,"maxPrice":null,"description":"","cashOnly":false,"id":100073},{"clinic":"Cildiye","name":"Punch Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":6000,"maxPrice":null,"description":"","cashOnly":false,"id":100074},{"clinic":"Cildiye","name":"Punch Biyopsi + IF","sgkPrice":null,"privatePrice":null,"minPrice":8000,"maxPrice":null,"description":"","cashOnly":false,"id":100075},{"clinic":"Cildiye","name":"Eksizyonel Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":null,"description":"","cashOnly":false,"id":100076},{"clinic":"Cildiye","name":"İntralezyonel Enjeksiyon","sgkPrice":null,"privatePrice":null,"minPrice":2500,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100077},{"clinic":"Genel Cerrahi","name":"Meme CA (MRM) Operasyonu","sgkPrice":220000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100078},{"clinic":"Genel Cerrahi","name":"Meme CA (Meme Koruyucu Cerrahi)","sgkPrice":275000,"privatePrice":350000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100079},{"clinic":"Genel Cerrahi","name":"Kolostomi Açma / Kapama","sgkPrice":220000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100080},{"clinic":"Genel Cerrahi","name":"Mide Perforasyonu Operasyonu","sgkPrice":175000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100081},{"clinic":"Genel Cerrahi","name":"İleus Operasyonu","sgkPrice":175000,"privatePrice":300000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100082},{"clinic":"Genel Cerrahi","name":"Laparoskopik Kolesistektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"Yoğun bakım ve fazla yatış ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100083},{"clinic":"Genel Cerrahi","name":"İnsizyonel Herni Onarımı","sgkPrice":100000,"privatePrice":120000,"minPrice":null,"maxPrice":null,"description":"SGK 100–220 bin; ücretli 120–300 bin. Yoğun bakım ve fazla yatış ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100084},{"clinic":"Genel Cerrahi","name":"Açık İnguinal Herni Onarımı","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100085},{"clinic":"Genel Cerrahi","name":"Umbilikal Herni Onarımı","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"SGK 50–150 bin; ücretli 100–175 bin. Preop tetkikler hariçtir.","cashOnly":false,"id":100086},{"clinic":"Genel Cerrahi","name":"Apendektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":"SGK 60–120 bin; ücretli 100–140 bin. Preop tetkikler hariçtir.","cashOnly":false,"id":100087},{"clinic":"Genel Cerrahi","name":"Pilonidal Sinüs Eksizyonu","sgkPrice":50000,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100088},{"clinic":"Genel Cerrahi","name":"Limberg Flep Uygulaması","sgkPrice":60000,"privatePrice":85000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100089},{"clinic":"Genel Cerrahi","name":"Kristalize Fenol Uygulaması","sgkPrice":20000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100090},{"clinic":"Genel Cerrahi","name":"Hemoroidektomi","sgkPrice":60000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100091},{"clinic":"Genel Cerrahi","name":"Longo (Stapler Hemoroidopeksi)","sgkPrice":100000,"privatePrice":125000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100092},{"clinic":"Genel Cerrahi","name":"Lazer Hemoroidopeksi","sgkPrice":80000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100093},{"clinic":"Genel Cerrahi","name":"Sfinkterotomi","sgkPrice":50000,"privatePrice":100000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100094},{"clinic":"Genel Cerrahi","name":"Fistülotomi / Fistülektomi","sgkPrice":75000,"privatePrice":120000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100095},{"clinic":"Genel Cerrahi","name":"Perianal Apse Drenajı","sgkPrice":75000,"privatePrice":140000,"minPrice":null,"maxPrice":null,"description":" Preop tetkikler hariçtir.","cashOnly":false,"id":100096},{"clinic":"Genel Cerrahi","name":"Memeden Kitle Eksizyonu / Biyopsi","sgkPrice":35000,"privatePrice":45000,"minPrice":null,"maxPrice":null,"description":"Yatış ve anestezi ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100097},{"clinic":"Genel Cerrahi","name":"Küçük Lokaller","sgkPrice":6000,"privatePrice":12000,"minPrice":null,"maxPrice":null,"description":"SGK 6–12 bin; ücretli 12–25 bin. Yatış ve anestezi ilave. Preop tetkikler hariçtir.","cashOnly":false,"id":100098},{"clinic":"Göz Hastalıkları","name":"Katarakt","sgkPrice":30000,"privatePrice":45000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 45.000 TL.","cashOnly":false,"id":100099},{"clinic":"Göz Hastalıkları","name":"YAG Lazer","sgkPrice":15000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 20.000 TL.","cashOnly":false,"id":100100},{"clinic":"Göz Hastalıkları","name":"Şalazyon","sgkPrice":15000,"privatePrice":20000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 20.000 TL.","cashOnly":false,"id":100101},{"clinic":"Göz Hastalıkları","name":"Pterjium","sgkPrice":24000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Yurtdışı 30.000 TL.","cashOnly":false,"id":100102},{"clinic":"Göz Hastalıkları","name":"Akıllı Lens","sgkPrice":null,"privatePrice":140000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100103},{"clinic":"Göz Hastalıkları","name":"Üst Göz Kapağı","sgkPrice":null,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100104},{"clinic":"Göz Hastalıkları","name":"Alt Göz Kapağı","sgkPrice":null,"privatePrice":65000,"minPrice":null,"maxPrice":null,"description":"El yazısı fiyat.","cashOnly":false,"id":100105},{"clinic":"Göz Hastalıkları","name":"DSR","sgkPrice":null,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Anestezi dahil notu mevcut.","cashOnly":false,"id":100106},{"clinic":"Plastik Cerrahi","name":"Rinoplasti","sgkPrice":null,"privatePrice":null,"minPrice":80000,"maxPrice":null,"description":"","cashOnly":false,"id":100107},{"clinic":"Plastik Cerrahi","name":"Meme Büyütme","sgkPrice":null,"privatePrice":null,"minPrice":120000,"maxPrice":140000,"description":"","cashOnly":false,"id":100108},{"clinic":"Plastik Cerrahi","name":"Meme Büyütme ve Dikleştirme","sgkPrice":null,"privatePrice":null,"minPrice":160000,"maxPrice":180000,"description":"","cashOnly":false,"id":100109},{"clinic":"Plastik Cerrahi","name":"Meme Küçültme","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100110},{"clinic":"Plastik Cerrahi","name":"Karın Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100111},{"clinic":"Plastik Cerrahi","name":"Gıdı Liposuction","sgkPrice":null,"privatePrice":null,"minPrice":35000,"maxPrice":null,"description":"","cashOnly":false,"id":100112},{"clinic":"Plastik Cerrahi","name":"Liposuction (2 Bölge)","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":null,"description":"","cashOnly":false,"id":100113},{"clinic":"Plastik Cerrahi","name":"Liposuction (3 Bölge)","sgkPrice":null,"privatePrice":null,"minPrice":75000,"maxPrice":null,"description":"","cashOnly":false,"id":100114},{"clinic":"Plastik Cerrahi","name":"Kol Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100115},{"clinic":"Plastik Cerrahi","name":"Uyluk Germe","sgkPrice":null,"privatePrice":null,"minPrice":125000,"maxPrice":null,"description":"","cashOnly":false,"id":100116},{"clinic":"Plastik Cerrahi","name":"Jinekomasti","sgkPrice":null,"privatePrice":null,"minPrice":70000,"maxPrice":null,"description":"","cashOnly":false,"id":100117},{"clinic":"Plastik Cerrahi","name":"Yüz Germe","sgkPrice":null,"privatePrice":null,"minPrice":175000,"maxPrice":null,"description":"","cashOnly":false,"id":100118},{"clinic":"Plastik Cerrahi","name":"Temporal Lift","sgkPrice":null,"privatePrice":null,"minPrice":80000,"maxPrice":null,"description":"","cashOnly":false,"id":100119},{"clinic":"Plastik Cerrahi","name":"Üst Göz Kapağı Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":35000,"maxPrice":null,"description":"","cashOnly":false,"id":100120},{"clinic":"Plastik Cerrahi","name":"Alt Göz Kapağı Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":null,"description":"","cashOnly":false,"id":100121},{"clinic":"Plastik Cerrahi","name":"Dört Kapak Blefaroplasti","sgkPrice":null,"privatePrice":null,"minPrice":75000,"maxPrice":null,"description":"","cashOnly":false,"id":100122},{"clinic":"Plastik Cerrahi","name":"Kepçe Kulak Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":65000,"maxPrice":null,"description":"","cashOnly":false,"id":100123},{"clinic":"Plastik Cerrahi","name":"Botoks","sgkPrice":null,"privatePrice":null,"minPrice":7500,"maxPrice":null,"description":"","cashOnly":false,"id":100124},{"clinic":"Plastik Cerrahi","name":"Dolgu","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":null,"description":"","cashOnly":false,"id":100125},{"clinic":"Plastik Cerrahi","name":"Greft / Flep","sgkPrice":null,"privatePrice":null,"minPrice":50000,"maxPrice":60000,"description":"","cashOnly":false,"id":100126},{"clinic":"Plastik Cerrahi","name":"Biyopsi","sgkPrice":null,"privatePrice":null,"minPrice":10000,"maxPrice":15000,"description":"","cashOnly":false,"id":100127},{"clinic":"Çocuk Cerrahisi","name":"Sünnet (Genel)","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620731 • Kurumsal fiyat.","cashOnly":false,"id":100128},{"clinic":"Çocuk Cerrahisi","name":"Sünnet (Lokal, Çocuk)","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620732 • Kurumsal fiyat.","cashOnly":false,"id":100129},{"clinic":"Çocuk Cerrahisi","name":"Apendektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620100","cashOnly":false,"id":100130},{"clinic":"Çocuk Cerrahisi","name":"Testis Detorsiyonu ve Orşiopeksi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620110","cashOnly":false,"id":100131},{"clinic":"Çocuk Cerrahisi","name":"Skrotal Orşiektomi (Tek)","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620120","cashOnly":false,"id":100132},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı (Bilateral)","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620130","cashOnly":false,"id":100133},{"clinic":"Çocuk Cerrahisi","name":"İnmemiş Testis (Cilt Tarafı)","sgkPrice":50000,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Kod: P621250","cashOnly":false,"id":100134},{"clinic":"Çocuk Cerrahisi","name":"Hidroselektomi, Tek Taraf","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620300","cashOnly":false,"id":100135},{"clinic":"Çocuk Cerrahisi","name":"Hidroselektomi ve Herniyopeksi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620310","cashOnly":false,"id":100136},{"clinic":"Çocuk Cerrahisi","name":"Hipospadias Onarımı, Distal","sgkPrice":50000,"privatePrice":60000,"minPrice":null,"maxPrice":null,"description":"Kod: P620320","cashOnly":false,"id":100137},{"clinic":"Çocuk Cerrahisi","name":"Labial Füzyon Açılması, Lokal","sgkPrice":3000,"privatePrice":5000,"minPrice":null,"maxPrice":null,"description":"Kod: P620330","cashOnly":false,"id":100138},{"clinic":"Çocuk Cerrahisi","name":"Karaciğer Kist Hidatiğinde Kistotomi","sgkPrice":80000,"privatePrice":90000,"minPrice":null,"maxPrice":null,"description":"Kod: P620400 • 5 yaşına kadar notu mevcut.","cashOnly":false,"id":100139},{"clinic":"Çocuk Cerrahisi","name":"Ovarial veya Paraovarial Kist Eksizyonu","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"Kod: P620420","cashOnly":false,"id":100140},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik Varikoselektomi","sgkPrice":70000,"privatePrice":80000,"minPrice":null,"maxPrice":null,"description":"Kod: P621620","cashOnly":false,"id":100141},{"clinic":"Çocuk Cerrahisi","name":"Varikoselektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P621770","cashOnly":false,"id":100142},{"clinic":"Çocuk Cerrahisi","name":"Tanısal Sistoskopi","sgkPrice":25000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P619530","cashOnly":false,"id":100143},{"clinic":"Çocuk Cerrahisi","name":"Bronkoskopi, Yabancı Cisim Çıkarılması","sgkPrice":80000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620820 • Özel fiyat net okunamadı.","cashOnly":false,"id":100144},{"clinic":"Çocuk Cerrahisi","name":"Meatotomi / Meatoplasti","sgkPrice":20000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P620910 • İşlem adı el yazısıyla düzeltilmiş.","cashOnly":false,"id":100145},{"clinic":"Çocuk Cerrahisi","name":"Üretra Dilatasyonu","sgkPrice":20000,"privatePrice":30000,"minPrice":null,"maxPrice":null,"description":"Kod: P619750","cashOnly":false,"id":100146},{"clinic":"Çocuk Cerrahisi","name":"Perianal Apse Drenajı","sgkPrice":15000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P601710","cashOnly":false,"id":100147},{"clinic":"Çocuk Cerrahisi","name":"Pilonidal Sinüs Lazer","sgkPrice":50000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100148},{"clinic":"Çocuk Cerrahisi","name":"İnguinal Herni Onarımı (Açık)","sgkPrice":60000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100149},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnguinal Herni Onarımı, Tek Taraf","sgkPrice":45000,"privatePrice":55000,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100150},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnguinal Herni Onarımı, Çift Taraf","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"","cashOnly":false,"id":100151},{"clinic":"Çocuk Cerrahisi","name":"Ladd Bant Eksizyonu / Malrotasyon","sgkPrice":90000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620500","cashOnly":false,"id":100152},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz Umbilikal Herni Onarımı","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620600 • Göbek fıtığı.","cashOnly":false,"id":100153},{"clinic":"Çocuk Cerrahisi","name":"Servikal Lenf Nodu Diseksiyonu","sgkPrice":25000,"privatePrice":35000,"minPrice":null,"maxPrice":null,"description":"Kod: P620440","cashOnly":false,"id":100154},{"clinic":"Çocuk Cerrahisi","name":"Trakeotomi","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620470","cashOnly":false,"id":100155},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı, Tek Taraf","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P620730 • Kasık fıtığı.","cashOnly":false,"id":100156},{"clinic":"Çocuk Cerrahisi","name":"İnmemiş Testis (Tek Taraflı)","sgkPrice":30000,"privatePrice":40000,"minPrice":null,"maxPrice":null,"description":"Kod: P621550","cashOnly":false,"id":100157},{"clinic":"Çocuk Cerrahisi","name":"Greftsiz İnguinal Herni Onarımı, İnkarsere veya Strangüle","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620760","cashOnly":false,"id":100158},{"clinic":"Çocuk Cerrahisi","name":"Frenulum Linguae Plastiği (Basit Dilbağı)","sgkPrice":5000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620770","cashOnly":false,"id":100159},{"clinic":"Çocuk Cerrahisi","name":"Hipertrofik Lingual Frenulum Düzeltilmesi (İleri)","sgkPrice":10000,"privatePrice":null,"minPrice":null,"maxPrice":null,"description":"Kod: P620830","cashOnly":false,"id":100160},{"clinic":"Çocuk Cerrahisi","name":"Meckel Divertikülü","sgkPrice":60000,"privatePrice":70000,"minPrice":null,"maxPrice":null,"description":"Kod: P620900 • 5 yaşına kadar notu mevcut.","cashOnly":false,"id":100161},{"clinic":"Çocuk Cerrahisi","name":"Memeden Kist / Benign Tümör Çıkarılması","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P620730 • Kod görüntüde bu şekilde yazılı.","cashOnly":false,"id":100162},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik Apendektomi","sgkPrice":40000,"privatePrice":50000,"minPrice":null,"maxPrice":null,"description":"Kod: P610131","cashOnly":false,"id":100163},{"clinic":"Çocuk Cerrahisi","name":"Laparoskopik İnmemiş Testis","sgkPrice":70000,"privatePrice":80000,"minPrice":null,"maxPrice":null,"description":"Kod: P621600 • Anestezi notu mevcut.","cashOnly":false,"id":100164},{"clinic":"Ortopedi","name":"Diz Artroskopisi - Menisküs Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":130000,"maxPrice":180000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200001},{"clinic":"Ortopedi","name":"Diz Artroskopisi - Ön Çapraz Bağ ve Menisküs Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":150000,"maxPrice":200000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200002},{"clinic":"Ortopedi","name":"Omuz Artroskopisi - Tendon Tamiri","sgkPrice":null,"privatePrice":null,"minPrice":130000,"maxPrice":200000,"description":"Dikiş sayısına göre fiyat değişebilir.","cashOnly":false,"id":200003},{"clinic":"Ortopedi","name":"Omuz Artroskopisi - Bankart Onarımı","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":null,"description":"Tekrarlayan omuz çıkıklarında.","cashOnly":false,"id":200004},{"clinic":"Ortopedi","name":"Kalça Kırığı - PFNA","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":200000,"description":"Yaklaşık 2 gece yatış ve 2 ünite kan ihtiyacı olabilir.","cashOnly":false,"id":200005},{"clinic":"Ortopedi","name":"Kalça Kırığı - Bipolar Kalça Protezi","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":200000,"description":"Yaklaşık 2 gece yatış ve 2 ünite kan ihtiyacı olabilir.","cashOnly":false,"id":200006},{"clinic":"Ortopedi","name":"Tırnak Yatağı Revizyonu","sgkPrice":null,"privatePrice":null,"minPrice":20000,"maxPrice":null,"description":"","cashOnly":false,"id":200007},{"clinic":"Ortopedi","name":"Çocuklarda Kapalı Redüksiyon ve Alçılama","sgkPrice":null,"privatePrice":null,"minPrice":30000,"maxPrice":50000,"description":"Çocuk kırıklarında.","cashOnly":false,"id":200008},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 1. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":100000,"maxPrice":120000,"description":"","cashOnly":false,"id":200009},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 2. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":140000,"maxPrice":180000,"description":"","cashOnly":false,"id":200010},{"clinic":"Ortopedi","name":"Erişkin Kırıklar - 3. Seviye","sgkPrice":null,"privatePrice":null,"minPrice":250000,"maxPrice":300000,"description":"","cashOnly":false,"id":200011},{"clinic":"Ortopedi","name":"Klasik Diz Protezi","sgkPrice":null,"privatePrice":null,"minPrice":180000,"maxPrice":null,"description":"","cashOnly":false,"id":200012},{"clinic":"Ortopedi","name":"Robotik Diz Protezi","sgkPrice":null,"privatePrice":null,"minPrice":200000,"maxPrice":null,"description":"","cashOnly":false,"id":200013}];
const COLLECTION_NAME = "surgeryPrices";
const userProfiles = new UserProfileRepository(db);
const pendingUsers = new PendingUserRepository(db);
const userInvitations = new UserInvitationRepository(db);

const BRANCH_UPDATE_VERSION = "2026-08-07-uzman-kbb-2";
const BRANCH_SEED = [{"id":310001,"clinic":"Kalp ve Damar Cerrahisi","name":"Karotis Endarterektomi","minPrice":120000,"maxPrice":130000,"sgkPrice":null,"privatePrice":null,"description":"Sağ veya sol karotis arter için uygulanabilir. Doktor değerlendirmesine göre fiyat güncellenebilir.","cashOnly":false},{"id":310002,"clinic":"Kalp ve Damar Cerrahisi","name":"CABG (Koroner Arter Bypass Greftleme)","minPrice":120000,"maxPrice":160000,"sgkPrice":null,"privatePrice":null,"description":"Greft sayısı, ek girişimler ve vaka özelliklerine göre fiyat değişebilir.","cashOnly":false},{"id":310003,"clinic":"Kalp ve Damar Cerrahisi","name":"EVLA (Endovenöz Lazer Ablasyon)","minPrice":110000,"maxPrice":130000,"sgkPrice":null,"privatePrice":null,"description":"Paket fiyatıdır. Taraf ve uygulanacak damar sayısına göre değerlendirilir.","cashOnly":false},{"id":310004,"clinic":"Kalp ve Damar Cerrahisi","name":"Periferik Anjiyografi","minPrice":35000,"maxPrice":45000,"sgkPrice":null,"privatePrice":null,"description":"Balon adet: 35.000 TL. Stent adet: 45.000 TL. Kullanılan adet ve ek sarflara göre toplam fiyat değişebilir.","cashOnly":false},{"id":310005,"clinic":"Kalp ve Damar Cerrahisi","name":"Femoro-Popliteal Bypass","minPrice":120000,"maxPrice":120000,"sgkPrice":null,"privatePrice":null,"description":"Greft ve vaka özelliklerine göre doktor değerlendirmesi gerekebilir.","cashOnly":true},{"id":310006,"clinic":"Kalp ve Damar Cerrahisi","name":"Embolektomi","minPrice":140000,"maxPrice":140000,"sgkPrice":null,"privatePrice":null,"description":"Damar bölgesi ve ek girişim ihtiyacına göre değerlendirilir.","cashOnly":true},{"id":310007,"clinic":"Kalp ve Damar Cerrahisi","name":"AVR (Aort Kapak Replasmanı)","minPrice":150000,"maxPrice":170000,"sgkPrice":null,"privatePrice":null,"description":"Protez kapak tipi ve ek girişimlere göre fiyat değişebilir.","cashOnly":false},{"id":310008,"clinic":"Kalp ve Damar Cerrahisi","name":"MVR (Mitral Kapak Replasmanı)","minPrice":150000,"maxPrice":170000,"sgkPrice":null,"privatePrice":null,"description":"Protez kapak tipi ve ek girişimlere göre fiyat değişebilir.","cashOnly":false},{"id":310009,"clinic":"Kalp ve Damar Cerrahisi","name":"MVR + AVR","minPrice":260000,"maxPrice":360000,"sgkPrice":null,"privatePrice":null,"description":"Kombine kapak cerrahisidir. Protez tipi ve ek girişimlere göre fiyat değişebilir.","cashOnly":false},{"id":320001,"clinic":"Beyin ve Sinir Cerrahisi","name":"TFESİ (Transforaminal Epidural Steroid Enjeksiyonu)","minPrice":22000,"maxPrice":35000,"sgkPrice":null,"privatePrice":null,"description":"Tek veya çok seviyeli uygulanabilir. İlaç, seviye ve sarf durumuna göre fiyat değişebilir.","cashOnly":false},{"id":320002,"clinic":"Beyin ve Sinir Cerrahisi","name":"Lomber Mikrodiskektomi (Tek Seviye)","minPrice":130000,"maxPrice":145000,"sgkPrice":null,"privatePrice":null,"description":"L3-4, L4-5 veya L5-S1 seviyelerinde uygulanabilir. Sağ veya sol taraf olması fiyatı değiştirmez. Tek seviye cerrahi için geçerlidir.","cashOnly":false},{"id":320003,"clinic":"Beyin ve Sinir Cerrahisi","name":"Lomber Mikrodiskektomi (Çift Seviye)","minPrice":230000,"maxPrice":270000,"sgkPrice":null,"privatePrice":null,"description":"Aynı seansta iki lomber seviyeye uygulanan mikrodiskektomi için geçerlidir.","cashOnly":false},{"id":320004,"clinic":"Beyin ve Sinir Cerrahisi","name":"Servikal Disk Cerrahisi (Tek Seviye)","minPrice":135000,"maxPrice":145000,"sgkPrice":null,"privatePrice":null,"description":"C3-4, C4-5, C5-6 veya C6-7 seviyelerinde uygulanabilir. Tek seviye cerrahi için geçerlidir.","cashOnly":false},{"id":320005,"clinic":"Beyin ve Sinir Cerrahisi","name":"Servikal Disk Cerrahisi (Çift Seviye)","minPrice":150000,"maxPrice":230000,"sgkPrice":null,"privatePrice":null,"description":"Aynı seansta iki servikal seviyeye uygulanan cerrahi için geçerlidir.","cashOnly":false},{"id":320006,"clinic":"Beyin ve Sinir Cerrahisi","name":"Vertebroplasti (Tek Seviye)","minPrice":120000,"maxPrice":145000,"sgkPrice":null,"privatePrice":null,"description":"Torakal veya lomber tek vertebra seviyesine uygulanan işlem için geçerlidir.","cashOnly":false},{"id":320007,"clinic":"Beyin ve Sinir Cerrahisi","name":"Vertebroplasti (Çoklu Seviye)","minPrice":170000,"maxPrice":230000,"sgkPrice":null,"privatePrice":null,"description":"İki veya daha fazla vertebra seviyesine uygulanan işlem için geçerlidir.","cashOnly":false},{"id":320008,"clinic":"Beyin ve Sinir Cerrahisi","name":"Spinal Stenoz Dekompresyonu","minPrice":190000,"maxPrice":320000,"sgkPrice":null,"privatePrice":null,"description":"Seviye sayısı, cerrahi teknik ve ek stabilizasyon ihtiyacına göre fiyat değişebilir.","cashOnly":false},{"id":320009,"clinic":"Beyin ve Sinir Cerrahisi","name":"Spondilolistezis Cerrahisi","minPrice":250000,"maxPrice":395000,"sgkPrice":null,"privatePrice":null,"description":"Seviye, füzyon ve implant ihtiyacına göre fiyat değişebilir.","cashOnly":false},{"id":320010,"clinic":"Beyin ve Sinir Cerrahisi","name":"Stabilizasyon + Füzyon","minPrice":285000,"maxPrice":450000,"sgkPrice":null,"privatePrice":null,"description":"Kullanılan implant sayısı, cerrahi seviye ve tekniğe göre fiyat değişebilir.","cashOnly":false},{"id":320011,"clinic":"Beyin ve Sinir Cerrahisi","name":"Laminektomi","minPrice":140000,"maxPrice":140000,"sgkPrice":null,"privatePrice":null,"description":"Tek seviye laminektomi için başlangıç fiyatıdır. Çoklu seviyelerde yeniden değerlendirilir.","cashOnly":false},{"id":320012,"clinic":"Beyin ve Sinir Cerrahisi","name":"Radyofrekans (RF)","minPrice":85000,"maxPrice":100000,"sgkPrice":null,"privatePrice":null,"description":"Ağrı tedavisine yönelik radyofrekans uygulamasıdır. Bölge ve seviye sayısına göre değişebilir.","cashOnly":false},{"id":320013,"clinic":"Beyin ve Sinir Cerrahisi","name":"Bel Enjeksiyonu","minPrice":32000,"maxPrice":32000,"sgkPrice":null,"privatePrice":null,"description":"Bel bölgesine yapılan enjeksiyon işlemleri için başlangıç fiyatıdır.","cashOnly":false},{"id":330001,"clinic":"KBB","name":"Septoplasti","minPrice":50000,"maxPrice":55000,"sgkPrice":null,"privatePrice":null,"description":"Septum deviasyonuna yönelik fonksiyonel burun cerrahisidir.","cashOnly":false},{"id":330002,"clinic":"KBB","name":"Septoplasti + Konka RF","minPrice":50000,"maxPrice":55000,"sgkPrice":null,"privatePrice":null,"description":"Septoplasti ile birlikte alt konkalara radyofrekans uygulamasını içerir.","cashOnly":false},{"id":330003,"clinic":"KBB","name":"Septoplasti + Konka Cerrahisi + Bülloza Rezeksiyonu","minPrice":75000,"maxPrice":75000,"sgkPrice":null,"privatePrice":null,"description":"Genişletilmiş fonksiyonel nazal cerrahi paketidir.","cashOnly":false},{"id":330004,"clinic":"KBB","name":"Fonksiyonel Septorinoplasti","minPrice":65000,"maxPrice":80000,"sgkPrice":null,"privatePrice":null,"description":"Fonksiyonel solunum problemi öncelikli septorinoplasti işlemidir.","cashOnly":false},{"id":330005,"clinic":"KBB","name":"Açık Teknik Rinoplasti","minPrice":80000,"maxPrice":90000,"sgkPrice":null,"privatePrice":null,"description":"Açık teknik estetik rinoplasti işlemidir.","cashOnly":false},{"id":330006,"clinic":"KBB","name":"Total Septal Rekonstrüksiyon (+ Gerekirse Kosta Grefti)","minPrice":200000,"maxPrice":200000,"sgkPrice":null,"privatePrice":null,"description":"İleri septal deformitelerde uygulanır. Gerekirse kosta grefti kullanılabilir.","cashOnly":false},{"id":330007,"clinic":"KBB","name":"Adenoidektomi","minPrice":40000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Geniz eti ameliyatıdır.","cashOnly":false},{"id":330008,"clinic":"KBB","name":"Tonsillektomi","minPrice":50000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Bademcik ameliyatıdır.","cashOnly":false},{"id":330009,"clinic":"KBB","name":"Adenotonsillektomi","minPrice":45000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Adenoidektomi ve tonsillektominin aynı seansta uygulanmasıdır.","cashOnly":false},{"id":330010,"clinic":"KBB","name":"FESS (Endoskopik Sinüs Cerrahisi)","minPrice":55000,"maxPrice":90000,"sgkPrice":null,"privatePrice":null,"description":"Frontal, maksiller, etmoid veya sfenoid sinüslere uygulanabilir. Tutulan sinüs sayısına göre fiyat değişebilir.","cashOnly":false},{"id":330011,"clinic":"KBB","name":"Konka RF","minPrice":30000,"maxPrice":30000,"sgkPrice":null,"privatePrice":null,"description":"Alt konkalara radyofrekans ile küçültme uygulamasıdır.","cashOnly":false},{"id":330012,"clinic":"KBB","name":"Burun Kitle Eksizyonu","minPrice":30000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Kitlenin yerleşimi, büyüklüğü ve cerrahi tekniğe göre fiyat değişebilir.","cashOnly":false},{"id":330013,"clinic":"KBB","name":"Nazofarenks Biyopsisi","minPrice":100000,"maxPrice":100000,"sgkPrice":null,"privatePrice":null,"description":"Gerekirse mikrolaringoskopi ile kombine edilebilir.","cashOnly":false},{"id":330014,"clinic":"KBB","name":"Larenks / Vokal Kord Lezyon Eksizyonu","minPrice":18000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"Lezyonun yeri, büyüklüğü ve uygulanacak tekniğe göre fiyat değişebilir.","cashOnly":false},{"id":340001,"clinic":"Üroloji","name":"ESWL (Taş Kırma)","minPrice":20000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"3 seans paket olarak değerlendirilebilir. Devam eden her seans için 5.000 TL ek ücret uygulanabilir.","cashOnly":false},{"id":340002,"clinic":"Üroloji","name":"URS + DJ Stent","minPrice":75000,"maxPrice":120000,"sgkPrice":null,"privatePrice":null,"description":"Tek taraflı endoskopik üreter taşı girişimi ve DJ stent uygulaması. Taşın yeri ve işlem kapsamına göre fiyat değişebilir.","cashOnly":false},{"id":340003,"clinic":"Üroloji","name":"Bilateral URS + DJ Stent","minPrice":180000,"maxPrice":200000,"sgkPrice":null,"privatePrice":null,"description":"İki taraflı endoskopik üreter taşı girişimi ve DJ stent uygulaması.","cashOnly":false},{"id":340004,"clinic":"Üroloji","name":"Endoskopik Üreter Taşı Cerrahisi (URS)","minPrice":65000,"maxPrice":145000,"sgkPrice":null,"privatePrice":null,"description":"Taşın seviyesi, büyüklüğü ve DJ stent gereksinimine göre fiyat değişebilir.","cashOnly":false},{"id":340005,"clinic":"Üroloji","name":"Sistolitotomi + DJ Stent","minPrice":200000,"maxPrice":200000,"sgkPrice":null,"privatePrice":null,"description":"Mesane taşı cerrahisi ile birlikte DJ stent uygulamasıdır.","cashOnly":false},{"id":340006,"clinic":"Üroloji","name":"TUR-M (3 cm ve Altı)","minPrice":55000,"maxPrice":80000,"sgkPrice":null,"privatePrice":null,"description":"Mesane tümörünün transüretral rezeksiyonu. Tümör sayısı ve işlem kapsamına göre fiyat değişebilir.","cashOnly":false},{"id":340007,"clinic":"Üroloji","name":"TUR-M (3 cm Üzeri)","minPrice":120000,"maxPrice":185000,"sgkPrice":null,"privatePrice":null,"description":"3 cm üzerindeki mesane tümörünün transüretral rezeksiyonu. İşlem kapsamına göre fiyat değişebilir.","cashOnly":false},{"id":340008,"clinic":"Üroloji","name":"TUR-P","minPrice":180000,"maxPrice":180000,"sgkPrice":null,"privatePrice":null,"description":"Prostatın transüretral rezeksiyonu.","cashOnly":false},{"id":340009,"clinic":"Üroloji","name":"Prostat İğne Biyopsisi","minPrice":60000,"maxPrice":70000,"sgkPrice":null,"privatePrice":null,"description":"Anestezi, sedasyon ve ek hizmetlere göre fiyat değişebilir.","cashOnly":false},{"id":340010,"clinic":"Üroloji","name":"Varikoselektomi","minPrice":65000,"maxPrice":75000,"sgkPrice":null,"privatePrice":null,"description":"Preoperatif hazırlığın kapsamına göre fiyat değişebilir.","cashOnly":false},{"id":340011,"clinic":"Üroloji","name":"Radikal Orşiektomi","minPrice":60000,"maxPrice":60000,"sgkPrice":null,"privatePrice":null,"description":"Tek taraflı işlem için değerlendirilmiştir.","cashOnly":false},{"id":340012,"clinic":"Üroloji","name":"Kondilom Koterizasyonu","minPrice":24500,"maxPrice":35000,"sgkPrice":null,"privatePrice":null,"description":"Lezyon sayısı ve yaygınlığına göre fiyat değişebilir.","cashOnly":false},{"id":340013,"clinic":"Üroloji","name":"Sünnet","minPrice":25000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Anestezi yöntemi ve işlem koşullarına göre fiyat değişebilir.","cashOnly":false},{"id":340014,"clinic":"Üroloji","name":"DJ Stent Çıkarılması","minPrice":25000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"Endoskopik DJ stent çıkarılması işlemidir.","cashOnly":false},{"id":350001,"clinic":"Kadın Hastalıkları ve Doğum","name":"Kolposkopi + Siğil Eksizyonu","minPrice":40000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Kolposkopi ile birlikte siğil eksizyonunun yapıldığı kombine işlemdir.","cashOnly":false},{"id":350002,"clinic":"Kadın Hastalıkları ve Doğum","name":"Endometriyal Biyopsi + Koterizasyon","minPrice":50000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Endometriyal biyopsi ile koterizasyonun aynı seansta uygulandığı kombine işlemdir.","cashOnly":false},{"id":350003,"clinic":"Kadın Hastalıkları ve Doğum","name":"PC + ECC","minPrice":30000,"maxPrice":45000,"sgkPrice":null,"privatePrice":null,"description":"Servikal değerlendirme işlemi. İşlem kapsamına göre fiyat değişebilir.","cashOnly":false},{"id":350004,"clinic":"Kadın Hastalıkları ve Doğum","name":"PC + ECC + Servikal İşlem","minPrice":40000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"PC ve ECC ile birlikte ek servikal işlemin uygulandığı kombine işlemdir.","cashOnly":false},{"id":350005,"clinic":"Kadın Hastalıkları ve Doğum","name":"Hymenoplasti","minPrice":50000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":350006,"clinic":"Kadın Hastalıkları ve Doğum","name":"Labioplasti + Vajinoplasti","minPrice":195000,"maxPrice":195000,"sgkPrice":null,"privatePrice":null,"description":"Kombine genital estetik işlemdir.","cashOnly":false},{"id":350007,"clinic":"Kadın Hastalıkları ve Doğum","name":"Mirena Takılması + PC/ECC","minPrice":43000,"maxPrice":43000,"sgkPrice":null,"privatePrice":null,"description":"Mirena uygulaması ile PC/ECC işleminin aynı seansta yapılmasıdır.","cashOnly":false},{"id":350008,"clinic":"Kadın Hastalıkları ve Doğum","name":"Vulva Lezyonu Eksizyonu","minPrice":25000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"Lezyonun boyutu ve yerleşimine göre yeniden değerlendirilebilir.","cashOnly":false},{"id":360001,"clinic":"Plastik Cerrahi","name":"Apse Drenajı","minPrice":15000,"maxPrice":35000,"sgkPrice":null,"privatePrice":null,"description":"Lokalizasyon, yaygınlık ve anestezi yöntemine göre fiyat değişebilir.","cashOnly":false},{"id":360002,"clinic":"Plastik Cerrahi","name":"Benign Kitle Eksizyonu","minPrice":10000,"maxPrice":20000,"sgkPrice":null,"privatePrice":null,"description":"Kitlenin boyutu, sayısı ve lokalizasyonuna göre fiyat değişebilir.","cashOnly":false},{"id":360003,"clinic":"Plastik Cerrahi","name":"Malign Kitle Eksizyonu","minPrice":35000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Gerekli greft veya flep işlemleri ayrıca değerlendirilir.","cashOnly":false},{"id":360004,"clinic":"Plastik Cerrahi","name":"Deri Biyopsisi","minPrice":20000,"maxPrice":20000,"sgkPrice":null,"privatePrice":null,"description":"Eksizyonel biyopsi olarak uygulanabilir.","cashOnly":false},{"id":360005,"clinic":"Plastik Cerrahi","name":"Dudak Tümörü Biyopsisi","minPrice":30000,"maxPrice":30000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":360006,"clinic":"Plastik Cerrahi","name":"Cilt Lezyonu Eksizyonu","minPrice":20000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"Lezyonun sayısı, boyutu ve lokalizasyonuna göre fiyat değişebilir.","cashOnly":false},{"id":360007,"clinic":"Plastik Cerrahi","name":"Parmak Cilt Lezyonu Eksizyonu","minPrice":20000,"maxPrice":20000,"sgkPrice":null,"privatePrice":null,"description":"Sedasyon veya ameliyathane gereksinimine göre değerlendirilir.","cashOnly":false},{"id":360008,"clinic":"Plastik Cerrahi","name":"El Kitle Eksizyonu","minPrice":15000,"maxPrice":17000,"sgkPrice":null,"privatePrice":null,"description":"Lokal anestezi ile uygulanabilir.","cashOnly":false},{"id":360009,"clinic":"Plastik Cerrahi","name":"Göz Kapağı Lokal Kitle Eksizyonu","minPrice":12000,"maxPrice":12000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":360010,"clinic":"Plastik Cerrahi","name":"Burun Malign Kitle Eksizyonu","minPrice":40000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Rekonstrüksiyon gereksinimine göre fiyat değişebilir.","cashOnly":false},{"id":360011,"clinic":"Plastik Cerrahi","name":"Şakak Germe + Blefaroplasti","minPrice":160000,"maxPrice":160000,"sgkPrice":null,"privatePrice":null,"description":"Kombine estetik işlemdir.","cashOnly":false},{"id":360012,"clinic":"Plastik Cerrahi","name":"Karın Germe + Bel Liposuction","minPrice":190000,"maxPrice":350000,"sgkPrice":null,"privatePrice":null,"description":"İşlem kapsamı ve liposuction bölgesine göre fiyat değişebilir.","cashOnly":false},{"id":360013,"clinic":"Plastik Cerrahi","name":"Meme Dikleştirme","minPrice":160000,"maxPrice":160000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":360014,"clinic":"Plastik Cerrahi","name":"Yanak Derin Kitle Eksizyonu","minPrice":55000,"maxPrice":80000,"sgkPrice":null,"privatePrice":null,"description":"Skar revizyonu veya rekonstrüksiyon ihtiyacına göre fiyat değişebilir.","cashOnly":false},{"id":360015,"clinic":"Plastik Cerrahi","name":"Tendon Kesisi Onarımı","minPrice":40000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"El cerrahisi kapsamında değerlendirilir.","cashOnly":false},{"id":360016,"clinic":"Plastik Cerrahi","name":"Parmak Doku Defekti Onarımı (Lokal Flep)","minPrice":65000,"maxPrice":70000,"sgkPrice":null,"privatePrice":null,"description":"Defektin büyüklüğü ve flep tipine göre fiyat değişebilir.","cashOnly":false},{"id":360017,"clinic":"Plastik Cerrahi","name":"El Açık Kırık Cerrahisi","minPrice":165000,"maxPrice":165000,"sgkPrice":null,"privatePrice":null,"description":"Preoperatif hazırlık dahil olarak değerlendirilmiştir.","cashOnly":false},{"id":360018,"clinic":"Plastik Cerrahi","name":"Amputasyon","minPrice":40000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Amputasyon seviyesi ve işlem kapsamına göre yeniden değerlendirilebilir.","cashOnly":false},{"id":360019,"clinic":"Plastik Cerrahi","name":"Greft Uygulaması","minPrice":50000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Eksizyon veya doku defekti sonrasında greft uygulamasıdır.","cashOnly":false},{"id":370001,"clinic":"Uzman KBB","name":"Maksilla / Mandibula Kırığı Açık Redüksiyon + İnternal Tespit","minPrice":65000,"maxPrice":68000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 63.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370002,"clinic":"Uzman KBB","name":"Maksilla / Mandibula Kırığı İnternal Tespit","minPrice":56000,"maxPrice":59000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 54.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370003,"clinic":"Uzman KBB","name":"Parsiyel Maksillektomi","minPrice":75000,"maxPrice":78000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 73.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370004,"clinic":"Uzman KBB","name":"Mandibula / Maksilla Ameloblastoma Rezeksiyonu","minPrice":65000,"maxPrice":68000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 63.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370005,"clinic":"Uzman KBB","name":"Blow-Out Orbita Tabanı Rekonstrüksiyonu","minPrice":79000,"maxPrice":82000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 77.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370006,"clinic":"Uzman KBB","name":"Embolizasyon","minPrice":37000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 35.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370007,"clinic":"Uzman KBB","name":"Frontal Kemik Kırığı Açık Redüksiyon + İnternal Tespit","minPrice":60000,"maxPrice":63000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 58.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370008,"clinic":"Uzman KBB","name":"Tiroglossal Kist / Fistül Eksizyonu","minPrice":61000,"maxPrice":64000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 59.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370009,"clinic":"Uzman KBB","name":"TMJ Luksasyonu Kapalı Redüksiyon","minPrice":16200,"maxPrice":19200,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 14.200 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370010,"clinic":"Uzman KBB","name":"Zigoma Kırığı Açık Redüksiyon + İnternal Tespit","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 49.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370011,"clinic":"Uzman KBB","name":"Zigoma Kırığı Kapalı Redüksiyon","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 28.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370012,"clinic":"Uzman KBB","name":"Total Septal Rekonstrüksiyon","minPrice":57000,"maxPrice":60000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 55.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370013,"clinic":"Uzman KBB","name":"Burun Dış Cerrahi Onarımı + Greft / Flep","minPrice":41000,"maxPrice":44000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 39.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370014,"clinic":"Uzman KBB","name":"Burun Eksternal Onarımı","minPrice":28000,"maxPrice":31000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 26.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370015,"clinic":"Uzman KBB","name":"Burun İçi Lokal Debridman","minPrice":28000,"maxPrice":31000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 26.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370016,"clinic":"Uzman KBB","name":"Konka Küçültülmesi (Radyofrekans / Plazma)","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 21.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370017,"clinic":"Uzman KBB","name":"Adenoidektomi","minPrice":34000,"maxPrice":37000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 32.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370018,"clinic":"Uzman KBB","name":"Adenoidektomi + Ventilasyon Tüpü","minPrice":42000,"maxPrice":45000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 40.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370019,"clinic":"Uzman KBB","name":"Tonsillektomi","minPrice":41000,"maxPrice":44000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 39.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370020,"clinic":"Uzman KBB","name":"Tonsillektomi + Adenoidektomi","minPrice":43000,"maxPrice":46000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 41.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370021,"clinic":"Uzman KBB","name":"Tonsillektomi + Ventilasyon Tüpü","minPrice":47000,"maxPrice":50000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 45.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370022,"clinic":"Uzman KBB","name":"Transpalatal İlerletme","minPrice":46000,"maxPrice":49000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 44.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370023,"clinic":"Uzman KBB","name":"Uvulektomi","minPrice":24000,"maxPrice":27000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 22.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370024,"clinic":"Uzman KBB","name":"Minör Tükürük Bezi Eksizyonu","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 28.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370025,"clinic":"Uzman KBB","name":"Parotidektomi (Total)","minPrice":93000,"maxPrice":96000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 91.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370026,"clinic":"Uzman KBB","name":"Parotidektomi (Yüzeyel)","minPrice":90000,"maxPrice":93000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 88.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370027,"clinic":"Uzman KBB","name":"Sialolitotomi","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 28.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370028,"clinic":"Uzman KBB","name":"Sublingual Tükürük Bezi Eksizyonu","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 42.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370029,"clinic":"Uzman KBB","name":"Submaksiller / Sublingual Apse Drenajı","minPrice":14000,"maxPrice":17000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 12.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370030,"clinic":"Uzman KBB","name":"Submandibuler Tükürük Bezi Eksizyonu","minPrice":46000,"maxPrice":49000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 44.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370031,"clinic":"Uzman KBB","name":"Tükürük Bezi Plastik Onarımı (Sialodokoplasti)","minPrice":41200,"maxPrice":44200,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 39.200 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370032,"clinic":"Uzman KBB","name":"Miringoplasti","minPrice":37000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 35.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370033,"clinic":"Uzman KBB","name":"Radikal / Modifiye Radikal Mastoidektomi","minPrice":70000,"maxPrice":73000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 68.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370034,"clinic":"Uzman KBB","name":"Stapedektomi","minPrice":67000,"maxPrice":70000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 65.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370035,"clinic":"Uzman KBB","name":"Timpanoplasti","minPrice":57000,"maxPrice":60000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 55.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370036,"clinic":"Uzman KBB","name":"Ventilasyon Tüpü – Tek Taraf (Genel Anestezi)","minPrice":18000,"maxPrice":21000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 16.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370037,"clinic":"Uzman KBB","name":"Ventilasyon Tüpü – Çift Taraf (Genel Anestezi)","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 28.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370038,"clinic":"Uzman KBB","name":"Ventilasyon Tüpü – Tek Taraf (Lokal)","minPrice":16000,"maxPrice":19000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 14.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370039,"clinic":"Uzman KBB","name":"Ventilasyon Tüpü – Çift Taraf (Lokal)","minPrice":27200,"maxPrice":30200,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 25.200 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370040,"clinic":"Uzman KBB","name":"Endoskopik Septoplasti","minPrice":41200,"maxPrice":44200,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 39.200 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370041,"clinic":"Uzman KBB","name":"Endoskopik Etmoid Sinüs Cerrahisi","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 49.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370042,"clinic":"Uzman KBB","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi (Bilateral)","minPrice":50000,"maxPrice":53000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 48.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370043,"clinic":"Uzman KBB","name":"Fonksiyonel Endoskopik Sinüs Cerrahisi (Tek Taraf)","minPrice":37000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 35.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370044,"clinic":"Uzman KBB","name":"Endoskopik Maksiller Sinüs Cerrahisi","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 28.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370045,"clinic":"Uzman KBB","name":"Burun Rekonstrüksiyonu (Parsiyel)","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 42.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370046,"clinic":"Uzman KBB","name":"Burun Rekonstrüksiyonu (Total)","minPrice":61000,"maxPrice":64000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 59.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":370047,"clinic":"Uzman KBB","name":"Burundan Yabancı Cisim Çıkarılması","minPrice":16000,"maxPrice":19000,"sgkPrice":null,"privatePrice":null,"description":"Kaynak satış fiyatı: 14.000 TL. Uzman KBB için +2.000–5.000 TL aralığı uygulanmıştır.","cashOnly":false},{"id":380001,"clinic":"Uzman KBB","name":"Rinofima Eksizyonu ve İkincil İyileşmeye Bırakılması","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380002,"clinic":"Uzman KBB","name":"Rinoplasti – Komplike Olmayan, Greftsiz","minPrice":56000,"maxPrice":59000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380003,"clinic":"Uzman KBB","name":"Rinoplasti – Komplike, Greftli","minPrice":65000,"maxPrice":68000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380004,"clinic":"Uzman KBB","name":"Septorinoplasti","minPrice":61000,"maxPrice":64000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380005,"clinic":"Uzman KBB","name":"Sineşi / Web Açılması","minPrice":16000,"maxPrice":19000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380006,"clinic":"Uzman KBB","name":"Saddle Nose Deformitesi Onarımı","minPrice":72000,"maxPrice":75000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380007,"clinic":"Uzman KBB","name":"Konka Lateralizasyonu","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380008,"clinic":"Uzman KBB","name":"Konka Submukozal Rezeksiyonu – İki Taraf","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380009,"clinic":"Uzman KBB","name":"Konka Submukozal Rezeksiyonu – Tek Taraf","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380010,"clinic":"Uzman KBB","name":"Septal Fraktür Onarımı","minPrice":27000,"maxPrice":30000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380011,"clinic":"Uzman KBB","name":"Nazal Fraktür Onarımı","minPrice":22000,"maxPrice":25000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380012,"clinic":"Uzman KBB","name":"Nazal Polipektomi","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380013,"clinic":"Uzman KBB","name":"Nazal Septal Perforasyon Onarımı","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380014,"clinic":"Uzman KBB","name":"Nazal Valv Cerrahisi – İki Taraf","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380015,"clinic":"Uzman KBB","name":"Nazal Valv Cerrahisi – Tek Taraf","minPrice":37000,"maxPrice":40000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380016,"clinic":"Uzman KBB","name":"Rinofima Eksizyonu + Alın Flebi – Birinci Seans","minPrice":54000,"maxPrice":57000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380017,"clinic":"Uzman KBB","name":"Rinofima Eksizyonu + Alın Flebi – İkinci Seans","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380018,"clinic":"Uzman KBB","name":"Rinofima Eksizyonu + Deri Grefti","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380019,"clinic":"Uzman KBB","name":"Kosta Grefti Alınması","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380020,"clinic":"Uzman KBB","name":"Laringeal Reinnervasyon (Nöromüsküler Flep)","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380021,"clinic":"Uzman KBB","name":"Laringoplasti – Medializasyon, Tek Taraf","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380022,"clinic":"Uzman KBB","name":"Laringosel Çıkarılması","minPrice":65000,"maxPrice":68000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380023,"clinic":"Uzman KBB","name":"Larenks Papillomu","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380024,"clinic":"Uzman KBB","name":"Larenksten Yabancı Cisim Çıkarılması","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380025,"clinic":"Uzman KBB","name":"Lateral Rinotomi ile Yaklaşım","minPrice":58000,"maxPrice":61000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380026,"clinic":"Uzman KBB","name":"Maksiller Arter Ligasyonu","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380027,"clinic":"Uzman KBB","name":"Supratiroid Boyun Diseksiyonu","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380028,"clinic":"Uzman KBB","name":"BOS Rinore Cerrahisi – Eksternal Yaklaşım","minPrice":27200,"maxPrice":30200,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380029,"clinic":"Uzman KBB","name":"Eksternal Etmoidektomi","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380030,"clinic":"Uzman KBB","name":"Ozena Cerrahisi","minPrice":72000,"maxPrice":75000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380031,"clinic":"Uzman KBB","name":"Pterigopalatin Fossa Cerrahisi","minPrice":65000,"maxPrice":68000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380032,"clinic":"Uzman KBB","name":"Endoskopik Frontal Sinüs Cerrahisi","minPrice":46000,"maxPrice":49000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380033,"clinic":"Uzman KBB","name":"Endoskopik Koanal Atrezi Açılması","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380034,"clinic":"Uzman KBB","name":"Endoskopik Konka Redüksiyonu","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380035,"clinic":"Uzman KBB","name":"Endoskopik Medial Maksillektomi","minPrice":23000,"maxPrice":26000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380036,"clinic":"Uzman KBB","name":"Endoskopik Sfenoid Sinüs Cerrahisi","minPrice":51000,"maxPrice":54000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380037,"clinic":"Uzman KBB","name":"Maksiller Sinüse Endoskopik Müdahale","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380038,"clinic":"Uzman KBB","name":"Endoskopik Epistaksis Kontrolü + Sfenopalatin Arter Ligasyonu","minPrice":41200,"maxPrice":44200,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380039,"clinic":"Uzman KBB","name":"Ağız İçi / Etrafı Benign Tümör Rezeksiyonu","minPrice":30000,"maxPrice":33000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380040,"clinic":"Uzman KBB","name":"Brankial Kleft Kisti / Sinüsü Eksizyonu","minPrice":60000,"maxPrice":63000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false},{"id":380041,"clinic":"Uzman KBB","name":"Eksternal Karotid Arter Ligasyonu","minPrice":44000,"maxPrice":47000,"sgkPrice":null,"privatePrice":null,"description":"","cashOnly":false}];

let data = [];
let editing = null;
let isAdmin = false;
let currentPrincipal = normalizeUserProfile(null, null);
let currentPermissions = permissionsFor(currentPrincipal);
let stopUserSubscription = null;
let stopPendingUserSubscription = null;
let stopInvitationSubscription = null;
let stopCurrentProfileSubscription = null;
let authStateRevision = 0;
let pendingUserRecords = [];
let invitationRecords = [];
let registrationInProgress = false;

const listElement = document.getElementById("list");
const connectionStatus = document.getElementById("connectionStatus");
const adminStatus = document.getElementById("adminStatus");
const adminPanel = document.getElementById("adminPanel");
const loginButton = document.getElementById("loginButton");
const authLoginPanel = document.getElementById("authLoginPanel");
const emailLoginForm = document.getElementById("emailLoginForm");
const emailLoginAddress = document.getElementById("emailLoginAddress");
const emailLoginPassword = document.getElementById("emailLoginPassword");
const emailLoginButton = document.getElementById("emailLoginButton");
const passwordResetButton = document.getElementById("passwordResetButton");
const emailAuthMessage = document.getElementById("emailAuthMessage");
const logoutButton = document.getElementById("logoutButton");
const newRecordButton = document.getElementById("newRecordButton");
const userManagementButton = document.getElementById("userManagementButton");
const userManagementPanel = document.getElementById("userManagementPanel");
const userManagementList = document.getElementById("userManagementList");
const pendingUserList = document.getElementById("pendingUserList");
const createUserProfileButton = document.getElementById("createUserProfileButton");
const inviteUserForm = document.getElementById("inviteUserForm");
const inviteUserButton = document.getElementById("inviteUserButton");
const inviteUserMessage = document.getElementById("inviteUserMessage");
const invitationList = document.getElementById("invitationList");
const registrationForm = document.getElementById("registrationForm");
const registrationButton = document.getElementById("registrationButton");
const registrationMessage = document.getElementById("registrationMessage");
const closeUserManagementButton = document.getElementById("closeUserManagementButton");
const authorizationNotice = document.getElementById("authorizationNotice");
const priceContent = document.getElementById("priceContent");
const guestPhysicianMenuButton = document.getElementById("guestPhysicianMenuButton");
const closePanelButton = document.getElementById("closePanelButton");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const backupButton = document.getElementById("backupButton");
const restoreButton = document.getElementById("restoreButton");
const restoreFile = document.getElementById("restoreFile");

document.getElementById("search").addEventListener("input", render);
document.getElementById("filter").addEventListener("change", render);
document.getElementById("clearButton").addEventListener("click", closeAdminPanel);
saveButton.addEventListener("click", save);
loginButton.addEventListener("click", login);
emailLoginForm.addEventListener("submit", loginWithEmail);
passwordResetButton.addEventListener("click", resetPassword);
logoutButton.addEventListener("click", logout);
newRecordButton.addEventListener("click", openNewRecordPanel);
userManagementButton?.addEventListener("click", () => {
  if (!currentPermissions.viewUserManagement) return;
  const opening = userManagementPanel.classList.contains("hidden");
  userManagementPanel.classList.toggle("hidden", !opening);
  if (opening) userManagementPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});
closeUserManagementButton?.addEventListener("click", () => userManagementPanel.classList.add("hidden"));
createUserProfileButton?.addEventListener("click", createUserProfile);
inviteUserForm?.addEventListener("submit", submitUserInvite);
registrationForm?.addEventListener("submit", registerCorporateAccount);
invitationList?.addEventListener("click", async event => {
  const button = event.target.closest("[data-cancel-invitation]");
  if (!button || !currentPermissions.manageUsers) return;
  button.disabled = true;
  try {
    await userInvitations.cancel(button.dataset.cancelInvitation, auth.currentUser);
    setInviteMessage("Davet iptal edildi.", "ok");
  } catch (error) {
    setInviteMessage(error.message || "Davet iptal edilemedi.", "error");
    button.disabled = false;
  }
});
pendingUserList?.addEventListener("click", async event => {
  const button = event.target.closest("[data-authorize-pending]");
  if (!button || !currentPermissions.manageUsers) return;
  const row = button.closest("[data-pending-uid]");
  const pendingUser = pendingUserRecords.find(item => (item.uid || item.id) === row?.dataset.pendingUid);
  if (!pendingUser) return;
  button.disabled = true;
  try {
    await pendingUsers.authorize(pendingUser, row.querySelector("[data-pending-role]").value);
  } catch (error) {
    console.error(error);
    alert(error.message || "Kullanıcı yetkilendirilemedi.");
  } finally {
    button.disabled = false;
  }
});
userManagementList?.addEventListener("click", async event => {
  const button = event.target.closest("[data-update-user]");
  if (!button || !currentPermissions.manageUsers) return;
  const row = button.closest("[data-user-uid]");
  try {
    await userProfiles.update(row.dataset.userUid, {
      role: row.querySelector("[data-user-role]").value,
      active: row.querySelector("[data-user-active]").checked,
      displayName: row.dataset.userDisplayName || ""
    });
  } catch (error) {
    console.error(error);
    alert(error.message || "Kullanıcı güncellenemedi.");
  }
});
closePanelButton.addEventListener("click", closeAdminPanel);
backupButton.addEventListener("click", downloadBackup);
restoreButton.addEventListener("click", () => restoreFile.click());
restoreFile.addEventListener("change", restoreBackup);

function setConnectionStatus(message, type = "") {
  connectionStatus.textContent = message;
  connectionStatus.className = `status ${type}`.trim();
}

function updateAdminUi(user, profile = null) {
  currentPrincipal = normalizeUserProfile(user, profile);
  currentPermissions = permissionsFor(currentPrincipal);
  isAdmin = currentPermissions.managePrices;
  guestPhysicianMenuButton?.classList.toggle("hidden", !currentPermissions.viewGuestPhysician);
  priceContent?.classList.toggle("hidden", !currentPermissions.viewPrices);
  authorizationNotice?.classList.toggle("hidden", currentPermissions.viewPrices || !user);

  if (isAdmin) {
    adminStatus.textContent = `Yönetici modu • ${user.email}`;
    adminStatus.className = "admin-status admin";
    adminPanel.classList.add("hidden");
    newRecordButton.classList.remove("hidden");
    authLoginPanel.classList.add("hidden");
    logoutButton.classList.remove("hidden");
    userManagementButton?.classList.remove("hidden");
    startUserManagement();
  } else {
    adminStatus.textContent = user
      ? (currentPrincipal.authorized
        ? `${currentPrincipal.role} • ${user.email || "Bilinmeyen hesap"} • Salt görüntüleme`
        : `Bu hesap aktif bir role sahip değil: ${user.email || "Bilinmeyen hesap"}`)
      : "Ziyaretçi modu • Fiyatları görüntülemek için giriş yapın.";
    adminStatus.className = user ? "admin-status denied" : "admin-status visitor";
    adminPanel.classList.add("hidden");
    newRecordButton.classList.add("hidden");
    authLoginPanel.classList.toggle("hidden", Boolean(user));
    logoutButton.classList.toggle("hidden", !user);
    userManagementButton?.classList.add("hidden");
    userManagementPanel?.classList.add("hidden");
    stopUserSubscription?.();
    stopUserSubscription = null;
    stopPendingUserSubscription?.();
    stopPendingUserSubscription = null;
    stopInvitationSubscription?.();
    stopInvitationSubscription = null;
    clearForm();
  }

  render();
}

function startUserManagement() {
  if (!currentPermissions.viewUserManagement) return;
  if (!stopUserSubscription) {
    stopUserSubscription = userProfiles.subscribe(renderUserProfiles, error => {
      console.error(error);
      userManagementList.textContent = "Kullanıcı profilleri okunamadı.";
    });
  }
  if (!stopPendingUserSubscription) {
    stopPendingUserSubscription = pendingUsers.subscribe(renderPendingUsers, error => {
      console.error(error);
      pendingUserList.textContent = "Yetki bekleyen kullanıcılar okunamadı.";
    });
  }
  if (!stopInvitationSubscription) {
    stopInvitationSubscription = userInvitations.subscribe(renderInvitations, error => {
      console.error(error);
      invitationList.textContent = "Davetler okunamadı.";
    });
  }
}

function invitationStatus(invitation) {
  if (invitation.claimed === true) return { label: "Kullanıldı", className: "claimed" };
  if (invitation.active !== true) return { label: "İptal", className: "cancelled" };
  return { label: "Bekliyor", className: "pending" };
}

function renderInvitations(invitations) {
  if (!currentPermissions.viewUserManagement) return;
  invitationRecords = invitations;
  invitationList.innerHTML = invitations.map(invitation => {
    const status = invitationStatus(invitation);
    const cancellable = invitation.active === true && invitation.claimed !== true;
    return `
      <div class="user-management-row invitation-row" data-invitation-email="${escapeHtml(invitation.email)}">
        <strong>${escapeHtml(invitation.displayName || invitation.email)}</strong>
        <span>${escapeHtml(invitation.email)} • ${escapeHtml(invitation.role)}</span>
        <span class="invitation-status ${status.className}">${status.label}</span>
        ${cancellable ? `<div class="user-management-controls"><button class="danger-button" type="button" data-cancel-invitation="${escapeHtml(invitation.email)}">Daveti İptal Et</button></div>` : ""}
      </div>`;
  }).join("") || '<p class="muted">Bekleyen davet yok.</p>';
}

function renderPendingUsers(users) {
  if (!currentPermissions.viewUserManagement) return;
  pendingUserRecords = users;
  pendingUserList.innerHTML = users.map(user => `
    <div class="user-management-row pending-user-row" data-pending-uid="${escapeHtml(user.uid || user.id)}">
      <strong>${escapeHtml(user.displayName || user.email)}</strong>
      <span class="pending-user-meta">${escapeHtml(user.email)} • UID: ${escapeHtml(user.uid || user.id)}</span>
      <div class="user-management-controls">
        <select data-pending-role aria-label="Atanacak kullanıcı rolü">
          <option value="personel">Personel</option>
          <option value="doktor">Doktor</option>
          <option value="idari">İdari</option>
        </select>
        <button class="primary" type="button" data-authorize-pending>Yetkilendir</button>
      </div>
    </div>`).join("") || '<p class="muted">Yetki bekleyen kullanıcı yok.</p>';
}

function renderUserProfiles(users) {
  if (!currentPermissions.viewUserManagement) return;
  userManagementList.innerHTML = users.map(user => `
    <div class="user-management-row" data-user-uid="${escapeHtml(user.uid || user.id)}" data-user-display-name="${escapeHtml(user.displayName || "")}">
      <strong>${escapeHtml(user.displayName || user.email)}</strong>
      <span>${escapeHtml(user.email)} • ${escapeHtml(user.role || "rolsüz")} • ${user.active === true ? "Aktif" : "Pasif"}</span>
      <div class="user-management-controls">
        <select data-user-role aria-label="Kullanıcı rolü">
          ${["personel", "doktor", "idari"].map(role => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
          ${user.role === "admin" ? '<option value="admin" selected disabled>admin</option>' : ""}
        </select>
        <label class="check"><input data-user-active type="checkbox" ${user.active === true ? "checked" : ""}> Aktif</label>
        <button class="secondary" type="button" data-update-user>Güncelle</button>
      </div>
    </div>`).join("") || '<p class="muted">Henüz kullanıcı profili yok.</p>';
}

function setInviteMessage(message = "", type = "") {
  inviteUserMessage.textContent = message;
  inviteUserMessage.className = `invite-user-message ${type}`.trim();
}

function inviteErrorMessage(error) {
  if (error?.code === "permission-denied") return "Bu işlem yalnız aktif ana yönetici tarafından yapılabilir.";
  return error?.message || "Kullanıcı daveti tamamlanamadı. Lütfen tekrar deneyin.";
}

async function submitUserInvite(event) {
  event.preventDefault();
  if (!currentPermissions.manageUsers) return;
  setInviteMessage();
  inviteUserButton.disabled = true;
  inviteUserButton.textContent = "Davet oluşturuluyor...";
  try {
    const email = await userInvitations.create({
      displayName: document.getElementById("inviteDisplayName").value,
      email: requireCorporateEmailAddress(document.getElementById("inviteEmail").value),
      role: document.getElementById("inviteRole").value
    }, auth.currentUser);
    inviteUserForm.reset();
    setInviteMessage(`${email} için davet oluşturuldu. Kullanıcı Kurumsal Hesap Oluştur alanından kaydolabilir.`, "ok");
  } catch (error) {
    setInviteMessage(inviteErrorMessage(error), "error");
  } finally {
    inviteUserButton.disabled = false;
    inviteUserButton.textContent = "Davet Oluştur";
  }
}

function setRegistrationMessage(message = "", type = "") {
  registrationMessage.textContent = message;
  registrationMessage.className = `auth-message ${type}`.trim();
}

function registrationErrorMessage(error) {
  if (error?.code === "auth/email-already-in-use") return "Bu e-posta için daha önce hesap oluşturulmuş. Giriş yapmayı deneyin.";
  if (error?.code === "auth/weak-password") return "Şifre en az 6 karakter olmalıdır.";
  if (error?.code === "auth/invalid-email") return "Geçerli bir kurumsal e-posta girin.";
  if (error?.code === "permission-denied") return "Davet bilgileriyle güvenli profil oluşturulamadı.";
  return error?.message || "Kurumsal hesap oluşturulamadı.";
}

async function registerCorporateAccount(event) {
  event.preventDefault();
  setRegistrationMessage();
  const password = document.getElementById("registrationPassword");
  const confirmation = document.getElementById("registrationPasswordConfirm");
  let email;
  try {
    email = requireCorporateEmailAddress(document.getElementById("registrationEmail").value);
    if (password.value !== confirmation.value) throw new TypeError("Şifreler birbiriyle aynı olmalıdır.");
    if (password.value.length < 6) throw new TypeError("Şifre en az 6 karakter olmalıdır.");
  } catch (error) {
    setRegistrationMessage(error.message, "error");
    password.value = "";
    confirmation.value = "";
    return;
  }

  registrationInProgress = true;
  registrationButton.disabled = true;
  registrationButton.textContent = "Hesap oluşturuluyor...";
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password.value);
    const claimed = await userInvitations.claimForAuthenticatedUser(credential.user);
    if (!claimed) throw new TypeError("Bu e-posta için aktif bir davet bulunamadı.");
    registrationForm.reset();
    setRegistrationMessage("Hesabınız oluşturuldu ve davetiniz etkinleştirildi.", "ok");
  } catch (error) {
    if (credential?.user) {
      try { await deleteUser(credential.user); } catch { await signOut(auth).catch(() => undefined); }
    }
    setRegistrationMessage(registrationErrorMessage(error), "error");
  } finally {
    password.value = "";
    confirmation.value = "";
    registrationInProgress = false;
    registrationButton.disabled = false;
    registrationButton.textContent = "Hesap Oluştur";
  }
}

async function createUserProfile() {
  if (!currentPermissions.manageUsers) return;
  try {
    await userProfiles.create({
      uid: document.getElementById("profileUid").value,
      email: document.getElementById("profileEmail").value,
      displayName: document.getElementById("profileDisplayName").value,
      role: document.getElementById("profileRole").value,
      active: document.getElementById("profileActive").checked
    });
    ["profileUid", "profileEmail", "profileDisplayName"].forEach(id => { document.getElementById(id).value = ""; });
  } catch (error) {
    console.error(error);
    alert(error.message || "Kullanıcı profili oluşturulamadı.");
  }
}

async function login() {
  loginButton.disabled = true;
  loginButton.textContent = "Giriş yapılıyor...";
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Google ile giriş yapılamadı. Tekrar dene.");
    }
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "🔐 Google ile Giriş";
  }
}

function setEmailAuthMessage(message = "", type = "") {
  emailAuthMessage.textContent = message;
  emailAuthMessage.className = `auth-message ${type}`.trim();
}

async function loginWithEmail(event) {
  event.preventDefault();
  setEmailAuthMessage();
  let email;
  try {
    email = requireCorporateEmailAddress(emailLoginAddress.value);
  } catch (error) {
    setEmailAuthMessage(error.message, "error");
    return;
  }

  emailLoginButton.disabled = true;
  emailLoginButton.textContent = "Giriş yapılıyor...";
  try {
    await signInWithEmailAndPassword(auth, email, emailLoginPassword.value);
    emailLoginPassword.value = "";
  } catch (error) {
    setEmailAuthMessage(emailAuthErrorMessage(error.code), "error");
    emailLoginPassword.value = "";
  } finally {
    emailLoginButton.disabled = false;
    emailLoginButton.textContent = "Giriş Yap";
  }
}

async function resetPassword() {
  setEmailAuthMessage();
  let email;
  try {
    email = requireCorporateEmailAddress(emailLoginAddress.value);
  } catch (error) {
    setEmailAuthMessage(error.message, "error");
    return;
  }

  passwordResetButton.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    setEmailAuthMessage("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.", "ok");
  } catch (error) {
    setEmailAuthMessage(emailAuthErrorMessage(error.code), "error");
  } finally {
    passwordResetButton.disabled = false;
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

const priceListener = createPriceListenerController({
  subscribe: (next, error) => onSnapshot(collection(db, COLLECTION_NAME), next, error),
  onSnapshot: snapshot => {
    if (snapshot.empty) {
      data = [];
      render();
      setConnectionStatus("Veritabanında fiyat kaydı bulunmuyor.", "error");
      return;
    }

    data = snapshot.docs
      .map(snapshotDoc => normalise(snapshotDoc.data()))
      .sort((a, b) => a.clinic.localeCompare(b.clinic, "tr") || a.name.localeCompare(b.name, "tr"));

    setConnectionStatus("Firebase bağlı • Değişiklikler tüm cihazlara anında yansır.", "ok");
    render();
  },
  onError: error => {
    console.error(error);
    setConnectionStatus("Firebase bağlantısı kurulamadı. Firestore kurallarını kontrol et.", "error");
    listElement.innerHTML = '<p class="muted">Veriler yüklenemedi.</p>';
  },
  onClear: () => {
    data = [];
    render();
  }
});

onAuthStateChanged(auth, async user => {
  const revision = ++authStateRevision;
  priceListener.stop();
  stopCurrentProfileSubscription?.();
  stopCurrentProfileSubscription = null;

  if (!user) {
    updateAdminUi(null, null);
    setConnectionStatus("Fiyat listesini görüntülemek için giriş yapın.");
    listElement.innerHTML = '<p class="muted">Fiyatları görüntülemek için giriş yapın.</p>';
    return;
  }
  stopCurrentProfileSubscription = userProfiles.subscribeByUid(user.uid, async profile => {
    if (revision !== authStateRevision) return;
    priceListener.stop();
    updateAdminUi(user, profile);
    if (currentPermissions.viewPrices) {
      authorizationNotice.classList.add("hidden");
      priceListener.start();
      return;
    }

    if (!profile) {
      authorizationNotice.className = "box authorization-notice pending";
      authorizationNotice.innerHTML = registrationInProgress
        ? "<strong>Davetiniz doğrulanıyor.</strong>Güvenli kullanıcı profiliniz hazırlanıyor."
        : "<strong>Hesabınız henüz yetkilendirilmemiş.</strong>Sistem yöneticisinin onayını bekleyin.";
      setConnectionStatus(registrationInProgress ? "Davet doğrulanıyor." : "Yetkilendirme bekleniyor.");
      listElement.innerHTML = "";
      if (registrationInProgress) return;
      try {
        if (await userInvitations.claimForAuthenticatedUser(user)) return;
        const signedInWithGoogle = user.providerData?.some(provider => provider.providerId === "google.com");
        if (signedInWithGoogle) {
          await pendingUsers.createForAuthenticatedUser(user);
        } else {
          authorizationNotice.innerHTML = "<strong>Bu hesap için geçerli bir davet bulunamadı.</strong>Sistem yöneticisiyle iletişime geçin.";
          setConnectionStatus("Geçerli kullanıcı daveti bulunamadı.", "error");
        }
      } catch (error) {
        console.error(error);
        setConnectionStatus("Yetkilendirme talebi oluşturulamadı.", "error");
      }
      return;
    }

    authorizationNotice.className = "box authorization-notice denied";
    authorizationNotice.innerHTML = "<strong>Hesabınız aktif değil.</strong>Sistem yöneticisiyle iletişime geçin.";
    setConnectionStatus("Bu hesap aktif bir role sahip değil.");
    listElement.innerHTML = "";
  }, error => {
    if (revision !== authStateRevision) return;
    console.error(error);
    updateAdminUi(user, null);
    setConnectionStatus("Kullanıcı profili okunamadı.", "error");
    listElement.innerHTML = '<p class="muted">Kullanıcı profili yüklenemedi.</p>';
  });
});


function openNewRecordPanel() {
  if (!isAdmin) return;
  const priceContent = document.getElementById("priceContent");
  if (adminPanel.nextElementSibling !== priceContent) {
    priceContent.before(adminPanel);
  }
  clearForm(false);
  formTitle.textContent = "Yeni Kayıt";
  adminPanel.classList.remove("hidden");
}

function closeAdminPanel() {
  clearForm(false);
  adminPanel.classList.add("hidden");
}

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

function clinicIcon(clinic) {
  const name = String(clinic || "").toLocaleLowerCase("tr-TR");
  if (name.includes("beyin")) return "🧠";
  if (name.includes("kalp") || name.includes("damar")) return "♥";
  if (name.includes("ortopedi")) return "🦴";
  if (name.includes("kulak") || name === "kbb") return "👂";
  if (name.includes("çocuk")) return "👶";
  if (name.includes("kadın") || name.includes("doğum")) return "♀";
  if (name.includes("üroloji")) return "◈";
  if (name.includes("plastik")) return "✦";
  if (name.includes("genel cerrahi")) return "✚";
  if (name.includes("göz")) return "◉";
  return "✚";
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
        <div class="group-title">
          <span class="group-icon">${clinicIcon(clinic)}</span>
          <span class="group-name">${escapeHtml(clinic)}</span>
          <span class="group-count">${groups[clinic].length} işlem</span>
        </div>
        <div class="card-grid">
        ${groups[clinic].map(item => `
          <article class="card ${item.cashOnly ? "cash" : ""}">
            ${item.cashOnly ? '<div class="cashwarn">⚠ SADECE NAKİT ÖDEME</div>' : ""}
            <div class="card-top">
              <div class="procedure-icon">${clinicIcon(item.clinic)}</div>
              <div class="name">${escapeHtml(item.name)}</div>
            </div>
            <div class="prices">${prices(item)}</div>
            ${item.description ? `<div class="note"><span class="note-label">Açıklama</span>${escapeHtml(item.description)}</div>` : ""}
            ${isAdmin ? `
              <div class="actions card-actions">
                <button class="secondary" data-edit="${item.id}">✎ Düzenle</button>
                <button class="danger" data-delete="${item.id}">Sil</button>
              </div>` : ""}
          </article>
        `).join("")}
        </div>
      `)
      .join("") || '<div class="empty-state"><div class="empty-icon">⌕</div><strong>Kayıt bulunamadı</strong><span>Arama kelimesini veya poliklinik seçimini değiştirin.</span></div>';

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
    closeAdminPanel();
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
  formTitle.textContent = "Kaydı Düzenle";
  adminPanel.classList.remove("hidden");
  adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
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

function clearForm(hidePanel = true) {
  editing = null;
  ["clinic", "name", "minPrice", "maxPrice", "sgkPrice", "privatePrice", "description"]
    .forEach(key => document.getElementById(key).value = "");
  document.getElementById("cashOnly").checked = false;
  formTitle.textContent = "Yeni Kayıt";
  if (hidePanel) adminPanel.classList.add("hidden");
}
