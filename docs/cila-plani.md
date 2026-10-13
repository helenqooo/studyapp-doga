# Cila planı (PDF kitaplarından önce)

Fikir sürüsü: 10 bakış açısı (ödül jürisi tasarımcı, animasyon yönetmeni, oyun tasarımcısı,
Lumi karakteri, öğrenme bilimci, PDF içerik mimarı, 17 yaşında öğrenci, bilgi mimarisi,
iPad, marka), 180 fikir. İki jüri (mühendis, ürün) puanladı ve birleştirdi.

## Bitti
- Soru fotoğrafı kendi oranında, uzun görselde "Tamamını gör".
- Cevap çubuğu (soru ve tekrar): A–E, Cevapla/Boş, sonra "Yeni soru"/"Sonraki" hep başparmağın altında; iPad'de sağ panelde.
- Karar anı şıkkın üstünde: kısa bekleme, doğruda yeşil dolma + satırdan konfeti + "+XP"; yanlışta sallanma, ardından doğru şık dolar. Tam ekran kırmızı X kalktı; seviye atlamanın kendi anı var.
- Kayma yok: matematik görünümü yüksekliği yumuşak değişir; yeni ipucu, çözüm ve sonuç görünür alana kayar.
- Soru metni "Soru metni" düğmesinin arkasında; ipucu noktaları (●●○).
- Sunucu: günlük çalışma özetine o gün çözülen soru sayısı (`solved`) eklendi (demo da).

## Sıradaki (jürilerin ortak "mutlaka" listesi, sırayla)
1. Ana Sayfa "Bugün halkası": logo geometrisinde üç halka (Tekrar, Odak, Soru), tek bir sonraki adım düğmesi ilk ekranda, Lumi'nin günlük cümlesi, demo uyarısı küçük bir etikete.
2. Durumlar: iskelet yükleme, Lumi'li boş ve hata ekranları (ham hata metni yerine).
3. Hareket dili ve titreşim sözlüğü: ortak yay/eğri token'ları, Button'daki çift titreşimin düzeltilmesi, basma fiziği.
4. Çözüm beklerken tarama ışığı ve üç adımlı kontrol listesi (crop ekranı).
5. Lumi'nin sesi (`voice.ts`, durum anahtarları, günde sabit seçim) ve konuşma balonu.
6. Sekme çubuğu: Tekrar'da bekleyen sayısı rozeti, dolu aktif ikonlar, ortada büyük "Çöz" düğmesi.
7. Deneme › Analiz: önce net grafiği, AI özeti kısa, deneme kartlarında fark etiketleri.
8. Rozetler: kilitli rozetlerde ilerleme halkası, "Sıradaki rozet".
9. Ders renkleri kontrastı: açık temada Sosyal ve Temel Matematik çizgi renkleri 3:1'in altında, düzelt.
10. Okuma boyu (çözüm metni 17pt), segment kontrolünde kayan seçim göstergesi.

## Jürilerin eksik bulduğu konular
- Repoda görsel kontrol turu (Playwright, telefon/iPad, açık/koyu).
- Yanlış dokunulan sonucu geri alma (5 sn).
- Seviye eğrisini yumuşatma (geç seviyeler çok uzuyor).
- Sunucu yedeği (SQLite + görseller) PDF'ten önce.
- Demo/sunucu kural ikizleri için ortak testler.
- PWA için "Yeni sürüm var, yenile" uyarısı.
