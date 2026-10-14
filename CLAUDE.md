# Derece — YKS çalışma uygulaması (proje spesifikasyonu)

> İlk adım: Bu metnin tamamını proje kökünde `CLAUDE.md` olarak kaydet. Sonraki bütün oturumlarda referans bu dosya olacak. Ardından aşağıdaki **Faz 1**'i uygula ve dur.

## Ne yapıyoruz
YKS'ye (TYT + AYT Sayısal) hazırlanan tek bir öğrenci için kişisel iOS uygulaması. App Store'a çıkmayacak. Geliştirme Expo Go'da yapılıyor, ileride .ipa olarak sideload edilecek.
Kullanıcı arayüzü dili: **Türkçe**. Kod, yorumlar ve commit mesajları: İngilizce.

## Stack
- **App:** `app/` klasörü. Expo (son SDK), TypeScript, expo-router (tabs), zustand, @tanstack/react-query.
- **Expo Go uyumluluğu ŞART:** Sadece Expo Go içinde gelen kütüphaneler kullanılacak. Prebuild veya custom native modül gerektiren hiçbir şey eklenmeyecek. Bağımlılıklar her zaman `npx expo install` ile kurulacak.
  - Kamera ve galeri: `expo-camera`, `expo-image-picker`, `expo-image-manipulator` (yüklemeden önce uzun kenarı ~1600px'e indir, JPEG kalitesi 0.8).
  - Grafikler: `react-native-svg` tabanlı.
  - Animasyon: `react-native-reanimated`. Titreşim: `expo-haptics`. Bildirim: `expo-notifications` (sadece local).
  - Matematik gösterimi: `react-native-webview` içinde KaTeX ile markdown + LaTeX render. KaTeX dosyaları uygulamanın içinde, CDN'e bağımlı olmadan gelecek.
- **Backend:** `server/` klasörü. VDS'te çalışacak. Node + TypeScript, Fastify, SQLite (better-sqlite3 + Drizzle). Görseller diskte `server/data/images/` altında tutulacak.
  - Anthropic SDK, model: `claude-sonnet-5-5`. Model adı `.env` dosyasından okunacak.
  - Yapılandırılmış çıktı için tool use / JSON schema kullanılacak, serbest metin parse edilmeyecek.
  - Tek kullanıcı: bütün istekler `Authorization: Bearer <APP_TOKEN>` ile korunacak.
- **Güvenlik:** `ANTHROPIC_API_KEY` sadece `server/.env` içinde durur. Mobil koda ASLA girmez. App, `EXPO_PUBLIC_API_URL` ve `EXPO_PUBLIC_APP_TOKEN` değişkenlerini kullanır.

## Konu taksonomisi
- `app/src/data/topics.ts` ve `server/src/topics.ts` dosyaları aynı, elle düzenlenebilir bir liste olacak. Kullanıcı bu listeyi kendisi düzenleyecek.
- Yapı: `{ id, exam: 'TYT'|'AYT', subject, topic, subtopic? }`.
- Kapsam:
  - TYT: Türkçe, Sosyal, Temel Matematik (geometri dahil), Fen.
  - AYT Sayısal: Matematik (geometri dahil), Fizik, Kimya, Biyoloji.
- Başlangıç olarak güncel ÖSYM/MEB konu başlıklarıyla doldur.
- AI sınıflandırması yaparken sadece bu listedeki `id`'leri seçebilir (enum olarak verilecek).

## Özellikler

### 1. Soru çöz (Faz 1)
- Kamera veya galeriden görsel seçilir, kırpılır, `POST /solve` ile gönderilir.
- Backend Claude'a görseli ve topic enum'unu gönderir. Tek çağrıda şu JSON döner:
  `{ exam, subject, topicId, difficulty (1-5), questionText, hints: [3 kademeli ipucu], solutionSteps: [], finalAnswer, confidence }`
- Ekranda iki buton olacak: **"İpucu"** (her basışta bir sonraki ipucunu açar) ve **"Tam çözüm"**. Hangisini kullanacağına kullanıcı her seferinde kendisi karar verir.
- Sonra kullanıcı şunları işaretler: **Doğru yaptım / Yanlış yaptım / Boş bıraktım**, isteğe bağlı olarak kendi verdiği cevap. Kayıt geçmişe düşer.
- Düşük `confidence` gelirse uyarı gösterilir: "Cevap anahtarıyla kontrol et".
- (Faz 2) "Anlamadım" butonu: aynı soru üzerinden takip sorusu sorulabilen kısa bir sohbet.

### 2. Tekrar sistemi (Faz 2)
- Yanlış veya boş işaretlenen sorular tekrar kuyruğuna girer.
- Aralıklar: 1, 3, 7, 14, 30 gün. Doğru yapılırsa bir sonraki aralığa geçer, yanlış yapılırsa başa döner. Mantık sade bir SM-2 benzeri.
- Ana sayfada "Bugünün tekrarı (N soru)" gösterilir.
- Tekrar akışı: görsel gösterilir, kullanıcı kağıtta çözer, cevabı açar, Doğru/Yanlış işaretler.
- Geçmiş ekranı: ders ve konuya göre filtrelenebilen soru listesi.

### 3. Deneme (Faz 3)
- İki giriş yolu var, ikisi de aynı düzenlenebilir forma düşer:
  - **Karne fotoğrafı:** `POST /exams/parse` ile Claude ders bazında (varsa konu bazında da) D/Y/B değerlerini okur.
  - **Manuel giriş.**
- Soru sayıları:
  - TYT: Türkçe 40, Sosyal 20, Temel Matematik 40, Fen 20.
  - AYT Sayısal: Matematik 40, Fizik 14, Kimya 13, Biyoloji 13.
- Net hesabı: D − Y/4.
- Analiz ekranı:
  - Ders bazında net trend grafiği.
  - En çok net kaybedilen konular: deneme verisi ve soru geçmişi birleştirilerek hesaplanır.
  - Haftalık AI özeti: "Bu hafta öncelik verilecek 3 konu" ve gerekçesi.

### 4. Çalışma sayacı (Faz 4)
- Pomodoro: varsayılan 25/5, ayarlanabilir. Her oturuma ders etiketi seçilir.
- Sayaç timestamp tabanlı olacak. Uygulama arka plana geçse de doğru saymalı.
- Süre bitince local bildirim gönderilir.
- Günlük toplam süre ve ders dağılımı gösterilir.

### 5. Oyunlaştırma (Faz 4, tasarım baştan buna göre kurulacak)
- XP kazanma:
  - Soru çözme: +10
  - Tekrarda doğru: +15
  - Pomodoro tamamlama: +20
  - Deneme girişi: +50
- Seviye eğrisi: her seviye bir öncekinden ~%20 daha fazla XP ister.
- **Streak:** gün içinde en az 1 pomodoro veya tekrar kuyruğunun tamamlanması.
- Rozetler: ilk deneme, 7 / 30 günlük streak, 100 / 500 soru, konu ustası (bir konuda 10 doğru tekrar).
- Kutlama animasyonları ve haptics: seviye atlama, rozet kazanma, streak artışı.

## Ekranlar (tab bar)
1. **Ana Sayfa:** streak alevi, XP barı ve seviye, bugünün tekrar sayısı, bugünkü çalışma süresi, büyük "Soru Çöz" butonu.
2. **Çöz:** kamera ve çözüm akışı.
3. **Tekrar:** kuyruk ve geçmiş.
4. **Deneme:** liste, giriş ve analiz.
5. **Profil:** istatistikler, rozetler, ayarlar (pomodoro süreleri, API URL kontrolü).

## Tasarım kuralları
- Tarz: oyunlaştırılmış, canlı renkli ama göz yormayan. Koyu ve açık tema otomatik.
- **Bütün renkler, font boyutları, boşluklar ve köşe yarıçapları tek dosyada:** `app/src/theme.ts`. Bileşenler bu dosyadaki token'ları kullanır, hardcoded renk yazılmaz. Tasarım değişikliği istendiğinde önce theme, sonra ilgili bileşen değiştirilir.
- Ortak bileşenler `app/src/components/` altında: Card, Button, ProgressBar, StatTile, Badge vb.
- Dokunma alanları en az 44pt. Safe area'ya uyulur.

## Backend endpoint'leri
- `POST /solve`
- `POST /questions/:id/attempt`
- `GET /questions?subject=&topicId=`
- `GET /questions/:id/image`
- `GET /reviews/today`
- `POST /reviews/:id/result`
- `POST /exams/parse`
- `POST /exams`
- `GET /exams`
- `GET /stats/overview`
- `GET /stats/weekly-summary`
- `POST /sessions`
- `GET /sessions?date=`
- `GET /profile`: XP, seviye, streak, rozetler.

## Çalışma kuralları (Claude Code için)
- Dev server'lar tmux'ta açık duruyor: `npx expo start --tunnel` ve backend. Bunları kapatma veya yeniden başlatma; gerekirse bana söyle.
- Her değişiklikten sonra `npx tsc --noEmit` çalıştır. Hata kalmasın.
- Çalışan her özellikten sonra git commit at.
- Her fazın sonunda dur. Telefonda neyi test etmem gerektiğini kısa bir liste olarak yaz.
- Belirsiz bir karar çıkarsa makul olanı seç ve fazın sonunda belirt. Küçük şeyler için durup soru sorma.

## Faz 1 (şimdi bunu yap)
1. Monorepo yapısı: `app/` + `server/`, `.gitignore` (`.env`, `server/data/` dahil), `.env.example` dosyaları.
2. Backend: Fastify, SQLite şeması (questions, attempts, reviews, exams, sessions, profile), auth middleware, `POST /solve` ve `GET /questions/:id/image`.
3. App: expo-router ile 5 tab (Çöz dışındakiler şimdilik placeholder olabilir), `theme.ts`, temel bileşenler, Ana Sayfa iskeleti.
4. Soru çöz akışının tamamı: kamera/galeri → yükleme → ipucu ve tam çözüm → KaTeX render → Doğru/Yanlış/Boş işaretleme → kayıt.
5. `topics.ts` ilk sürümü.
6. Kurulum için kısa bir README: `.env` değişkenleri, backend nasıl çalıştırılır, Expo nasıl açılır.

## Sonradan eklenen kararlar

Bu bölüm yukarıdaki spesifikasyonu günceller; çelişirse bu bölüm geçerlidir.

- **Çok kullanıcı:** Tek `APP_TOKEN` kalktı. Kullanıcılar kullanıcı adı + şifreyle giriş yapar (scrypt), uygulama oturum anahtarını `Authorization: Bearer <token>` ile gönderir. İlk hesap davet kodu istemez ve tek kullanıcılı sürümün verilerini üstlenir; sonraki hesaplar `server/.env` içindeki `INVITE_CODE` ile açılır. Her tabloda `user_id` vardır, her endpoint sadece giriş yapan kullanıcının verisini döner.
- **Sıralama:** `GET /leaderboard?period=week|all`. Haftalık XP (pazartesi `APP_TIMEZONE`'da sıfırlanır), XP her olayda `xp_events` tablosuna yazılır.
- **Ek endpoint'ler:** `GET /auth/config`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET/PUT /me`, `PUT /profile/settings`, `GET /sessions/days?days=`.
- **Ödüller:** XP, seri ve rozet hesabı tek yerde (`server/src/gamification.ts` → `applyRewards`); yanıtlar `rewards` nesnesi taşır (XP, seviye atlama, yeni rozetler, seri artışı). Uygulama kutlamaları bu nesneden sıraya koyar.
- **Demo modu:** `EXPO_PUBLIC_API_URL` boşsa ya da `EXPO_PUBLIC_DEMO=1` ise uygulama sunucusuz, bellekteki örnek verilerle çalışır (`app/src/api/demo/`). Sunucu kuralları değişirse demo da güncellenir.
- **Web önizleme:** `npm run build:preview` tek dosyalık önizleme ve kurulabilir web uygulaması (`web-build/pwa`) üretir. Web'de çalışmayan şeylerin sade bir yedeği olur.
- **Marka:** Uygulamanın ve asistanın adı **Lumi** ("Her gün biraz daha net."). Logo "Odak halkası" `app/assets/brand/logo.svg` ve `app/src/components/Logo.tsx` içinde; ikonlar `python3 app/scripts/build-brand-assets.py` ile üretilir. Adlar `app/src/brand.ts` ve `server/src/brand.ts` içinde (`app.json` adı da). Kod içi kimlikler (`slug`, `scheme`, bundle id, `derece.*` depolama anahtarları) eski adla kaldı.
- **Lumi karakteri:** Düz 2D, kil renginde küçük bir alev; sallanan ucunda altın bir ışık var (`app/src/components/mascot/`). Her duygu (`poses.ts`: wave, happy, celebrate, sad, thinking, talking, sleepy, focus, break, cheer, proud, reading…) bir poz ve döngü; parçalar ayrı katmanlarda Reanimated ile oynar. Renkleri `theme.ts` → `colors.mascot`. Hareketi azalt açıkken sabit durur.
- **Şıklar:** Çözücü şıkları sorudan ayrı (`choices`) ve doğru harfi (`correctChoice`) döndürür; eski sorularda şıklar metinden ayrıştırılır (`server/src/choices.ts`, kopyası `app/src/lib/choices.ts`). Seçilen şıkkı sunucu değerlendirir; öğrencinin cevap anahtarı (`answerKey`) modelin harfini geçersiz kılar. Tekrarda şık en başta seçilir.
- **Asistan sohbeti:** `GET/POST/DELETE /assistant/messages`, günde 60 mesaj. Her mesajla öğrencinin anlık özeti (`server/src/studentContext.ts`) gider. Sohbet yanıtları `Accept: application/x-ndjson` ile akış hâlinde gelir; uygulama `expo/fetch` ile okur ve metni kelime kelime yazarak gösterir.
- **Cevap çubuğu ve karar anı:** Soru ve tekrar ekranlarında cevap, sayfanın altında yüzen çubuktan verilir (`components/AnswerDock.tsx`; `Screen`/`SplitScreen` `dock` prop'u). Karar şıkkın üstünde oynar (`scripts/math-runtime.js` durumu yerinde günceller, `{type:'verdict'}` ile satırın konumunu bildirir); doğruda satırdan küçük konfeti ve XP (`motion/InlineBurst.tsx`), yanlışta sallanma ve doğru şıkkın dolması. Tam ekran kutlama sadece seviye, rozet ve seri için (`RewardBurst`). Yeni içerik `RevealOnMount` ile görünür alana kayar.
- **Bugünün optiği (planlandı, P3):** Ana Sayfa'daki üç halkanın yerini bir optik form satırı alacak: Tekrar (günün tekrar sayısı), Odak ve Soru (`config.ts` → `DAILY_GOALS`); her hedef bir kabarcık sırası, dolan kabarcık kurşun kalemle karalanır. `GET /sessions` günün `solved` sayısını da döner (demo aynı). Üçü dolunca Lumi kutlar, günde bir kez titreşim. P3 inene kadar ekran halkalarla çalışır.
- **Durum ekranları:** Yükleme iskeletleri, Lumi'li hata (`ErrorState`, "Tekrar dene") ve boş durumlar (`EmptyState`) `components/states/` altında; ham `error.message` kartı kullanılmaz.
- **Lumi konuşma balonu:** `MascotNote` artık balonla konuşur (`colors.bubble`, `layout.bubbleTail`).
- **Konu listesi derinleşti:** `topics.ts` (iki kopya aynı) 257 konu ve `UNITS` içinde 1735 alt konu ("incik cincik") taşır. Alt konu id'leri konu id'siyle başlar ama konuya her zaman `UNITS` üzerinden gidilir, önekten değil (`tyt-bio-hucre` / `tyt-bio-hucre-bolunmeleri` gibi önekler çakışır). Liste uzman ajanlarla üretildi, denetimden gelen düzeltmeler `tools/bank/taxonomy-patch.json` içinde.
- **Soru bankası:** Kitaplar `tools/bank/` ile Sınav/Ders/Konu/Zorluk/Test düzeninde kesilir, her soru gözle kontrol edilir (bkz. `docs/soru-bankasi.md`). Kitap PDF'leri, kesimler ve zip'ler telifli olduğu için depoya girmez (`.gitignore`).
- **Görsel kimlik: Anthropic tarzı (kalıcı karar).** Krem/fildişi zemin, kömür yazı, kil turuncusu vurgu (`primary` `#B5573A`, `accent` `#D97757`), zeytin/kraft/arduvaz yardımcı renkler; koyu tema sıcak kömür. Yazı tipleri Poppins (arayüz) ve Lora (başlıklar, büyük sayılar, Lumi'nin sözleri), `@expo-google-fonts` ile. Bu kimlik kullanıcıya sormadan değiştirilmez. Renkler yumuşak; renk ve durum geçişleri hep çapraz solma (220 ms, Hareketi azalt'ta 120 ms), sert geçiş yok. Kod içindeki "optik", "fosfor", "mark" adları sadece rol adıdır: dolu kabarcık kil (`mark`), boş kabarcık sıcak kenar rengi (`optik`), vurgu bandı yumuşak kil tonu (`highlight`), Lumi'nin notu krem (`note`, yazısı `noteInk`). Kareli kâğıt dokusu kapalı (`opacity.kareli` 0).
- **Yazı kuralları:** Başlıklar ve büyük sayılar `title`/`hero`/`numeral`/`stat` varyantlarıyla Lora; satır içi sayılar `numeric` (Poppins). Lora için satır yüksekliği 1.1'in altına inmez (İ, Ş kesilmesin). Başlıklar cümle düzeninde; büyük harfli etiket, harf aralıklı üst başlık, "A · B" ve buton metninde "→" yok.
- **Optik şerit:** Yan menü kalktı. Her genişlikte tek yüzen sekme şeridi (`components/TabBar.tsx` → `OptikStrip`): telefonda solda (sağı Lumi'nin yuvası), tablette ortada 560 pt (dar pencerede solda). Sekmeler kabarcık; seçili sekme kurşunla dolar. Tekrar rozeti, Çöz'e uzun basınca ya da tekrar dokununca kamera, sayaç çalışırken şeridin üstünde sayaç kulağı. `Screen` alt boşluğu şeridin bildirdiği yükseklikle bırakır, içerik şeridin altında kalmaz.
- **Token kuralı:** Renk, boyut, yarıçap, süre, eğri ve opaklık sadece `app/src/theme.ts` içinde. Bileşende hex, rgba ya da sayısal stil yazılmaz; eksik token dosyanın başında `// TOKEN-PENDING: grup.anahtar = değer` sabitiyle geçici tutulur ve sonra theme'e taşınır. Ortak bileşenler (Bubble, Highlight, Note, Kareli, Viewfinder, SectionHeader, Card, Button…) sadece isteğe bağlı prop kazanır. Hepsi geliştirmede `/dev-kit` sayfasında görülür (yayında ana sayfaya döner).
- **Dönme ve büyütme noktası:** iOS, Reanimated ile sürülen dönüşümlerde `transformOrigin` uygulamaz. Bir nokta etrafında döndürmek ya da büyütmek için öteleme sandviçi kullanılır (translate → rotate/scale → geri translate; örnek `mascot/Mascot.tsx` → `Pivot`). Giriş/çıkış animasyonları `motion/Appear.tsx` ve `AnswerDock.tsx` içindeki yerli/web ayrımını korur.
- **Lumi arkadaşı:** Tek Lumi kök düzende `<CompanionHost/>` olarak yaşar (`components/companion/`). Ekranlar Lumi'yi kendileri konumlandırmaz: `store/companionStore.ts` üzerinden olay yayar (`emit`), satır ister (`say`), tünek ve hedef kaydeder (`registerPerch`, `registerTarget`, ya da `CompanionPerch` ve `Highlight id`). Ekrandaki ayrı bir Lumi `useCompanionYield` ile yer açtırır. Bu API sabittir; iç işleyişi Lumi paketi yazar. Satırlar `lib/lumiLines.ts`, tercihler (`talk`, titreşim) `store/prefsStore.ts` içinde; her titreşim `lib/haptics.ts` üzerinden ve tercihe bakarak çalışır.
