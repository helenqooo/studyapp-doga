# Derece

YKS (TYT + AYT Sayısal) için kişisel çalışma uygulaması. Proje spesifikasyonu: [`CLAUDE.md`](CLAUDE.md).

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
| `APP_TOKEN` | Uygulamanın her istekte gönderdiği gizli anahtar. Üret: `openssl rand -hex 32` |
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
| `EXPO_PUBLIC_APP_TOKEN` | `server/.env` içindeki `APP_TOKEN` ile aynı. |

- `.env` değişince `npx expo start --tunnel -c` ile yeniden başlat (`EXPO_PUBLIC_*` değerleri paketlemede gömülür).
- Bağlantıyı kontrol etmek için: **Profil → Bağlantıyı test et**.
- `EXPO_PUBLIC_APP_TOKEN` uygulama paketinin içinde bulunur; bu yüzden asıl gizli olan `ANTHROPIC_API_KEY` sadece sunucuda tutulur.
- İleride .ipa olarak kurarken düz `http://` adresi iOS tarafından engellenir; o aşamada alan adı + HTTPS (ör. Caddy / Let's Encrypt) kullan.

## Konu listesi

`server/src/topics.ts` ve `app/src/data/topics.ts` aynı dosyadır. Birini düzenle, diğerine kopyala:

```bash
cp server/src/topics.ts app/src/data/topics.ts
```

Soru kaydedilmiş bir konunun `id`'sini değiştirme veya silme; adını (`topic`, `subtopic`) serbestçe değiştirebilirsin.

## Geliştirme

```bash
cd server && npx tsc --noEmit
cd app && npx tsc --noEmit
```

Matematik gösterimi (KaTeX + markdown) çevrimdışı çalışır: KaTeX ve fontları `app/src/components/math/mathHtml.generated.ts` içine gömülüdür. `katex` veya `marked` sürümünü güncellersen `cd app && npm run build:math` çalıştır.
