# Misafir Hekim Modülü Veri Modeli

## Amaç ve sınırlar

Bu belge, Yatış Birimi Asistanı v11 kapsamında geliştirilecek Misafir Hekim Hesaplama modülünün veri sözleşmesini tanımlar. Modül mevcut `surgeryPrices` koleksiyonundan ve mevcut fiyat listesi uygulamasından bağımsızdır.

- Mevcut `surgeryPrices` belgeleri okunmaz, değiştirilmez veya yeni modele taşınmaz.
- Misafir hekim tarifeleri uygulama seed verilerine eklenmez.
- Para değerleri TL yerine tam sayı kuruş olarak saklanır.
- Tarife sürümleri yerinde değiştirilmez; her değişiklik yeni bir sürüm oluşturur.
- Kesinleşen bir vaka, kullandığı tarifenin gerekli alanlarını snapshot olarak saklar.

## Önerilen koleksiyonlar

### `guestPhysicianTariffs/{tariffId}`

Sürümlenmiş tarife belgelerini tutar. Örnek belge kimliği: `2026-v1`.

Temel alanlar:

| Alan | Tür | Açıklama |
| --- | --- | --- |
| `schemaVersion` | number | Belge şeması sürümü |
| `tariffCode` | string | Tarife ailesi; ör. `GUEST_PHYSICIAN_2026` |
| `version` | number | Tarife sürüm numarası |
| `status` | string | `draft`, `active` veya `retired` |
| `currency` | string | `TRY` |
| `effectiveFrom` | timestamp | Geçerlilik başlangıcı |
| `effectiveUntil` | timestamp/null | İsteğe bağlı geçerlilik sonu |
| `categories` | map | Cerrahi, Diş/KBB ve Kadın Doğum kuralları |
| `surcharges` | map | Mesai dışı ilave kuralları |
| `restrictions` | map | Özel ödeme/SGK kısıtları |
| `exclusions` | array | Tarife dışı hizmet açıklamaları |
| `createdAt`, `createdBy` | timestamp/map | Oluşturma denetim bilgileri |
| `activatedAt`, `activatedBy` | timestamp/map/null | Aktivasyon denetim bilgileri |
| `changeNote` | string | Sürüm değişiklik açıklaması |

2026 tarifesinde `categories` içinde:

- `surgery`: 60 dakika dahil sabit bedel, dakika başına fazla süre bedeli ve oda fiyatları.
- `dentalEnt`: 60 dakika dahil sabit bedel, pay/payda biçiminde fazla süre oranı ve oda fiyatları.
- `obstetrics`: yalnızca sabit işlem fiyatları. 2026 sürümünde oda tarifesi bulunmaz.

Diş/KBB fazla süre oranı yaklaşık bir dakika fiyatı olarak saklanmaz:

```json
{
  "excessRate": {
    "numeratorKurus": 1000000,
    "denominatorMinutes": 60,
    "sourceHourlyFeeKurus": 1000000
  }
}
```

### `guestPhysicianTariffSettings/current`

Aktif tarifeyi açıkça gösterir:

```json
{
  "schemaVersion": 1,
  "activeTariffId": "2026-v1",
  "updatedAt": "server timestamp",
  "updatedBy": { "uid": "...", "email": "..." }
}
```

Uygulama en yeni belgeyi tahmin etmek yerine bu işaretçiyi kullanır. Aktif tarife üzerinde fiyat düzenlemek yerine yeni bir `draft` sürüm oluşturulur ve onay sonrasında işaretçi atomik olarak yeni sürüme çevrilir.

### `guestPhysicianCases/{caseId}`

Taslak ve kesinleşmiş hesapları tutar. Temel alan grupları:

- `schemaVersion`, `caseNumber`, `status`
- `tariff`: tarife kimliği, kodu ve sürümü
- `category`, `procedureCode`
- `patient`, `physician`
- `timing`: başlangıç, bitiş ve hesaplanan tam dakika
- `accommodation`: oda seçim kodu
- `options.outsideWorkingHours`
- `lineItems`: hesap dökümü
- `totals`: ana bedel, oda, ek kalem, ilave ve genel toplam
- `tariffSnapshot`: kullanılan tarife değerlerinin değişmez kopyası
- `calculation.engineVersion` ve yuvarlama yöntemi
- oluşturma, güncelleme ve kesinleştirme denetim bilgileri

Kesinleşmiş vaka en az şu toplamları ayrı saklamalıdır:

```json
{
  "mainServiceKurus": 0,
  "accommodationSubtotalKurus": 0,
  "extraItemsSubtotalKurus": 0,
  "surchargeTotalKurus": 0,
  "grossTotalKurus": 0,
  "patientPaymentKurus": null,
  "hospitalAmountKurus": null,
  "remainingAmountKurus": null,
  "physicianShareKurus": null
}
```

### `guestPhysicianAuditLogs/{logId}`

Tarife oluşturma, aktivasyon, emekliye ayırma ve kritik vaka işlemlerini eklemeli kayıt olarak tutar. Audit belgeleri istemciden güncellenmemeli veya silinmemelidir.

## Gelecekteki ek kalemler

Ek kalemler ortak bir satır sözleşmesi kullanır:

```json
{
  "id": "uuid",
  "type": "laboratory",
  "code": "CUSTOM",
  "label": "Açıklama",
  "quantity": 1,
  "unitAmountKurus": 0,
  "amountKurus": 0,
  "surchargeEligible": false,
  "note": ""
}
```

Kan ürünü, laboratuvar, radyoloji, ambulans, konsültasyon, patoloji, özellikli malzeme ve diğer ek kalemler mesai dışı yüzde hesabına dahil edilmez. Hasta tahsilatı, hastane bedeli, kalan tutar ve doktor payı hizmet satırı değil, ayrı mali dağılım alanlarıdır.

## Versiyonlama ilkesi

1. İlk tarife `2026-v1` ve `draft` olarak oluşturulur.
2. Doğrulanan sürüm `active` yapılır.
3. Fiyat değişikliğinde aktif belge düzenlenmez; `2026-v2` oluşturulur.
4. Yeni sürüm aktive edildiğinde eski sürüm `retired` olur ancak silinmez.
5. Her vaka tarife referansına ek olarak tarife snapshot'ı ve hesaplama motoru sürümünü saklar.

