# Misafir Hekim Hesaplama Kuralları — 2026

## Ortak ilkeler

- Bütün para hesapları tam sayı kuruş üzerinden yapılır.
- Cerrahi ve Diş/KBB süresi anestezi başlangıç ve bitişinden hesaplanır.
- Saat girişleri `HH:mm` biçiminde ve yalnızca saat/dakika hassasiyetindedir; saniye kullanılmaz.
- Bitiş saati başlangıçtan küçükse işlem gece yarısını geçmiş kabul edilir.
- Eşit başlangıç ve bitiş sıfır süre sayılır ve reddedilir.
- Tek bir hesap 24 saatten kısa olmalıdır; 24 saat veya daha uzun işlemler yalnızca saat alanlarıyla ayırt edilemeyeceği için bu sürümün kapsamı dışındadır.
- İlk 60 dakika sabit ana bedele dahildir.
- Normal mesai dışı `%20` yalnızca ana işlem/ameliyathane bedeline uygulanır.
- Oda ve diğer ek kalemler yüzde hesabına dahil edilmez.
- İşlemler özel ücretlidir; SGK'lı işlem açılamaz.

## Cerrahi

| Kalem | 2026 bedeli |
| --- | ---: |
| İlk 0–60 dakika | 35.000 TL |
| 60 dakika üzerindeki her dakika | 200 TL |
| 1 günlük özel oda | 10.000 TL |
| Günübirlik özel oda | 5.000 TL |
| Müşahede salonunda işlem öncesi/sonrası günübirlik yatış | Ücretsiz |

Formül:

```text
fazlaDakika = max(0, toplamDakika - 60)
anaBedel = 35.000 TL + fazlaDakika × 200 TL
```

## Diş / KBB

| Kalem | 2026 bedeli |
| --- | ---: |
| İlk 0–60 dakika | 20.000 TL |
| Saatlik fazla süre | 10.000 TL |
| 1 günlük özel oda | 5.000 TL |
| Günübirlik özel oda | 2.500 TL |
| Müşahede salonunda işlem öncesi/sonrası günübirlik yatış | Ücretsiz |

Fazla süre dakika bazında ve rasyonel oranla hesaplanır:

```text
fazlaDakika = max(0, toplamDakika - 60)
fazlaSüreBedeli = fazlaDakika × 10.000 TL / 60
anaBedel = 20.000 TL + fazlaSüreBedeli
```

`10.000 / 60` işlemi önce `166,67` değerine yuvarlanmaz. Çarpma bölmeden önce yapılır ve yalnızca toplam fazla süre satırı nihai kuruşa yuvarlanır. Örneğin 3 fazla dakika tam olarak 500 TL'dir; erken yuvarlama sonucu oluşabilecek 500,01 TL kabul edilmez.

## Kadın Doğum

| İşlem | 2026 bedeli |
| --- | ---: |
| Sezaryen | 34.000 TL |
| Normal Doğum | 28.000 TL |
| Küretaj vb. | 24.000 TL |

Kadın Doğum hesapları süre bazlı değildir. 2026 tarifesinde oda bedeli tanımlı değildir ve oda seçimi kabul edilmez. Veri modeli, ileride ayrı bir Kadın Doğum oda politikası eklenmesine izin verecek biçimde sürümlüdür.

## Mesai dışı ilave

```text
mesaiDışıİlave = anaBedel × %20
genelToplam = anaBedel + mesaiDışıİlave + oda + diğerEkKalemler
```

Yüzde matrahına sadece ana bedel girer. Şunlar matraha girmez:

- Oda
- Kan ürünleri
- Laboratuvar ve radyoloji
- Ambulans
- Konsültasyon
- Patoloji
- Özellikli malzeme
- Diş operasyonu ekstra sarfları
- Diğer ek kalemler

## Kapsam dışı kalemler

- Tetkikler dahil değildir.
- Özellikli malzeme ve patoloji dahil değildir.
- Diş operasyonlarında ekstra sarflar dahil değildir.
- İşlemler özel ücretlidir; SGK'lı işlem açılamaz.

## Yuvarlama

- Ara hesaplarda yaklaşık ondalık dakika bedeli üretilmez.
- Bölünebilir rasyonel tutarlar pay/payda olarak korunur.
- Nihai satır tutarı en yakın kuruşa, yarım değerler yukarı olacak şekilde yuvarlanır (`half_up_to_kurus`).
- Yüzde ilavesi de ana bedel üzerinden bir kez hesaplanıp nihai kuruşa yuvarlanır.

## Geçersiz girdiler

Motor aşağıdaki durumları reddeder:

- Bilinmeyen kategori veya işlem kodu
- `HH:mm` dışında veya sınır dışı saat
- Aynı başlangıç ve bitiş saati
- Cerrahi/Diş-KBB için eksik saat
- Tanımlanmamış oda kodu
- 2026 Kadın Doğum tarifesinde oda seçimi
- SGK seçeneğinin açılması
- Tarife şemasında negatif veya güvenli tam sayı olmayan parasal değer

