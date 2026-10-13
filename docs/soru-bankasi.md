# Soru bankası: kitaptan konu/test klasörlerine

Bir soru bankası PDF'i, her sorusu ayrı bir görsel olacak şekilde kesilir ve **Sınav / Ders / Konu / Zorluk / Test** düzeninde bir zip'e konur. Zip, uygulama soru bankasını içe aktarmaya hazır olduğunda kullanılır.

Kitap içeriği (PDF, kesimler, zip) **depoya girmez**: kitaplar telifli ve kişisel çalışma içindir. Depoda yalnızca betikler (`tools/bank/`) ve her kitabın içindekiler sayfası (`tools/bank/books/<kitap>.json`) durur.

## Zip'in düzeni

```
Lumi Soru Bankası/
  BENİOKU.txt
  index.html            ← tarayıcıda aç: konu, zorluk, "sadece çıkmış" süzgeçleri
  manifest.json         ← uygulamanın içe aktaracağı liste
  TYT/
    Türkçe/01 Sözcükte Anlam/ …           (bütün dersler ve konular, boş olsa da)
    Temel Matematik/
      11 Üslü Sayılar/
        1 Kolay/
          345 TYT Mat · Test 01/
            Soru 01.webp … Soru 12.webp
            Soru 07 (Çıkmış TYT 2018).webp
            cevap-anahtari.txt
        4 Orta-Zor/345 TYT Mat · ÖSYM Tadında 03/
        Orijinal Sorular (ÖSYM-MEB)/345 TYT Mat · Orijinal Sorular 01/
        Çıkmış Sorular/TYT 2018 · 345 TYT Mat · Test 01 · Soru 07.webp   (kopyalar)
      16 Problemler/03 Yaş Problemleri/ …
  AYT/ …
```

- Konu klasörleri `app/src/data/topics.ts`'ten gelir, müfredat sırasıyla numaralıdır. Alt başlıklı konular (Problemler › Yaş, Tarih › Millî Mücadele) grubunun klasörüne girer.
- Zorluk klasörü: "1 Kolay" … "5 Zor", kitabın her testin başına bastığı göstergeden okunur. Göstergesi olmayan gerçek sınav soruları "Orijinal Sorular (ÖSYM-MEB)" klasörüne girer.
- Test klasörü: kitap · (konudan farklıysa kitabın bölümü) · seri ve numara. **Seri:** "Test" (konu tanıma ve klasik sorular), "ÖSYM Tadında" ve "Orijinal Sorular" (MEB/ÖSYM).
- Her konunun "Çıkmış Sorular" klasörü o konudaki çıkmış soruların kopyalarını toplar.
- Çıkmış sorular ("ÇIKMIŞ SORU · TYT 2018" çerçeveli) dosya adında ve manifest'te işaretlidir.

## manifest.json

```json
{
  "format": "lumi-bank/1",
  "book": { "id": "345-tyt-matematik", "title": "…", "short": "345 TYT Mat", "exam": "TYT", "subject": "Temel Matematik" },
  "topics": [{ "id": "tyt-mat-uslu-sayilar", "topic": "Üslü Sayılar", "folder": "TYT/Temel Matematik/11 Üslü Sayılar", "units": [{ "id": "…", "name": "Üslü Denklemler" }] }],
  "tests": [{ "key": "t062", "topicId": "…", "bookSection": "Üslü Sayılar", "series": "Test", "number": 1, "difficulty": "Kolay", "difficultyScore": 1.0, "folder": "…", "questions": ["…"] }],
  "questions": [{
    "id": "345-tyt-matematik-t062-q07", "topicId": "tyt-mat-uslu-sayilar", "unitId": "tyt-mat-uslu-sayilar-uslu-denklemler",
    "series": "Test", "test": 1, "number": 7, "answer": "C",
    "difficulty": "Kolay", "difficultyScore": 1.0, "pastExam": "TYT 2018", "marked": false,
    "page": 128, "bbox": [58.0, 300.2, 322.0, 470.5], "image": "TYT/…/Soru 07 (Çıkmış TYT 2018).webp", "width": 733, "height": 470
  }]
}
```

- `topicId`: sorunun gerçek konusu. Bir bölüm iki konuyu kapsıyorsa (ör. Yüzde ile Kâr–Zarar, Sayma ile Olasılık) soru başına seçilir. Test klasörü bölümün ana konusunda kalır.
- `unitId`: konunun içindeki ince başlık (`topics.ts` → `UNITS`).
- `difficultyScore`: 1 (Kolay) ile 5 (Zor) arası, yarım adımlarla. Kitabın ibresi bazen iki etiketin arasında durur. Etiket yazılırken arada kalan zor tarafa yuvarlanır.
- `answer`: kitabın sayfa altındaki cevap anahtarından gelir.
- `marked`: kontrolde sorunun üstünde el yazısı ya da işaret görüldüyse açıklaması.

## Kesim akışı (`tools/bank/`)

Gerekenler: poppler (`pdftoppm`), `python3 -m pip install pdfplumber pillow numpy`.

1. **Sayfa görselleri:** `pdftoppm -cropbox -r 200 -png KITAP.pdf r200/p`
2. **Metin katmanı:** `python3 scan.py KITAP.pdf work/scan.json`. Her sayfanın kelimeleri, konumları ve resimleri çıkarılır.
3. **Zorluk göstergeleri:** `python3 gauge.py work/gauges.json r200 work/gauge-read.json [sheet.png]`
   - İbrenin ucunun hangi renk bandına (yeşil → mor) baktığı okunur.
4. **Kutular:** `python3 boxes.py books/KITAP.json work/scan.json work/gauge-read.json work/boxes.json`
   - Soru numaraları sütunun sol kenarında aranır ve sayfa altındaki cevap anahtarıyla eşleştirilir. Numara anahtarda yoksa soru sayılmaz.
   - Numaralama 1'e dönünce yeni test başlar. Seri ve numara sayfa başlığından okunur.
   - Çıkmış soru etiketi ("TYT - 2018") sorunun içindeki metinden alınır.
5. **Kesim:** `python3 render.py crops work/boxes.json r200 crops`
   - Kutu, sayfanın arka plan resmine çizilmiş çerçeve ve şekillere değdikçe büyür, ama sütununu ve komşu soruyu geçmez. Sonra beyaz kenarlar kırpılır.
   - Bu kitapta "ÖSYM köşesi" çerçeveleri metin katmanında yok, arka plan resminin içinde.
6. **Gözle kontrol:** `render.py overlay` (ızgaralı sayfa) ve `render.py sheets` (test başına kontak sayfası), ardından `review-workflow.js` çalıştırılır.
   - Ajanlar her testin kesimlerine bakar. Yanlış kesileni ızgaradan okudukları kutuyla `render.py one` kullanarak yeniden keser ve sonucu görerek doğrular.
   - Düzeltilen her kesime ikinci bir ajan bakar.
7. **Uygula:** `python3 apply_review.py work/boxes.json work/boxes.reviewed.json <journal…>`, ardından düzeltilmiş kutularla yeniden `render.py crops`.
8. **Alt konular:** Soru metinleri ve konunun `UNITS` listesi ajanlara verilir, her soru için `topicId` ve `unitId` seçilir (`units.json`).
9. **Paket:** `python3 package.py books/KITAP.json work/boxes.reviewed.json crops ../../app/src/data/topics.ts OUT [units.json]`
   - `--split "01-09;10-14,16-18;15;19-27"`: zip'i konu klasörü numaralarına göre parçalara böler (dosya gönderme sınırı 30 MB). Her parça kendi `manifest.json`'u (`part: {index, of, topics}`), `index.html`'i ve `BENİOKU.txt`'siyle tek başına açılır; uygulama parçaları birleştirerek içe aktarır.

Yeni kitap için `books/` altına içindekiler sayfasını (bölüm adı, başlangıç sayfası, konu id'si) yazmak yeterli. Seri adları ve gösterge farklı bir yayınevinde farklıysa `boxes.py` içindeki `series_of`'a ve `gauge.py`'ye bakılır.

## Uygulamaya aktarım (sonraki faz)

Zip sunucuya yüklenecek (`POST /books`). Kitaplar, testler ve sorular kendi tablolarına girecek, görseller `server/data/books/<kitap>/` altına. Cevap anahtarı kitaptan gelir. Çözüm ve ipuçları soru ilk açıldığında üretilir. Yanlışlar normal tekrar kuyruğuna girer.

Bir kitap, onu yükleyen hesaba aittir. Diğer kullanıcılar o kitabı ve sorularını görmez, sıralamaya yalnızca XP girer. Kişisel kullanım için çoğaltma serbesttir ama başkalarına dağıtmak yayınevinin iznine bağlıdır. Çıkmış sorular için de durum aynıdır: ÖSYM kitapçıkları izinsiz çoğaltmayı ve yayımlamayı yasaklar. Bu yüzden her kullanıcı kendi kitabını yükler. Uygulamaya hazır soru konacaksa önce hak sahibinden yazılı izin alınır.
