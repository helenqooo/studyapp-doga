# Soru bankası (kitaplardan kesilen sorular)

Kitaplar PDF olarak gelir; `tools/bank/cut.py` her soruyu tek tek keser ve **ders → konu → test** düzeninde klasörler. Uygulama, bu klasörleri (zip) içe aktaracak.

## Klasör düzeni

```
bank/
  3d-tyt-matematik/                 ← kitap (book id)
    manifest.json                   ← bütün sorular, konu id'leri, cevap anahtarı
    index.html                      ← kesimleri gözle kontrol etmek için kontak sayfası
    tyt-mat-uslu-sayilar/           ← konu id'si (app/src/data/topics.ts ile aynı)
      test-01/q-01.png … q-16.png
      test-02/q-01.png …
    tyt-mat-koklu-sayilar/
      test-01/…
    unmapped/<baslik>/…             ← başlığı konuyla eşleşmeyen sayfalar (elle düzeltilir)
  3d-tyt-matematik.zip              ← --zip ile aynı ağacın zip'i
```

## manifest.json

```json
{
  "format": "lumi-bank/1",
  "book": { "id": "3d-tyt-matematik", "title": "3D TYT Matematik", "exam": "TYT", "subject": "Temel Matematik", "source": "kitap.pdf", "dpi": 200 },
  "questions": [
    {
      "id": "3d-tyt-matematik-t01-q07",
      "exam": "TYT", "subject": "Temel Matematik",
      "topicId": "tyt-mat-uslu-sayilar",
      "topicHeader": "ÜSLÜ SAYILAR",
      "test": 1, "number": 7, "page": 12,
      "image": "tyt-mat-uslu-sayilar/test-01/q-07.png",
      "bbox": [40.0, 225.4, 291.6, 402.0],
      "answerKey": "C"
    }
  ],
  "unmatchedHeaders": {}
}
```

- `topicId` her zaman `topics.ts` içindeki bir id'dir (yoksa `null`, klasör `unmapped/` altında).
- `bbox` PDF noktası cinsinden; görsel yeniden kesilmek istenirse kaynağı gösterir.
- `answerKey` kitabın "CEVAP ANAHTARI" sayfasından okunur; okunamazsa `null`.

## Kesme aracı

```
python3 tools/bank/cut.py KITAP.pdf --exam TYT --subject "Temel Matematik" --out bank --zip
```

Önce `--dry-run` ile sayfa sayfa kaç soru bulunduğunu ve başlıkların hangi konuya eşlendiğini gör. Eşleşmeyen başlık varsa:

```
--map "Üslü İfadeler=tyt-mat-uslu-sayilar"
```

Diğer seçenekler: `--pages 5-120` (yalnız bu sayfalar), `--dpi 200`, `--margin 6`, `--no-trim`, `--title`, `--book-id`.

Gerekenler: `python3 -m pip install pdfplumber pillow` ve poppler (`pdftoppm`).

## Nasıl çalışır

1. Sayfadaki soru numaraları (`12.` / `12)`) sütunun sol kenarında aranır; sayılar sırayla artmalı (yeni testte 1'e döner).
2. İlk soru numarasının üstünde kalan bant başlıktır: içinden `TEST n` ve konu adı (en büyük punto) okunur. Başlıksız sayfa bir önceki testin devamıdır.
3. Soru kutusu: numarasından aynı sütundaki sonraki numaraya (ya da sütunun sonuna) kadar, sütun genişliğinde. Beyaz kenarlar kırpılır.
4. Konu adı `topics.ts` etiketleriyle Türkçe harf farkına bakmadan bulanık eşlenir (eşik 0,62).
5. "CEVAP ANAHTARI" sayfalarındaki `1-C 2-E …` dizileri konu + test başlığına göre okunur.

## Uygulamaya aktarım (sonraki faz)

Zip, sunucuya yüklenir (`POST /books`): sorular `books`/`tests`/`bank_questions` tablolarına, görseller `server/data/books/<book>/` altına. Çözüm ve ipuçları o soru ilk açıldığında üretilir (tembel), cevap anahtarı kitaptan gelir; yanlışlar normal tekrar kuyruğuna girer.
