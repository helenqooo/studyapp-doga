# Lumi

*Her gün biraz daha net.* YKS (TYT + AYT Sayısal) için kişisel çalışma uygulaması; asistanın adı da Lumi. (Önceki çalışma adları: Derece, Netlik.) Proje spesifikasyonu: [`CLAUDE.md`](CLAUDE.md).

```
app/     Expo (SDK 57) iOS uygulaması: expo-router, TypeScript
server/  Fastify + SQLite backend, Claude ile soru çözümü
```

## Gereksinimler

- Node.js **22+** (VDS'te ve geliştirme makinesinde)
- iPhone'da **Expo Go** (App Store'daki güncel sürüm, SDK 57)
- Anthropic API anahtarı

## 1. Backend (VDS)

```bash
cd server
npm install
cp .env.example .env
# .env'i düzenle (aşağıdaki tablo)
npm run dev      # geliştirme: dosya değişince kendini yeniden başlatır
# veya
npm start        # sürekli çalışma (tmux / systemd içinde)
```

Kontrol: `curl http://<VDS-IP>:3000/health` → `{"ok":true}`

| Değişken | Açıklama |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API anahtarı. **Sadece burada durur**, uygulamaya asla girmez. |
| `AI_MODEL` | Kullanılan model. Varsayılan `claude-sonnet-5-5`. |
| `AI_EFFORT` | İsteğe bağlı: `low` / `medium` / `high` / `xhigh` / `max`. Boş = modelin varsayılanı. |
| `INVITE_CODE` | Arkadaşlarının hesap açarken gireceği davet kodu (en az 12 karakter; örn. `openssl rand -hex 8`). Boş bırakırsan ilk hesaptan sonra kayıt kapanır. |
| `HOST`, `PORT` | Dinlenen adres. Varsayılan `0.0.0.0:3000`. |
| `APP_TIMEZONE` | Gün hesabı (tekrar tarihleri, seri). Varsayılan `Europe/Istanbul`. |
| `DATA_DIR` | Veritabanı ve görseller. Varsayılan `server/data/`. **Bu klasörü yedekle.** |
| `MOCK_SOLVER` | `true` ise Claude çağrılmaz, sabit örnek çözüm döner (API harcamadan arayüz testi). |

Notlar:
- Veritabanı şeması açılışta otomatik güncellenir. Şemayı (`src/db/schema.ts`) değiştirirsen `npm run db:generate` ile yeni migration üret ve commit'le.
- Firewall'da portu aç (ör. `sudo ufw allow 3000`).
- Önüne nginx koyarsan: `proxy_read_timeout 300s;` ve `client_max_body_size 10m;` ekle. Zor sorularda çözüm bir dakikayı geçebilir.

## 2. Uygulama (Expo Go)

```bash
cd app
npm install
cp .env.example .env
# .env'i düzenle (aşağıdaki tablo)
npx expo start --tunnel
```

iPhone'da kamerayla QR kodu okut, Expo Go'da açılır.

| Değişken | Açıklama |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend adresi, telefonun gördüğü şekliyle. Ör. `http://1.2.3.4:3000` (sonda `/` yok). |
| `EXPO_PUBLIC_DEMO` | İsteğe bağlı. `1` = sunucusuz demo, `0` = adres boş olsa da demo açılmasın. |

- `.env` değişince `npx expo start --tunnel -c` ile yeniden başlat (`EXPO_PUBLIC_*` değerleri paketlemede gömülür).
- iPad'de de aynı QR ile Expo Go'da açılır: dikey, yatay ve Split View desteklenir; geniş ekranda sekmeler yan menüye geçer, çözüm ve tekrar ekranları iki panele bölünür. iPhone dikey modda kilitli kalır.
- Bağlantıyı kontrol etmek için: **Profil → Bağlantıyı test et**.
- Uygulamada gizli anahtar yok: her kullanıcı kendi hesabıyla giriş yapar, oturum anahtarı iPhone'un Anahtar Zinciri'nde (Keychain) saklanır. `ANTHROPIC_API_KEY` sadece sunucuda durur.
- İleride .ipa olarak kurarken düz `http://` adresi iOS tarafından engellenir; o aşamada alan adı + HTTPS (ör. Caddy / Let's Encrypt) kullan.

## Hesaplar, sıralama ve sayaç

- **İlk açılışta hesap oluştur.** Sunucudaki ilk hesap davet kodu istemez ve tek kullanıcılı sürümden kalan bütün verileri (sorular, denemeler, XP, seri) üstlenir.
- **Arkadaşlar** `server/.env` içindeki `INVITE_CODE` ile hesap açar. Herkes yalnızca kendi verisini görür; ortak olan tek şey **Sıralama** ekranıdır (haftalık XP, pazartesi sıfırlanır; ayrıca tüm zamanlar).
- **Sayaç (pomodoro):** Ana sayfadaki "Bugünkü çalışma" kartından açılır. Varsayılan 25/5 dakika; süreler sayaç ekranından değişir. Uygulama arka plandayken de doğru sayar, süre bitince bildirim gelir. 5 dakikadan uzun tamamlanan her odak +20 XP kazandırır.
- **Seri:** Gün içinde en az bir tamamlanmış pomodoro ya da bugünün tekrar listesinin bitirilmesi günü seriye sayar.
- **Rozetler:** İlk deneme, 7 ve 30 günlük seri, 100 ve 500 soru, konu ustası (bir konuda 10 doğru tekrar). Profil ekranında görünür.

## Şıklar ve Lumi

- **Şıklar:** Çözülen sorunun şıkları sorunun altında düğme olarak çıkar. Kendi cevabını seçersin, doğru mu yanlış mı olduğuna uygulama karar verir. Tekrarda şıkkı en başta seçersin; "Bilmiyorum" yanlış sayılır.
- **Cevap anahtarı:** Çözüm yanlışsa "Cevap anahtarı farklı mı?" ile doğru şıkkı gir. İlk cevabın yeniden değerlendirilir, tekrar listesi de ona göre güncellenir.
- **Lumi'ye sor:** Ana sayfadaki Lumi kartından açılan sohbet. Lumi serini, tekrarlarını, denemelerini ve en çok net kaybettiğin konuları bilir; cevaplar yazılarak akar. Günde 60 mesaj. "Anlamadım" sohbeti de aynı şekilde akar.
- **Lumi'nin hâlleri:** El sallar, sevinir, üzülür, düşünür, okur, uyur, odaklanır, mola verir, tezahürat yapar… Hangi anda hangisinin görüneceği `app/src/components/mascot/poses.ts` dosyasında.

## Demo modu (sunucusuz)

`EXPO_PUBLIC_API_URL` boşsa (ya da `EXPO_PUBLIC_DEMO=1` ise) uygulama **demo modunda** açılır: sunucuya hiç bağlanmaz, 12 örnek soru (çözümleri bağımsız olarak kontrol edildi), birkaç haftalık örnek geçmiş, tekrar kuyruğu ve 11 örnek deneme ile çalışır. Ana sayfada ve Profil'de "Demo modu" kartı görünür. Yaptıkların bellekte tutulur, uygulama kapanınca sıfırlanır.

- Expo Go'da denemek için: `app/.env` olmadan `npx expo start` (veya `.env` içinde `EXPO_PUBLIC_DEMO=1`).
- **Örnek soruyu çöz** butonu bir örnek soruyu kırpma ekranına getirir; kendi fotoğrafını yüklersen de demo bir örnek soruyla cevap verir.
- `EXPO_PUBLIC_DEMO=0` yazarsan adres boşken de demo açılmaz (eksik ayar uyarısı görünür).

## Tarayıcı önizlemesi

Uygulamanın demo modundaki web sürümü tek bir HTML dosyası olarak üretilebilir (JS, fontlar ve görseller içine gömülü):

```bash
cd app && npm run build:preview   # → app/web-build/derece-preview.html
```

`derece-preview-full.html` tam bir HTML belgesidir; dosyadan (`file://`) değil, http üzerinden aç: `python3 -m http.server -d web-build` → `http://localhost:8000/derece-preview-full.html`. `.env` okunmaz ve Metro'ya boş bir önbellek verilir, yani dosyaya sunucu adresi ya da anahtar girmez. Kamera tarayıcıda çalışmaz; galeri ve örnek soru çalışır.

## iPad'e (veya iPhone'a) kurulum

Dört yol var; en kolaydan en kalıcıya:

1. **Hemen, hiçbir şey kurmadan:** claude.ai'deki önizleme bağlantısını iPad'de Safari'de aç → **Paylaş → Ana Ekrana Ekle**. Ana ekranda simgesi olur; açmak için internet ve claude.ai oturumu gerekir.
2. **Kalıcı web uygulaması (önerilen, ücretsiz, sunucusuz):**
   ```bash
   cd app && npm run build:preview      # → app/web-build/pwa/
   ```
   `web-build/pwa` klasörünü HTTPS veren bir yere, **alan adının köküne** koy. En kolayı [Netlify Drop](https://app.netlify.com/drop): klasörü sürükle bırak, sana `https://...netlify.app` adresi verir. iPad'de Safari ile aç → **Paylaş → Ana Ekrana Ekle**. Tam ekran açılır, ikonu vardır, bir kez açıldıktan sonra internetsiz de çalışır (demo verileriyle). Kamera yerine galeriden seçim çalışır.
3. **Expo Go (geliştirirken):** iPad'e App Store'dan Expo Go'yu kur. Bilgisayarda `cd app && EXPO_PUBLIC_DEMO=1 npx expo start --tunnel` → iPad kamerasıyla QR kodu okut. Animasyonlar, titreşim ve bildirimler gerçek cihazdaki gibi çalışır; bilgisayar açık olmalı.
4. **Gerçek uygulama (.ipa):** Apple Developer hesabı (yıllık 99 $) ve ücretsiz bir Expo hesabı gerekir.
   ```bash
   npm i -g eas-cli && cd app
   eas login
   eas device:create          # iPad'i kaydet (çıkan bağlantıyı iPad'de aç)
   eas build -p ios --profile demo      # sunucusuz demo sürümü
   eas build -p ios --profile preview   # sunucuya bağlanan sürüm (.env'deki adresle)
   ```
   Derleme bitince verilen bağlantıyı iPad'de açıp kur. Ücretsiz Apple hesabıyla kurmak için Mac'te `npx expo run:ios --device` de olur (7 günde bir yeniden kurulur).

Not: Sunucuya bağlı sürümü .ipa olarak kurarken iOS düz `http://` adreslerini engeller; o aşamada sunucuya alan adı ve HTTPS (ör. Caddy) ekle.

## Konu listesi

`server/src/topics.ts` ve `app/src/data/topics.ts` aynı dosyadır. Birini düzenle, diğerine kopyala:

```bash
cp server/src/topics.ts app/src/data/topics.ts
```

Soru kaydedilmiş bir konunun `id`'sini değiştirme veya silme; adını (`topic`, `subtopic`) serbestçe değiştirebilirsin.

## Geliştirme

```bash
cd server && npx tsc --noEmit && npm test   # testler: geçici veritabanı + sahte AI, gerçek API çağrısı yok
cd app && npx tsc --noEmit
```

Matematik gösterimi (KaTeX + markdown) çevrimdışı çalışır: KaTeX ve fontları `app/src/components/math/mathHtml.generated.ts` içine gömülüdür. `katex` veya `marked` sürümünü güncellersen `cd app && npm run build:math` çalıştır.

Tasarım: renkler, fontlar (Poppins arayüz, Lora başlıklar ve çözüm metni), boşluklar ve animasyon süreleri `app/src/theme.ts` içinde. İkonlar Lucide'den (ISC lisansı) `app/src/components/icons/icons.generated.ts` dosyasına alınır; yeni ikon için `scripts/build-icons.mjs` listesine ekleyip `npm run build:icons` çalıştır. Animasyonlar iOS'taki "Hareketi Azalt" ayarına uyar.
