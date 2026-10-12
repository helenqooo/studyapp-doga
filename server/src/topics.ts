// YKS topic taxonomy (TYT + AYT Sayısal).
//
// This file is hand-editable and MUST stay identical in both places:
//   server/src/topics.ts  <->  app/src/data/topics.ts
// After editing one, copy it over the other (see README).
//
// Rules:
// - `id` is permanent once questions reference it. Rename labels freely, but don't
//   change or delete an id that is already in use (old questions would lose their topic).
// - `subject` is the exam section used for deneme scoring (TYT: Türkçe, Sosyal,
//   Temel Matematik, Fen; AYT: Matematik, Fizik, Kimya, Biyoloji).
// - For TYT Sosyal / Fen, `topic` is the discipline (Tarih, Fizik, ...) and
//   `subtopic` is the actual konu.
// - The AI classifier may only pick ids from this list.

export type Exam = 'TYT' | 'AYT';

export type Subject =
  | 'Türkçe'
  | 'Sosyal'
  | 'Temel Matematik'
  | 'Fen'
  | 'Matematik'
  | 'Fizik'
  | 'Kimya'
  | 'Biyoloji';

export interface Topic {
  id: string;
  exam: Exam;
  subject: Subject;
  topic: string;
  subtopic?: string;
}

export const SUBJECTS_BY_EXAM: Record<Exam, Subject[]> = {
  TYT: ['Türkçe', 'Sosyal', 'Temel Matematik', 'Fen'],
  AYT: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
};

export const TOPICS: Topic[] = [
  // ───────────── TYT · Türkçe ─────────────
  { id: 'tyt-tr-sozcukte-anlam', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcükte Anlam' },
  { id: 'tyt-tr-soz-yorumu', exam: 'TYT', subject: 'Türkçe', topic: 'Söz Yorumu (Deyim ve Atasözü)' },
  { id: 'tyt-tr-cumlede-anlam', exam: 'TYT', subject: 'Türkçe', topic: 'Cümlede Anlam' },
  { id: 'tyt-tr-paragraf-ana-dusunce', exam: 'TYT', subject: 'Türkçe', topic: 'Paragraf', subtopic: 'Ana Düşünce ve Konu' },
  { id: 'tyt-tr-paragraf-yardimci-dusunce', exam: 'TYT', subject: 'Türkçe', topic: 'Paragraf', subtopic: 'Yardımcı Düşünce' },
  { id: 'tyt-tr-paragraf-yapisi', exam: 'TYT', subject: 'Türkçe', topic: 'Paragraf', subtopic: 'Paragraf Yapısı (Akış, Sıralama, Bölme)' },
  { id: 'tyt-tr-paragraf-anlatim', exam: 'TYT', subject: 'Türkçe', topic: 'Paragraf', subtopic: 'Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları' },
  { id: 'tyt-tr-ses-bilgisi', exam: 'TYT', subject: 'Türkçe', topic: 'Ses Bilgisi' },
  { id: 'tyt-tr-yazim-kurallari', exam: 'TYT', subject: 'Türkçe', topic: 'Yazım Kuralları' },
  { id: 'tyt-tr-noktalama', exam: 'TYT', subject: 'Türkçe', topic: 'Noktalama İşaretleri' },
  { id: 'tyt-tr-sozcukte-yapi', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcükte Yapı (Kök ve Ekler)' },
  { id: 'tyt-tr-isimler', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcük Türleri', subtopic: 'İsimler' },
  { id: 'tyt-tr-sifatlar', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcük Türleri', subtopic: 'Sıfatlar' },
  { id: 'tyt-tr-zamirler', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcük Türleri', subtopic: 'Zamirler' },
  { id: 'tyt-tr-zarflar', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcük Türleri', subtopic: 'Zarflar' },
  { id: 'tyt-tr-edat-baglac-unlem', exam: 'TYT', subject: 'Türkçe', topic: 'Sözcük Türleri', subtopic: 'Edat, Bağlaç, Ünlem' },
  { id: 'tyt-tr-fiil-kip-kisi', exam: 'TYT', subject: 'Türkçe', topic: 'Fiiller', subtopic: 'Fiilde Anlam (Kip ve Kişi)' },
  { id: 'tyt-tr-ek-fiil', exam: 'TYT', subject: 'Türkçe', topic: 'Fiiller', subtopic: 'Ek Fiil' },
  { id: 'tyt-tr-fiilimsiler', exam: 'TYT', subject: 'Türkçe', topic: 'Fiiller', subtopic: 'Fiilimsiler' },
  { id: 'tyt-tr-fiilde-cati', exam: 'TYT', subject: 'Türkçe', topic: 'Fiiller', subtopic: 'Fiilde Çatı' },
  { id: 'tyt-tr-cumlenin-ogeleri', exam: 'TYT', subject: 'Türkçe', topic: 'Cümlenin Ögeleri' },
  { id: 'tyt-tr-cumle-turleri', exam: 'TYT', subject: 'Türkçe', topic: 'Cümle Türleri' },
  { id: 'tyt-tr-anlatim-bozukluklari', exam: 'TYT', subject: 'Türkçe', topic: 'Anlatım Bozuklukları' },

  // ───────────── TYT · Sosyal · Tarih ─────────────
  { id: 'tyt-sos-tar-tarih-ve-zaman', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Tarih ve Zaman' },
  { id: 'tyt-sos-tar-ilk-donemler', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'İnsanlığın İlk Dönemleri' },
  { id: 'tyt-sos-tar-orta-cag', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: "Orta Çağ'da Dünya" },
  { id: 'tyt-sos-tar-ilk-turk-devletleri', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'İlk ve Orta Çağlarda Türk Dünyası' },
  { id: 'tyt-sos-tar-islam-medeniyeti', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'İslam Medeniyetinin Doğuşu' },
  { id: 'tyt-sos-tar-turk-islam-devletleri', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'İlk Türk-İslam Devletleri' },
  { id: 'tyt-sos-tar-selcuklu-turkiyesi', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Selçuklu Türkiyesi' },
  { id: 'tyt-sos-tar-osmanli-kurulus', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Beylikten Devlete Osmanlı (1302-1453)' },
  { id: 'tyt-sos-tar-osmanli-yukselme', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Dünya Gücü Osmanlı (1453-1595)' },
  { id: 'tyt-sos-tar-osmanli-teskilat', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Osmanlı Merkez Teşkilatı ve Toplum Düzeni' },
  { id: 'tyt-sos-tar-osmanli-1595-1774', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Değişen Dünya Dengeleri ve Osmanlı (1595-1774)' },
  { id: 'tyt-sos-tar-avrupa-osmanli', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Değişim Çağında Avrupa ve Osmanlı' },
  { id: 'tyt-sos-tar-osmanli-1774-1914', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Denge Stratejisi (1774-1914)' },
  { id: 'tyt-sos-tar-devrimler-cagi', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Devrimler Çağı, Sermaye ve Emek' },
  { id: 'tyt-sos-tar-20yy-osmanli', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'XX. Yüzyıl Başlarında Osmanlı ve Dünya' },
  { id: 'tyt-sos-tar-milli-mucadele', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Millî Mücadele' },
  { id: 'tyt-sos-tar-ataturk-inkilap', exam: 'TYT', subject: 'Sosyal', topic: 'Tarih', subtopic: 'Atatürkçülük ve Türk İnkılabı' },

  // ───────────── TYT · Sosyal · Coğrafya ─────────────
  { id: 'tyt-sos-cog-doga-insan', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Doğa ve İnsan' },
  { id: 'tyt-sos-cog-dunyanin-hareketleri', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: "Dünya'nın Şekli ve Hareketleri" },
  { id: 'tyt-sos-cog-cografi-konum', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Coğrafi Konum' },
  { id: 'tyt-sos-cog-harita', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Harita Bilgisi' },
  { id: 'tyt-sos-cog-atmosfer-sicaklik', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Atmosfer ve Sıcaklık' },
  { id: 'tyt-sos-cog-basinc-ruzgar', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Basınç ve Rüzgârlar' },
  { id: 'tyt-sos-cog-nem-yagis', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Nem, Yağış ve Buharlaşma' },
  { id: 'tyt-sos-cog-iklim-tipleri', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'İklim Tipleri' },
  { id: 'tyt-sos-cog-ic-dis-kuvvetler', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'İç ve Dış Kuvvetler' },
  { id: 'tyt-sos-cog-su-toprak-bitki', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Su, Toprak ve Bitkiler' },
  { id: 'tyt-sos-cog-turkiye-yer-sekilleri', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: "Türkiye'nin Yer Şekilleri" },
  { id: 'tyt-sos-cog-nufus', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Nüfus' },
  { id: 'tyt-sos-cog-goc', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Göç' },
  { id: 'tyt-sos-cog-yerlesme', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Yerleşme' },
  { id: 'tyt-sos-cog-ekonomik-faaliyetler', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Ekonomik Faaliyetler' },
  { id: 'tyt-sos-cog-bolgeler', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Bölgeler ve Uluslararası Ulaşım Hatları' },
  { id: 'tyt-sos-cog-cevre-afetler', exam: 'TYT', subject: 'Sosyal', topic: 'Coğrafya', subtopic: 'Çevre, Toplum ve Doğal Afetler' },

  // ───────────── TYT · Sosyal · Felsefe ─────────────
  { id: 'tyt-sos-fel-felsefeyi-tanima', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Felsefeyi Tanıma' },
  { id: 'tyt-sos-fel-felsefe-ile-dusunme', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Felsefe ile Düşünme' },
  { id: 'tyt-sos-fel-varlik', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Varlık Felsefesi' },
  { id: 'tyt-sos-fel-bilgi', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Bilgi Felsefesi' },
  { id: 'tyt-sos-fel-bilim', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Bilim Felsefesi' },
  { id: 'tyt-sos-fel-ahlak', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Ahlak Felsefesi' },
  { id: 'tyt-sos-fel-din', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Din Felsefesi' },
  { id: 'tyt-sos-fel-siyaset', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Siyaset Felsefesi' },
  { id: 'tyt-sos-fel-sanat', exam: 'TYT', subject: 'Sosyal', topic: 'Felsefe', subtopic: 'Sanat Felsefesi' },

  // ───────────── TYT · Sosyal · Din Kültürü ─────────────
  { id: 'tyt-sos-din-bilgi-inanc', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Bilgi ve İnanç' },
  { id: 'tyt-sos-din-islam-ibadet', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'İslam ve İbadet' },
  { id: 'tyt-sos-din-ahlak-degerler', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Ahlak ve Değerler' },
  { id: 'tyt-sos-din-allah-insan', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Allah-İnsan İlişkisi' },
  { id: 'tyt-sos-din-hz-muhammed', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Hz. Muhammed ve Örnekliği' },
  { id: 'tyt-sos-din-vahiy-akil', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Vahiy ve Akıl' },
  { id: 'tyt-sos-din-yorumlar', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'İslam Düşüncesinde Yorumlar' },
  { id: 'tyt-sos-din-kultur-medeniyet', exam: 'TYT', subject: 'Sosyal', topic: 'Din Kültürü', subtopic: 'Din, Kültür ve Medeniyet' },

  // ───────────── TYT · Temel Matematik ─────────────
  { id: 'tyt-mat-temel-kavramlar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Temel Kavramlar' },
  { id: 'tyt-mat-sayi-basamaklari', exam: 'TYT', subject: 'Temel Matematik', topic: 'Sayı Basamakları' },
  { id: 'tyt-mat-bolme-bolunebilme', exam: 'TYT', subject: 'Temel Matematik', topic: 'Bölme ve Bölünebilme' },
  { id: 'tyt-mat-ebob-ekok', exam: 'TYT', subject: 'Temel Matematik', topic: 'EBOB – EKOK' },
  { id: 'tyt-mat-rasyonel-sayilar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Rasyonel Sayılar' },
  { id: 'tyt-mat-basit-esitsizlikler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Basit Eşitsizlikler' },
  { id: 'tyt-mat-mutlak-deger', exam: 'TYT', subject: 'Temel Matematik', topic: 'Mutlak Değer' },
  { id: 'tyt-mat-uslu-sayilar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Üslü Sayılar' },
  { id: 'tyt-mat-koklu-sayilar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Köklü Sayılar' },
  { id: 'tyt-mat-carpanlara-ayirma', exam: 'TYT', subject: 'Temel Matematik', topic: 'Çarpanlara Ayırma' },
  { id: 'tyt-mat-oran-oranti', exam: 'TYT', subject: 'Temel Matematik', topic: 'Oran – Orantı' },
  { id: 'tyt-mat-denklem-cozme', exam: 'TYT', subject: 'Temel Matematik', topic: 'Denklem Çözme' },
  { id: 'tyt-mat-problem-sayi', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Sayı Problemleri' },
  { id: 'tyt-mat-problem-kesir', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Kesir Problemleri' },
  { id: 'tyt-mat-problem-yas', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Yaş Problemleri' },
  { id: 'tyt-mat-problem-hareket', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Hareket Problemleri' },
  { id: 'tyt-mat-problem-isci', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'İşçi ve Havuz Problemleri' },
  { id: 'tyt-mat-problem-yuzde', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Yüzde Problemleri' },
  { id: 'tyt-mat-problem-kar-zarar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Kâr – Zarar Problemleri' },
  { id: 'tyt-mat-problem-karisim', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Karışım Problemleri' },
  { id: 'tyt-mat-problem-grafik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Grafik Problemleri' },
  { id: 'tyt-mat-problem-rutin-olmayan', exam: 'TYT', subject: 'Temel Matematik', topic: 'Problemler', subtopic: 'Rutin Olmayan Problemler (Mantıksal Akıl Yürütme)' },
  { id: 'tyt-mat-kumeler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Kümeler ve Kartezyen Çarpım' },
  { id: 'tyt-mat-mantik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Mantık' },
  { id: 'tyt-mat-fonksiyonlar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Fonksiyonlar' },
  { id: 'tyt-mat-polinomlar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Polinomlar' },
  { id: 'tyt-mat-ikinci-derece', exam: 'TYT', subject: 'Temel Matematik', topic: '2. Dereceden Denklemler' },
  { id: 'tyt-mat-perm-komb', exam: 'TYT', subject: 'Temel Matematik', topic: 'Permütasyon ve Kombinasyon' },
  { id: 'tyt-mat-olasilik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Olasılık' },
  { id: 'tyt-mat-veri-istatistik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Veri ve İstatistik' },

  // ───────────── TYT · Temel Matematik · Geometri ─────────────
  { id: 'tyt-geo-dogruda-ucgende-acilar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Doğruda ve Üçgende Açılar' },
  { id: 'tyt-geo-dik-ozel-ucgenler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Dik ve Özel Üçgenler' },
  { id: 'tyt-geo-ikizkenar-eskenar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'İkizkenar ve Eşkenar Üçgen' },
  { id: 'tyt-geo-aciortay-kenarortay', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Üçgende Açıortay ve Kenarortay' },
  { id: 'tyt-geo-eslik-benzerlik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Üçgende Eşlik ve Benzerlik' },
  { id: 'tyt-geo-ucgende-alan', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Üçgende Alan' },
  { id: 'tyt-geo-aci-kenar', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Açı-Kenar Bağıntıları' },
  { id: 'tyt-geo-cokgenler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Çokgenler' },
  { id: 'tyt-geo-dortgenler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Dörtgenler ve Özel Dörtgenler' },
  { id: 'tyt-geo-cember-daire', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Çember ve Daire' },
  { id: 'tyt-geo-analitik', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Analitik Geometri (Nokta ve Doğru)' },
  { id: 'tyt-geo-kati-cisimler', exam: 'TYT', subject: 'Temel Matematik', topic: 'Geometri', subtopic: 'Katı Cisimler' },

  // ───────────── TYT · Fen · Fizik ─────────────
  { id: 'tyt-fiz-fizik-bilimine-giris', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Fizik Bilimine Giriş' },
  { id: 'tyt-fiz-madde-ozellikleri', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Madde ve Özellikleri' },
  { id: 'tyt-fiz-hareket-kuvvet', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Hareket ve Kuvvet' },
  { id: 'tyt-fiz-is-guc-enerji', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'İş, Güç ve Enerji' },
  { id: 'tyt-fiz-isi-sicaklik', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Isı, Sıcaklık ve Genleşme' },
  { id: 'tyt-fiz-elektrostatik', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Elektrostatik' },
  { id: 'tyt-fiz-elektrik-manyetizma', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Elektrik Akımı ve Manyetizma' },
  { id: 'tyt-fiz-basinc-kaldirma', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Basınç ve Kaldırma Kuvveti' },
  { id: 'tyt-fiz-dalgalar', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Dalgalar' },
  { id: 'tyt-fiz-optik', exam: 'TYT', subject: 'Fen', topic: 'Fizik', subtopic: 'Optik' },

  // ───────────── TYT · Fen · Kimya ─────────────
  { id: 'tyt-kim-kimya-bilimi', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Kimya Bilimi' },
  { id: 'tyt-kim-atom-periyodik', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Atom ve Periyodik Sistem' },
  { id: 'tyt-kim-etkilesimler', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Kimyasal Türler Arası Etkileşimler' },
  { id: 'tyt-kim-maddenin-halleri', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Maddenin Halleri' },
  { id: 'tyt-kim-doga-kimya', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Doğa ve Kimya' },
  { id: 'tyt-kim-temel-kanunlar', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Kimyanın Temel Kanunları' },
  { id: 'tyt-kim-mol', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Mol Kavramı ve Kimyasal Hesaplamalar' },
  { id: 'tyt-kim-tepkimeler', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Kimyasal Tepkimeler' },
  { id: 'tyt-kim-karisimlar', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Karışımlar' },
  { id: 'tyt-kim-asit-baz-tuz', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Asitler, Bazlar ve Tuzlar' },
  { id: 'tyt-kim-her-yerde', exam: 'TYT', subject: 'Fen', topic: 'Kimya', subtopic: 'Kimya Her Yerde' },

  // ───────────── TYT · Fen · Biyoloji ─────────────
  { id: 'tyt-bio-canlilarin-ozellikleri', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Canlıların Ortak Özellikleri' },
  { id: 'tyt-bio-temel-bilesenler', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Canlıların Temel Bileşenleri' },
  { id: 'tyt-bio-hucre', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Hücre ve Organeller' },
  { id: 'tyt-bio-madde-gecisi', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Hücre Zarından Madde Geçişi' },
  { id: 'tyt-bio-siniflandirma', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Canlıların Sınıflandırılması ve Çeşitlilik' },
  { id: 'tyt-bio-hucre-bolunmeleri', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Hücre Bölünmeleri (Mitoz ve Mayoz)' },
  { id: 'tyt-bio-ureme', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Eşeyli ve Eşeysiz Üreme' },
  { id: 'tyt-bio-kalitim', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Kalıtım' },
  { id: 'tyt-bio-ekosistem', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Ekosistem Ekolojisi' },
  { id: 'tyt-bio-cevre-sorunlari', exam: 'TYT', subject: 'Fen', topic: 'Biyoloji', subtopic: 'Güncel Çevre Sorunları' },

  // ───────────── AYT · Matematik ─────────────
  { id: 'ayt-mat-fonksiyonlar', exam: 'AYT', subject: 'Matematik', topic: 'Fonksiyonlar' },
  { id: 'ayt-mat-polinomlar', exam: 'AYT', subject: 'Matematik', topic: 'Polinomlar' },
  { id: 'ayt-mat-ikinci-derece', exam: 'AYT', subject: 'Matematik', topic: 'İkinci Dereceden Denklemler' },
  { id: 'ayt-mat-karmasik-sayilar', exam: 'AYT', subject: 'Matematik', topic: 'Karmaşık Sayılar' },
  { id: 'ayt-mat-parabol', exam: 'AYT', subject: 'Matematik', topic: 'Parabol' },
  { id: 'ayt-mat-esitsizlikler', exam: 'AYT', subject: 'Matematik', topic: 'Eşitsizlikler' },
  { id: 'ayt-mat-perm-komb', exam: 'AYT', subject: 'Matematik', topic: 'Permütasyon ve Kombinasyon' },
  { id: 'ayt-mat-binom', exam: 'AYT', subject: 'Matematik', topic: 'Binom Açılımı' },
  { id: 'ayt-mat-olasilik', exam: 'AYT', subject: 'Matematik', topic: 'Olasılık' },
  { id: 'ayt-mat-trig-fonksiyonlar', exam: 'AYT', subject: 'Matematik', topic: 'Trigonometri', subtopic: 'Trigonometrik Fonksiyonlar' },
  { id: 'ayt-mat-trig-formuller', exam: 'AYT', subject: 'Matematik', topic: 'Trigonometri', subtopic: 'Toplam-Fark ve İki Kat Açı Formülleri' },
  { id: 'ayt-mat-trig-denklemler', exam: 'AYT', subject: 'Matematik', topic: 'Trigonometri', subtopic: 'Trigonometrik Denklemler' },
  { id: 'ayt-mat-trig-teoremler', exam: 'AYT', subject: 'Matematik', topic: 'Trigonometri', subtopic: 'Sinüs ve Kosinüs Teoremleri' },
  { id: 'ayt-mat-logaritma', exam: 'AYT', subject: 'Matematik', topic: 'Üstel ve Logaritmik Fonksiyonlar' },
  { id: 'ayt-mat-diziler', exam: 'AYT', subject: 'Matematik', topic: 'Diziler' },
  { id: 'ayt-mat-toplam-carpim', exam: 'AYT', subject: 'Matematik', topic: 'Toplam ve Çarpım Sembolü' },
  { id: 'ayt-mat-limit', exam: 'AYT', subject: 'Matematik', topic: 'Limit ve Süreklilik' },
  { id: 'ayt-mat-turev-kurallar', exam: 'AYT', subject: 'Matematik', topic: 'Türev', subtopic: 'Türev Alma Kuralları' },
  { id: 'ayt-mat-turev-geometrik', exam: 'AYT', subject: 'Matematik', topic: 'Türev', subtopic: 'Türevin Geometrik Yorumu' },
  { id: 'ayt-mat-turev-uygulamalar', exam: 'AYT', subject: 'Matematik', topic: 'Türev', subtopic: 'Türev Uygulamaları (Maksimum-Minimum, Grafik)' },
  { id: 'ayt-mat-integral-belirsiz', exam: 'AYT', subject: 'Matematik', topic: 'İntegral', subtopic: 'Belirsiz İntegral' },
  { id: 'ayt-mat-integral-belirli', exam: 'AYT', subject: 'Matematik', topic: 'İntegral', subtopic: 'Belirli İntegral ve Alan' },

  // ───────────── AYT · Matematik · Geometri ─────────────
  { id: 'ayt-geo-ucgenler', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Üçgenler (Açı, Benzerlik, Alan)' },
  { id: 'ayt-geo-cokgen-dortgen', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Çokgenler ve Dörtgenler' },
  { id: 'ayt-geo-cember-daire', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Çember ve Daire' },
  { id: 'ayt-geo-analitik-dogru', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Noktanın ve Doğrunun Analitiği' },
  { id: 'ayt-geo-donusum', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Dönüşüm Geometrisi' },
  { id: 'ayt-geo-cember-analitik', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Çemberin Analitik İncelenmesi' },
  { id: 'ayt-geo-kati-cisimler', exam: 'AYT', subject: 'Matematik', topic: 'Geometri', subtopic: 'Katı Cisimler' },

  // ───────────── AYT · Fizik ─────────────
  { id: 'ayt-fiz-vektorler', exam: 'AYT', subject: 'Fizik', topic: 'Vektörler ve Bağıl Hareket' },
  { id: 'ayt-fiz-newton', exam: 'AYT', subject: 'Fizik', topic: "Newton'un Hareket Yasaları" },
  { id: 'ayt-fiz-sabit-ivmeli', exam: 'AYT', subject: 'Fizik', topic: 'Bir Boyutta Sabit İvmeli Hareket' },
  { id: 'ayt-fiz-atislar', exam: 'AYT', subject: 'Fizik', topic: 'İki Boyutta Hareket (Atışlar)' },
  { id: 'ayt-fiz-enerji-hareket', exam: 'AYT', subject: 'Fizik', topic: 'Enerji ve Hareket' },
  { id: 'ayt-fiz-itme-momentum', exam: 'AYT', subject: 'Fizik', topic: 'İtme ve Çizgisel Momentum' },
  { id: 'ayt-fiz-tork-denge', exam: 'AYT', subject: 'Fizik', topic: 'Tork, Denge ve Ağırlık Merkezi' },
  { id: 'ayt-fiz-basit-makineler', exam: 'AYT', subject: 'Fizik', topic: 'Basit Makineler' },
  { id: 'ayt-fiz-elektrik-alan', exam: 'AYT', subject: 'Fizik', topic: 'Elektriksel Kuvvet, Alan ve Potansiyel' },
  { id: 'ayt-fiz-siga', exam: 'AYT', subject: 'Fizik', topic: 'Düzgün Elektrik Alan ve Sığa' },
  { id: 'ayt-fiz-manyetizma', exam: 'AYT', subject: 'Fizik', topic: 'Manyetizma ve Elektromanyetik İndüklenme' },
  { id: 'ayt-fiz-alternatif-akim', exam: 'AYT', subject: 'Fizik', topic: 'Alternatif Akım ve Transformatörler' },
  { id: 'ayt-fiz-cembersel', exam: 'AYT', subject: 'Fizik', topic: 'Düzgün Çembersel Hareket' },
  { id: 'ayt-fiz-donme', exam: 'AYT', subject: 'Fizik', topic: 'Dönme Hareketi ve Açısal Momentum' },
  { id: 'ayt-fiz-kutle-cekim', exam: 'AYT', subject: 'Fizik', topic: 'Kütle Çekim ve Kepler Yasaları' },
  { id: 'ayt-fiz-bhh', exam: 'AYT', subject: 'Fizik', topic: 'Basit Harmonik Hareket' },
  { id: 'ayt-fiz-dalga-mekanigi', exam: 'AYT', subject: 'Fizik', topic: 'Dalga Mekaniği (Kırınım, Girişim, Doppler)' },
  { id: 'ayt-fiz-em-dalgalar', exam: 'AYT', subject: 'Fizik', topic: 'Elektromanyetik Dalgalar' },
  { id: 'ayt-fiz-atom-radyoaktivite', exam: 'AYT', subject: 'Fizik', topic: 'Atom Fiziği ve Radyoaktivite' },
  { id: 'ayt-fiz-gorelilik', exam: 'AYT', subject: 'Fizik', topic: 'Özel Görelilik' },
  { id: 'ayt-fiz-kuantum', exam: 'AYT', subject: 'Fizik', topic: 'Kuantum Fiziğine Giriş (Fotoelektrik, Compton)' },
  { id: 'ayt-fiz-modern-uygulamalar', exam: 'AYT', subject: 'Fizik', topic: 'Modern Fiziğin Teknolojideki Uygulamaları' },

  // ───────────── AYT · Kimya ─────────────
  { id: 'ayt-kim-modern-atom', exam: 'AYT', subject: 'Kimya', topic: 'Modern Atom Teorisi' },
  { id: 'ayt-kim-mol-hesaplamalar', exam: 'AYT', subject: 'Kimya', topic: 'Mol Kavramı ve Kimyasal Hesaplamalar' },
  { id: 'ayt-kim-gazlar', exam: 'AYT', subject: 'Kimya', topic: 'Gazlar' },
  { id: 'ayt-kim-cozeltiler', exam: 'AYT', subject: 'Kimya', topic: 'Sıvı Çözeltiler ve Çözünürlük' },
  { id: 'ayt-kim-enerji', exam: 'AYT', subject: 'Kimya', topic: 'Kimyasal Tepkimelerde Enerji' },
  { id: 'ayt-kim-hiz', exam: 'AYT', subject: 'Kimya', topic: 'Kimyasal Tepkimelerde Hız' },
  { id: 'ayt-kim-denge', exam: 'AYT', subject: 'Kimya', topic: 'Kimyasal Denge' },
  { id: 'ayt-kim-asit-baz-denge', exam: 'AYT', subject: 'Kimya', topic: 'Asit-Baz Dengesi' },
  { id: 'ayt-kim-cozunurluk-denge', exam: 'AYT', subject: 'Kimya', topic: 'Çözünürlük Dengesi' },
  { id: 'ayt-kim-elektrokimya', exam: 'AYT', subject: 'Kimya', topic: 'Kimya ve Elektrik (Redoks, Piller, Elektroliz)' },
  { id: 'ayt-kim-karbon-kimyasi', exam: 'AYT', subject: 'Kimya', topic: 'Karbon Kimyasına Giriş' },
  { id: 'ayt-kim-organik', exam: 'AYT', subject: 'Kimya', topic: 'Organik Bileşikler' },
  { id: 'ayt-kim-enerji-kaynaklari', exam: 'AYT', subject: 'Kimya', topic: 'Enerji Kaynakları ve Bilimsel Gelişmeler' },

  // ───────────── AYT · Biyoloji ─────────────
  { id: 'ayt-bio-sinir-sistemi', exam: 'AYT', subject: 'Biyoloji', topic: 'Sinir Sistemi' },
  { id: 'ayt-bio-endokrin', exam: 'AYT', subject: 'Biyoloji', topic: 'Endokrin Sistem' },
  { id: 'ayt-bio-duyu-organlari', exam: 'AYT', subject: 'Biyoloji', topic: 'Duyu Organları' },
  { id: 'ayt-bio-destek-hareket', exam: 'AYT', subject: 'Biyoloji', topic: 'Destek ve Hareket Sistemi' },
  { id: 'ayt-bio-sindirim', exam: 'AYT', subject: 'Biyoloji', topic: 'Sindirim Sistemi' },
  { id: 'ayt-bio-dolasim-bagisiklik', exam: 'AYT', subject: 'Biyoloji', topic: 'Dolaşım ve Bağışıklık Sistemi' },
  { id: 'ayt-bio-solunum-sistemi', exam: 'AYT', subject: 'Biyoloji', topic: 'Solunum Sistemi' },
  { id: 'ayt-bio-uriner', exam: 'AYT', subject: 'Biyoloji', topic: 'Üriner Sistem' },
  { id: 'ayt-bio-ureme-gelisme', exam: 'AYT', subject: 'Biyoloji', topic: 'Üreme Sistemi ve Embriyonik Gelişim' },
  { id: 'ayt-bio-komunite-populasyon', exam: 'AYT', subject: 'Biyoloji', topic: 'Komünite ve Popülasyon Ekolojisi' },
  { id: 'ayt-bio-nukleik-asitler', exam: 'AYT', subject: 'Biyoloji', topic: 'Nükleik Asitler ve Genetik Şifre' },
  { id: 'ayt-bio-protein-sentezi', exam: 'AYT', subject: 'Biyoloji', topic: 'Protein Sentezi' },
  { id: 'ayt-bio-biyoteknoloji', exam: 'AYT', subject: 'Biyoloji', topic: 'Genetik Mühendisliği ve Biyoteknoloji' },
  { id: 'ayt-bio-enerji-atp', exam: 'AYT', subject: 'Biyoloji', topic: 'Canlılık ve Enerji (ATP)' },
  { id: 'ayt-bio-fotosentez', exam: 'AYT', subject: 'Biyoloji', topic: 'Fotosentez ve Kemosentez' },
  { id: 'ayt-bio-hucresel-solunum', exam: 'AYT', subject: 'Biyoloji', topic: 'Hücresel Solunum' },
  { id: 'ayt-bio-bitki-biyolojisi', exam: 'AYT', subject: 'Biyoloji', topic: 'Bitki Biyolojisi' },
  { id: 'ayt-bio-canlilar-cevre', exam: 'AYT', subject: 'Biyoloji', topic: 'Canlılar ve Çevre (Adaptasyon, Evrim)' },
];

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string | null | undefined): Topic | undefined {
  return id ? TOPIC_BY_ID.get(id) : undefined;
}

/** "Problemler › Yaş Problemleri" or just "Mutlak Değer". */
export function topicLabel(t: Topic): string {
  return t.subtopic ? `${t.topic} › ${t.subtopic}` : t.topic;
}
