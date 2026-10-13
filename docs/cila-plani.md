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
- Ana Sayfa "Bugün halkası": logo geometrisinde üç halka + dokunulabilir açıklama satırları, Lumi'nin cümlesi balonda, "Soru Çöz" + galeri düğmesi ilk ekranda (390×844'te y≈416), demo uyarısı küçük etiket.
- Durumlar: iskelet yükleme (tek nefes saati), Lumi'li hata ekranı ("Tekrar dene"), boş durumlar.
- Çözüm beklerken: kırpma kutusunun üstünde tarama ışığı, üç adımlı kontrol listesi, Lumi okuyor.
- Tekrar sekmesinde bekleyen sayısı rozeti; çözüm/ipucu metni 17pt; açık temada Türkçe/Sosyal/Temel Matematik ders renkleri 3:1'in üstüne çekildi; sayaçta çift titreşim kaldırıldı.

## Sıradaki (jürilerin ortak "mutlaka" listesi, sırayla)
1. Lumi'nin sesi: `voice.ts` (durum anahtarları, günde sabit seçim, yasaklı kalıplar) ve asistan/koç istemlerinde aynı ton.
2. Hareket dili: ortak yay/eğri token'ları, kontrol türüne göre basma fiziği, segment kontrolünde kayan seçim göstergesi, büyük başlıkların kayarken küçülmesi.
3. Sekme çubuğu: dolu aktif ikonlar, ortada yükseltilmiş "Çöz" düğmesi (uzun basınca galeri).
4. Deneme › Analiz: önce net grafiği, AI özeti kısa, deneme kartlarında fark etiketleri, hedef çizgisi.
5. Rozetler: kilitli rozetlerde ilerleme halkası, "Sıradaki rozet" kartı.
6. Çözüm bekleme adımlarının sunucudan gerçek `{stage}` olaylarıyla ilerlemesi (NDJSON).
7. Yanlış dokunulan sonucu 5 sn geri alma; seviye eğrisini yumuşatma.

## Jürilerin eksik bulduğu konular
- Repoda görsel kontrol turu (Playwright, telefon/iPad, açık/koyu).
- Yanlış dokunulan sonucu geri alma (5 sn).
- Seviye eğrisini yumuşatma (geç seviyeler çok uzuyor).
- Sunucu yedeği (SQLite + görseller) PDF'ten önce.
- Demo/sunucu kural ikizleri için ortak testler.
- PWA için "Yeni sürüm var, yenile" uyarısı.
