// Sample questions for demo mode (no server). Each answer was checked by an independent solve.
// Images in ./images are these questions typeset like a printed test.

import type { Exam } from '../../data/topics';

export interface DemoQuestion {
  key: string;
  exam: Exam;
  subject: string;
  topicId: string;
  difficulty: number;
  questionText: string;
  hints: string[];
  solutionSteps: string[];
  finalAnswer: string;
  confidence: number;
  /** A typical "Anlamadım" question and its answer. */
  followUp: { question: string; answer: string };
  /** Bundled image (an asset id; the web preview inlines it as `{ uri }`). */
  image: { source: number | { uri: string }; width: number; height: number };
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    key: 'tyt-mat-yas-1',
    exam: 'TYT',
    subject: 'Temel Matematik',
    topicId: 'tyt-mat-problem-yas',
    difficulty: 2,
    questionText:
      'Bir annenin bugünkü yaşı, kızının bugünkü yaşının 4 katıdır. 6 yıl sonra annenin yaşı, kızının yaşının 3 katı olacaktır.\n\nBuna göre kızı doğduğunda anne kaç yaşındaydı?\n\nA) 24\nB) 30\nC) 32\nD) 36\nE) 48',
    hints: [
      'Bugünkü yaşlara bilinmeyen ver: kızın yaşı $k$ ise annenin yaşı $4k$ olur. 6 yıl sonra ikisinin de yaşı aynı miktarda artar.',
      '6 yıl sonraki durumu denklem olarak yaz: $4k + 6 = 3(k + 6)$. Bu denklemden kızın bugünkü yaşı çıkar.',
      "$k$'yi bulunca annenin bugünkü yaşını hesapla. Kız doğduğunda annenin yaşı, ikisi arasındaki yaş farkına eşittir; bu farkı hesapla. Dikkat: soru annenin bugünkü yaşını sormuyor.",
    ],
    solutionSteps: [
      '**Bilinmeyeni seçelim.** Kızın bugünkü yaşına $k$ diyelim. Annenin yaşı bunun 4 katı olduğu için anne bugün $4k$ yaşındadır. Küçük olanın yaşını bilinmeyen olarak seçmek, kesirli ifadelerle uğraşmayı önler.',
      '**6 yıl sonrasını yazalım.** Zaman herkes için aynı akar: 6 yıl sonra kız $k + 6$, anne $4k + 6$ yaşında olur. O gün annenin yaşı kızınkinin 3 katı olacağından:\n$$4k + 6 = 3(k + 6)$$',
      '**Denklemi çözelim.** $4k + 6 = 3k + 18 \\Rightarrow k = 12$. Yani kız bugün $12$, anne $4 \\cdot 12 = 48$ yaşında. Kontrol: 6 yıl sonra $18$ ve $54$ olurlar ve gerçekten $54 = 3 \\cdot 18$.',
      "**Asıl soruyu cevaplayalım.** Kız doğduğunda yaşı $0$'dı; bu, bugünden $12$ yıl önceydi. Anne o zaman $48 - 12 = 36$ yaşındaydı. Bu sayı aslında aradaki yaş farkıdır ve yaş farkı hiçbir zaman değişmez.",
      '**Çeldiriciye dikkat.** $48$ annenin bugünkü yaşıdır, soru ise kızı doğduğundaki yaşını soruyor. Doğru cevap **D) 36**.',
    ],
    finalAnswer: 'D) 36',
    confidence: 0.97,
    followUp: {
      question: 'Neden kız doğduğunda annenin yaşı, aradaki yaş farkına eşit oluyor?',
      answer:
        'Çok güzel bir soru, çünkü bu yaş problemlerinin en kullanışlı kuralı!\n\nİki kişi arasındaki **yaş farkı hiç değişmez**: her yıl ikisi de 1 yaş büyür, fark aynı kalır. Bizim soruda bugün fark $48 - 12 = 36$; 6 yıl sonra da $54 - 18 = 36$.\n\nKız doğduğu anda onun yaşı $0$\'dır. O anda da fark $36$ olmak zorunda, dolayısıyla annenin yaşı $0 + 36 = 36$ olur.\n\nYani "biri doğduğunda diğeri kaç yaşındaydı?" sorusunu görünce doğrudan **yaş farkını** hesaplaman yeterli.',
    },
    image: { source: require('./images/tyt-mat-yas-1.jpg'), width: 1056, height: 504 },
  },
  {
    key: 'tyt-mat-olasilik-1',
    exam: 'TYT',
    subject: 'Temel Matematik',
    topicId: 'tyt-mat-olasilik',
    difficulty: 3,
    questionText:
      'Bir torbada 4 kırmızı, 3 mavi ve 2 yeşil top vardır. Torbadan rastgele aynı anda 2 top çekiliyor.\n\nÇekilen topların farklı renkte olma olasılığı kaçtır?\n\nA) $\\frac{5}{18}$\nB) $\\frac{13}{18}$\nC) $\\frac{2}{3}$\nD) $\\frac{7}{9}$\nE) $\\frac{11}{18}$',
    hints: [
      'Önce tüm olası çekilişleri kombinasyonla say. "Farklı renk" durumu birkaç alt duruma bölünüyor; bunun yerine tersini (tümleyenini) düşünmek daha kısa olabilir.',
      'Tümleyen olay "iki top da aynı renk" olmasıdır. Her renk için o renkten 2 top seçme sayısını $\\binom{n}{2}$ ile bul ve topla. Tüm durumların sayısı $\\binom{9}{2}$\'dir.',
      "Aynı renk olasılığını (aynı renkli durumlar / tüm durumlar) olarak yazıp sadeleştir, sonra bu olasılığı $1$'den çıkar.",
    ],
    solutionSteps: [
      '**Tüm durumlar.** Torbada $4 + 3 + 2 = 9$ top var. Toplar aynı anda çekildiği için sıra önemsizdir:\n$$\\binom{9}{2} = \\frac{9 \\cdot 8}{2} = 36$$',
      '**Tümleyeni kullanalım.** "Farklı renk" demek K–M, K–Y ve M–Y olmak üzere üç ayrı durum demek. Bunun tersi olan "aynı renk" daha kolay sayılır; sonra sonucu $1$\'den çıkarırız.',
      '**Aynı renk durumları.**\n\n- İki kırmızı: $\\binom{4}{2} = 6$\n- İki mavi: $\\binom{3}{2} = 3$\n- İki yeşil: $\\binom{2}{2} = 1$\n\nToplam $6 + 3 + 1 = 10$, yani $P(\\text{aynı renk}) = \\dfrac{10}{36} = \\dfrac{5}{18}$.',
      '**Sonuç.** $P(\\text{farklı renk}) = 1 - \\dfrac{5}{18} = \\dfrac{13}{18}$.',
      '**Kontrol (doğrudan sayma).** K–M: $4 \\cdot 3 = 12$, K–Y: $4 \\cdot 2 = 8$, M–Y: $3 \\cdot 2 = 6$; toplam $26$ ve $\\dfrac{26}{36} = \\dfrac{13}{18}$. İki yol aynı sonucu veriyor. $\\dfrac{5}{18}$ ise aynı renk olasılığıdır, o şıkka dikkat!',
    ],
    finalAnswer: 'B) $\\dfrac{13}{18}$',
    confidence: 0.96,
    followUp: {
      question: "Kontrol adımında kırmızı–mavi için neden $4 \\cdot 3$ yazdık? Sıra önemli değilken 2'ye bölmemiz gerekmez miydi?",
      answer:
        'Güzel yakaladın, bu çok sık karışan bir nokta.\n\n2\'ye bölme, **aynı gruptan** iki eleman seçerken gerekir. Örneğin 9 toptan 2 topu sıralı seçmenin $9 \\cdot 8$ yolu var; burada her çift hem "önce A sonra B" hem "önce B sonra A" olarak iki kez sayıldığı için 2\'ye böleriz: $\\binom{9}{2} = \\dfrac{9 \\cdot 8}{2}$.\n\nKırmızı–mavi çiftinde ise roller zaten belli: biri mutlaka kırmızılardan, diğeri mutlaka mavilerden geliyor. Bir çifti iki farklı sırada sayma imkânın yok. Yani $\\binom{4}{1} \\cdot \\binom{3}{1} = 4 \\cdot 3 = 12$ ve tekrar sayma olmuyor.\n\nKısacası: **farklı gruplardan** birer eleman seçiyorsan çarp, bölme yok; **aynı gruptan** seçiyorsan kombinasyon kullan.',
    },
    image: { source: require('./images/tyt-mat-olasilik-1.jpg'), width: 1056, height: 514 },
  },
  {
    key: 'tyt-mat-uslu-1',
    exam: 'TYT',
    subject: 'Temel Matematik',
    topicId: 'tyt-mat-uslu-sayilar',
    difficulty: 2,
    questionText:
      '$x$ bir gerçel sayı olmak üzere,\n\n$$\\frac{3^{x+2} + 3^{x+1}}{3^{x-1}}$$\n\nifadesinin değeri kaçtır?\n\nA) 12\nB) 18\nC) 24\nD) 27\nE) 36',
    hints: [
      'Pay ve paydadaki bütün terimler aynı tabanda ($3$). $a^{m+n} = a^m \\cdot a^n$ kuralıyla üsleri parçalamayı düşün.',
      'Paydaki her terimi paydadaki $3^{x-1}$ cinsinden yaz; örneğin $3^{x+2} = 3^{x-1} \\cdot 3^{3}$. Sonra payı $3^{x-1}$ parantezine al.',
      '$3^{x-1}$ pay ve paydada sadeleşince geriye yalnızca iki sabit üslü sayının toplamı kalır; onları hesaplayıp topla.',
    ],
    solutionSteps: [
      "**Kural.** Aynı tabanlı üslü sayılarda $a^{m+n} = a^m \\cdot a^n$'dir. Bu kural sayesinde $x$'li üsleri ortak bir parçaya ayırıp çarpan parantezine alabiliriz.",
      '**Paydayı ortak çarpan seçelim.** Paydada $3^{x-1}$ var; paydaki terimleri de onun cinsinden yazalım:\n$$3^{x+2} = 3^{(x-1)+3} = 3^{x-1} \\cdot 27, \\qquad 3^{x+1} = 3^{(x-1)+2} = 3^{x-1} \\cdot 9$$',
      '**Parantez.** Pay: $3^{x-1} \\cdot 27 + 3^{x-1} \\cdot 9 = 3^{x-1}(27 + 9) = 36 \\cdot 3^{x-1}$.',
      "**Sadeleştirme.**\n$$\\frac{36 \\cdot 3^{x-1}}{3^{x-1}} = 36$$\nSonuç $x$'e bağlı değil; $x$ ne olursa olsun ifade hep $36$'dır. Kontrol: $x = 1$ için $\\dfrac{27 + 9}{3^0} = 36$.",
      '**Çeldiriciye dikkat.** Yalnızca ilk terimi sadeleştirip $27$ bulmak sık yapılan bir hatadır. Doğru cevap **E) 36**.',
    ],
    finalAnswer: 'E) 36',
    confidence: 0.98,
    followUp: {
      question: 'Neden $3^{x+2} + 3^{x+1}$ toplamında üsleri toplayıp $3^{2x+3}$ diye yazamıyoruz?',
      answer:
        'Çok yerinde bir soru, bu üslü sayılardaki en yaygın hata.\n\nÜsleri toplama kuralı yalnızca **çarpmada** geçerli: $a^m \\cdot a^n = a^{m+n}$. Toplamada böyle bir kural yok; $a^m + a^n$ tek bir kuvvete dönüşmez.\n\nHemen bir sayıyla deneyelim: $x = 1$ için $3^{3} + 3^{2} = 27 + 9 = 36$, ama $3^{2 \\cdot 1 + 3} = 3^5 = 243$. Açıkça eşit değiller.\n\nToplamda yapabileceğin şey **ortak çarpan parantezine almak**: $3^{x+2} + 3^{x+1} = 3^{x+1}(3 + 1) = 4 \\cdot 3^{x+1}$. Soruda da tam olarak bu fikri kullandık.',
    },
    image: { source: require('./images/tyt-mat-uslu-1.jpg'), width: 1056, height: 556 },
  },
  {
    key: 'tyt-geo-ucgende-alan-1',
    exam: 'TYT',
    subject: 'Temel Matematik',
    topicId: 'tyt-geo-ucgende-alan',
    difficulty: 3,
    questionText:
      "$ABC$ üçgeninde $D$ noktası $[BC]$ kenarı, $E$ noktası $[AC]$ kenarı üzerindedir.\n\n$|BD| = 10$ cm, $|DC| = 5$ cm, $|AE| = 4$ cm, $|EC| = 8$ cm\n\n$A(ABC) = 54$ cm² olduğuna göre, $ABDE$ dörtgeninin alanı kaç cm²'dir?\n\nA) 36\nB) 38\nC) 40\nD) 42\nE) 45",
    hints: [
      'Dörtgenin alanını doğrudan hesaplamak zor. Büyük $ABC$ üçgeninden hangi küçük üçgeni çıkarırsan geriye $ABDE$ dörtgeni kalır, onu düşün.',
      "Çıkarılacak parça $EDC$ üçgeni. Aynı yüksekliği paylaşan üçgenlerin alanları tabanlarıyla orantılıdır: önce $A(ADC)$'yi $\\dfrac{|DC|}{|BC|}$ oranıyla bul.",
      "$EDC$ ve $ADC$ üçgenleri $D$ köşesinden $AC$ doğrusuna inen aynı yüksekliği paylaşır, yani $A(EDC) = \\dfrac{|EC|}{|AC|}\\cdot A(ADC)$. Bulduğun alanı 54'ten çıkar.",
    ],
    solutionSteps: [
      "**Strateji:** $ABDE$ dörtgeni, $ABC$ üçgeninden $EDC$ üçgeni çıkarılınca kalan bölgedir:\n$$A(ABDE) = A(ABC) - A(EDC)$$\nO hâlde sadece $A(EDC)$'yi bulmamız yeterli.",
      '$ABD$ ve $ADC$ üçgenlerinin ikisinin de köşesi $A$, tabanları $BC$ doğrusu üzerinde. Yani yükseklikleri ortak ve alanları tabanlarıyla orantılı. $|BC| = 10 + 5 = 15$ olduğundan:\n$$A(ADC) = \\frac{5}{15}\\cdot 54 = 18 \\text{ cm}^2$$',
      'Şimdi aynı fikri $D$ köşesi için kullanalım. $EDC$ ve $ADC$ üçgenlerinin ortak köşesi $D$, tabanları ($[EC]$ ve $[AC]$) $AC$ doğrusu üzerinde. $|AC| = 4 + 8 = 12$ olduğundan:\n$$A(EDC) = \\frac{8}{12}\\cdot 18 = 12 \\text{ cm}^2$$',
      'Kısa yoldan kontrol: $A(EDC) = \\dfrac{|DC|}{|BC|}\\cdot\\dfrac{|EC|}{|AC|}\\cdot A(ABC) = \\dfrac{1}{3}\\cdot\\dfrac{2}{3}\\cdot 54 = 12$. Sonuç aynı.',
      'Son olarak çıkarma yapalım:\n$$A(ABDE) = 54 - 12 = 42 \\text{ cm}^2$$\nDoğru seçenek **D**.',
    ],
    finalAnswer: 'D) 42',
    confidence: 0.96,
    followUp: {
      question: '$EDC$ ile $ADC$ üçgenlerinin tabanları farklı. Neden alanlarını sadece taban oranıyla karşılaştırabildik?',
      answer:
        "Çok güzel bir soru! İşin sırrı, iki üçgenin **aynı yüksekliği** paylaşması. $EDC$ ve $ADC$ üçgenlerinin ikisinin de bir köşesi $D$, tabanları da ($[EC]$ ve $[AC]$) aynı $AC$ doğrusu üzerinde duruyor.\n\nYükseklik, $D$ noktasından $AC$ doğrusuna inilen dikmedir; buna $h$ diyelim. Köşe aynı ve tabanların durduğu doğru aynı olduğu için bu dikme iki üçgende de aynıdır:\n$$\\frac{A(EDC)}{A(ADC)} = \\frac{\\frac12\\cdot|EC|\\cdot h}{\\frac12\\cdot|AC|\\cdot h} = \\frac{|EC|}{|AC|} = \\frac{8}{12} = \\frac{2}{3}$$\n$h$'ler sadeleşir, geriye sadece taban oranı kalır.\n\nAklında kalsın: **Köşesi ortak, tabanları aynı doğru üzerinde olan üçgenlerin alanları tabanlarıyla orantılıdır.** TYT alan sorularında en sık kullanacağın araçlardan biri bu.",
    },
    image: { source: require('./images/tyt-geo-ucgende-alan-1.jpg'), width: 1056, height: 1039 },
  },
  {
    key: 'tyt-geo-cember-daire-1',
    exam: 'TYT',
    subject: 'Temel Matematik',
    topicId: 'tyt-geo-cember-daire',
    difficulty: 4,
    questionText:
      "$O$ merkezli ve yarıçapı $6$ cm olan çemberde $[AB]$ bir kiriştir. $O$ noktasının $[AB]$ kirişine uzaklığı $3$ cm'dir.\n\nBuna göre, küçük $AB$ yayı ile $[AB]$ kirişi arasında kalan bölgenin alanı kaç cm²'dir?\n\nA) $6\\pi - 9\\sqrt{3}$\nB) $12\\pi - 9\\sqrt{3}$\nC) $12\\pi - 18\\sqrt{3}$\nD) $18\\pi - 9\\sqrt{3}$\nE) $24\\pi - 18\\sqrt{3}$",
    hints: [
      'Aranan bölge bir daire parçası. Bunun alanını, daire diliminin alanından bir üçgenin alanını çıkararak bulabilirsin. Önce merkez açıyı bulman gerekiyor.',
      "$O$'dan kirişe bir dikme çiz ($[OH]$). Oluşan $OHA$ dik üçgeninde hipotenüs $6$, bir dik kenar $3$: hipotenüs bu kenarın tam iki katı. Bu sana hangi özel dik üçgeni hatırlatıyor?",
      'Merkez açı $120^\\circ$ çıkar. Dilim alanını $\\dfrac{120}{360}\\cdot\\pi r^2$ ile, $OAB$ üçgeninin alanını $\\dfrac12\\cdot|AB|\\cdot|OH|$ ile hesapla ve farkını al.',
    ],
    solutionSteps: [
      'Aranan bölge bir **daire parçası**: küçük $AB$ yayı ile $[AB]$ kirişi arasında kalıyor. Bu alanı şöyle yazabiliriz:\n$$A_{\\text{parça}} = A(\\text{dilim } AOB) - A(OAB)$$\nDilim alanı için merkez açıya, üçgen alanı için de kiriş uzunluğuna ihtiyacımız var.',
      "$O$'dan kirişe dikme $[OH]$ çizelim. Merkezden kirişe inen dikme kirişi ortalar, yani $|AH| = |HB|$. $OHA$ dik üçgeninde $|OA| = 6$ (yarıçap) ve $|OH| = 3$. Pisagor bağıntısından:\n$$|AH| = \\sqrt{6^2 - 3^2} = \\sqrt{27} = 3\\sqrt{3} \\quad\\Rightarrow\\quad |AB| = 6\\sqrt{3} \\text{ cm}$$",
      "Aynı üçgende $|OH| = 3$, hipotenüs $|OA| = 6$'nın yarısı. Dik üçgende hipotenüsün yarısı olan kenarın karşısındaki açı $30^\\circ$'dir, yani $\\angle OAH = 30^\\circ$ ve $\\angle AOH = 60^\\circ$. $OAB$ ikizkenar olduğundan $[OH]$ aynı zamanda açıortaydır; merkez açı:\n$$\\angle AOB = 2\\cdot 60^\\circ = 120^\\circ$$",
      'Şimdi iki alanı hesaplayalım.\nDilim: $\\dfrac{120}{360}\\cdot\\pi\\cdot 6^2 = \\dfrac{1}{3}\\cdot 36\\pi = 12\\pi$ cm²\nÜçgen: $A(OAB) = \\dfrac{1}{2}\\cdot|AB|\\cdot|OH| = \\dfrac{1}{2}\\cdot 6\\sqrt{3}\\cdot 3 = 9\\sqrt{3}$ cm²',
      'Daire parçasının alanı, dilimden üçgenin çıkarılmasıyla bulunur:\n$$A_{\\text{parça}} = 12\\pi - 9\\sqrt{3} \\text{ cm}^2$$\nDoğru seçenek **B**.',
    ],
    finalAnswer: 'B) $12\\pi - 9\\sqrt{3}$',
    confidence: 0.95,
    followUp: {
      question: "$\\angle AOH$'nin $60^\\circ$ olduğunu nereden anladık? Soruda hiç açı verilmemişti ki.",
      answer:
        "Haklısın, açı verilmedi; biz onu kenar uzunluklarından çıkardık. $OHA$ üçgeni $H$'de dik açılı, hipotenüs $|OA| = 6$, dik kenar $|OH| = 3$.\n\nDik üçgende **$30^\\circ$'nin karşısındaki kenar hipotenüsün yarısıdır.** Burada $|OH| = 3$, hipotenüsün tam yarısı. Demek ki $OH$'nin karşısındaki açı, yani $\\angle OAH = 30^\\circ$. İç açılar toplamından:\n$$\\angle AOH = 180^\\circ - 90^\\circ - 30^\\circ = 60^\\circ$$\n\n$|OA| = |OB|$ olduğu için $OAB$ ikizkenar, $[OH]$ de hem yükseklik hem açıortay. Bu yüzden merkez açı $2\\cdot 60^\\circ = 120^\\circ$ oluyor.\n\nKüçük bir ipucu: Bir dik üçgende hipotenüsün bir dik kenarın iki katı olduğunu gördüğünde aklına hemen 30-60-90 üçgeni gelsin. Kenarlar $1 : \\sqrt{3} : 2$ oranındadır; bu soruda da $3 : 3\\sqrt{3} : 6$.",
    },
    image: { source: require('./images/tyt-geo-cember-daire-1.jpg'), width: 1056, height: 1013 },
  },
  {
    key: 'tyt-tr-paragraf-ana-dusunce-1',
    exam: 'TYT',
    subject: 'Türkçe',
    topicId: 'tyt-tr-paragraf-ana-dusunce',
    difficulty: 2,
    questionText:
      'Pek çok insan okumayı yalnızca boş zamanlarda yapılan bir eğlence olarak görür. Oysa düzenli okuma, kişinin kelime dağarcığını genişletir ve düşüncelerini daha açık ifade etmesini sağlar. Kitaplar, hiç görmediğimiz yerleri keşfetmemize ve hiç tanımadığımız insanların hayatlarını anlamamıza da kapı aralar. Bu sayede başkalarının duygularını kavramak, onlarla empati kurmak kolaylaşır. Kısacası okuma, bir eğlenceden çok, kişiyi hem zihinsel hem de duygusal açıdan geliştiren bir alışkanlıktır.\n\n**Bu parçada asıl anlatılmak istenen aşağıdakilerden hangisidir?**\n\nA) Okuma, en verimli biçimde boş zamanlarda yapılan bir uğraştır.\nB) Kitaplar, insanlara hiç görmedikleri yerleri tanıma fırsatı sunar.\nC) Kelime dağarcığı geniş olan kişiler hayatta daha başarılı olur.\nD) Empati kurabilmek için farklı insanlarla tanışmak gerekir.\nE) Düzenli okuma, insanı hem düşünce hem de duygu yönünden geliştirir.',
    hints: [
      'Ana düşünce çoğu zaman parçanın giriş ya da sonuç cümlesinde yoğunlaşır. "Oysa", "Kısacası" gibi yön değiştiren veya toparlayan sözcüklere dikkat et.',
      'İlk cümle yaygın bir görüşü veriyor, "Oysa" ile yazar bu görüşe karşı çıkıyor. Ortadaki cümleler okumanın faydalarını tek tek sıralayan destekleyici ayrıntılar.',
      '"Kısacası" ile başlayan son cümle yazarın vardığı yargıyı özetliyor. Bu yargıyı başka kelimelerle karşılayan seçeneği ara; yalnızca tek bir ayrıntıyı anlatan ya da parçada olmayan bir bilgi ekleyen seçenekleri ele.',
    ],
    solutionSteps: [
      '**Parçanın yapısına bakalım.** İlk cümle yaygın bir görüşü veriyor: okuma sadece boş zaman eğlencesidir. İkinci cümledeki "Oysa" bağlacı, yazarın bu görüşe katılmadığını gösteriyor. Yani yazar okumanın bundan fazlası olduğunu savunacak.',
      '**Destekleyici cümleler:** 2, 3 ve 4. cümleler okumanın faydalarını sıralıyor: kelime dağarcığını genişletmesi, farklı hayatları tanıtması ve empati kurmayı kolaylaştırması. Bunlar zihinsel ve duygusal gelişimin örnekleri, yani yardımcı düşünceler.',
      '**Sonuç cümlesi:** "Kısacası" ile başlayan son cümle bütün bu ayrıntıları toparlıyor: okuma, kişiyi zihinsel ve duygusal açıdan geliştiren bir alışkanlıktır. Parçanın ana düşüncesi bu.',
      '**Seçenekleri eleyelim:** A, yazarın karşı çıktığı görüşe yakın. B parçada geçiyor ama sadece üçüncü cümledeki bir ayrıntı. C\'deki "başarı" parçada hiç geçmiyor. D\'yi parça söylemiyor; tersine, empatinin kitaplar sayesinde kolaylaştığını anlatıyor.',
      'Sonuç cümlesini başka kelimelerle karşılayan ve parçanın tamamını kapsayan seçenek **E**: "Düzenli okuma, insanı hem düşünce hem de duygu yönünden geliştirir."',
    ],
    finalAnswer: 'E) Düzenli okuma, insanı hem düşünce hem de duygu yönünden geliştirir.',
    confidence: 0.93,
    followUp: {
      question: 'B seçeneğindeki bilgi parçada gerçekten geçiyor. O zaman neden yanlış?',
      answer:
        'Çok yerinde bir soru, çünkü paragraf sorularında en sık düşülen tuzak bu. B\'deki bilgi parçada var, yani **doğru bir bilgi**. Ama soru "asıl anlatılmak isteneni", yani **ana düşünceyi** soruyor.\n\nAna düşünce parçanın tamamını kapsamalı. B sadece üçüncü cümleyi karşılıyor; kelime dağarcığından, empatiden ve "Kısacası" ile varılan sonuçtan hiç söz etmiyor. Tek bir cümleyi karşılayan böyle seçenekler **yardımcı düşüncedir**.\n\nPratik bir test: Seçeneği parçaya başlık olarak koysan, bütün cümleler bu başlığın altına oturur mu? E için evet. B için hayır, çünkü kelime dağarcığı ve empati cümleleri açıkta kalır.',
    },
    image: { source: require('./images/tyt-tr-paragraf-ana-dusunce-1.jpg'), width: 1056, height: 819 },
  },
  {
    key: 'tyt-fen-hareket-kuvvet-1',
    exam: 'TYT',
    subject: 'Fen',
    topicId: 'tyt-fiz-hareket-kuvvet',
    difficulty: 2,
    questionText:
      "Sürtünmeli yatay bir düzlemde durmakta olan $4\\ \\text{kg}$ kütleli bir cisme, yatay doğrultuda doğu yönünde $F_1 = 30\\ \\text{N}$, batı yönünde $F_2 = 6\\ \\text{N}$ büyüklüğündeki kuvvetler aynı anda uygulanıyor.\n\nCisim ile düzlem arasındaki sürtünme katsayısı $k = 0{,}1$ olduğuna göre, kuvvetler uygulandıktan $2$ saniye sonra cismin hızının büyüklüğü kaç m/s'dir? ($g = 10\\ \\text{m/s}^2$)\n\nA) 8\nB) 10\nC) 12\nD) 14\nE) 20",
    hints: [
      "Cisme etki eden bütün yatay kuvvetleri listele: $F_1$, $F_2$ ve sürtünme kuvveti. Sonra Newton'un 2. yasasını ($F_{\\text{net}} = m \\cdot a$) kullanacaksın.",
      'Sürtünme kuvveti $F_s = k \\cdot m \\cdot g$ ile bulunur ve her zaman hareket yönüne zıttır. Cisim büyük kuvvetin yönünde (doğuya) gideceği için sürtünme batıya, yani $F_2$ ile aynı yöne etki eder.',
      'Net kuvvet $30 - 6 - 4$ şeklinde yazılır. Bunu kütleye bölüp ivmeyi bul; cisim durgun başladığı için hızı $v = a \\cdot t$ ile hesapla.',
    ],
    solutionSteps: [
      '**Sürtünme kuvvetini hesapla.** Yatay düzlemde normal kuvvet ağırlığa eşittir: $N = m g = 4 \\cdot 10 = 40\\ \\text{N}$. Sürtünme kuvveti: $$F_s = k \\cdot N = 0{,}1 \\cdot 40 = 4\\ \\text{N}$$',
      "**Hareket yönünü ve sürtünmenin yönünü belirle.** Doğu yönünü pozitif alalım. Uygulanan kuvvetlerin bileşkesi $30 - 6 = 24\\ \\text{N}$ doğuya doğrudur ve $4\\ \\text{N}$'luk sürtünmeyi yener; cisim doğuya hareket eder. Sürtünme harekete zıt olduğu için batıya, yani $F_2$ ile aynı yöne etki eder.",
      '**Net kuvveti yaz.** Hareket yönündeki kuvvetten, harekete karşı koyan kuvvetleri çıkarırız: $$F_{\\text{net}} = F_1 - F_2 - F_s = 30 - 6 - 4 = 20\\ \\text{N}$$',
      "**Newton'un 2. yasasıyla ivmeyi bul.** $$a = \\frac{F_{\\text{net}}}{m} = \\frac{20}{4} = 5\\ \\text{m/s}^2$$",
      "**Hızı hesapla.** Cisim durgun başladığı için $v_0 = 0$'dır: $$v = v_0 + a t = 0 + 5 \\cdot 2 = 10\\ \\text{m/s}$$ Doğru seçenek **B**. (Sürtünmeyi unutan $12$, sürtünmeyi kuvvetlere ekleyen $14$ bulur; ikisi de seçeneklerdeki tuzaklardır.)",
    ],
    finalAnswer: 'B) 10',
    confidence: 0.96,
    followUp: {
      question: 'Sürtünme kuvvetini neden $F_2$ gibi çıkardık? Sürtünmenin yönünü nasıl bileceğim?',
      answer:
        "Sürtünme kuvveti her zaman cismin **hareket yönüne (ya da hareket etme eğilimine) zıt** yönde etki eder. Bu yüzden önce cismin hangi yöne gideceğine bakarız.\n\nUygulanan kuvvetlerden doğudaki $30\\ \\text{N}$, batıdaki $6\\ \\text{N}$'dan büyük; bileşkeleri $24\\ \\text{N}$ ve doğuya doğru. Bu kuvvet $4\\ \\text{N}$'luk sürtünmeyi rahatça yener, cisim doğuya gider. Sürtünme de tam tersine, yani batıya, $F_2$ ile aynı yöne etki eder.\n\nDoğuyu pozitif alırsak: $$F_{\\text{net}} = 30 - 6 - 4 = 20\\ \\text{N}$$ Sürtünmeyi yanlışlıkla eklersen $28\\ \\text{N}$ bulursun ve hız $14\\ \\text{m/s}$ çıkar. Oysa sürtünme cismi itmez, frenler; bu yüzden hareket yönündeki kuvvetten her zaman çıkarılır.",
    },
    image: { source: require('./images/tyt-fen-hareket-kuvvet-1.jpg'), width: 1056, height: 652 },
  },
  {
    key: 'tyt-fen-mol-1',
    exam: 'TYT',
    subject: 'Fen',
    topicId: 'tyt-kim-mol',
    difficulty: 2,
    questionText:
      'Toplam $1{,}2$ mol atom içeren $\\text{C}_2\\text{H}_6$ gazı kaç gramdır? (H: 1 g/mol, C: 12 g/mol)\n\nA) 3,0\nB) 3,6\nC) 4,5\nD) 9,0\nE) 36',
    hints: [
      'Soruda verilen $1{,}2$ mol, molekülün değil **atomların** mol sayısıdır. İşe bir $\\text{C}_2\\text{H}_6$ molekülünde kaç atom olduğunu sayarak başla.',
      'Bir molekülde $2 + 6 = 8$ atom var; yani $1$ mol $\\text{C}_2\\text{H}_6$ içinde $8$ mol atom bulunur. Toplam atom molünü buna bölerek molekülün mol sayısını bul.',
      'Molekülün mol sayısını bulduktan sonra mol kütlesini hesapla ($2 \\cdot 12 + 6 \\cdot 1$) ve $m = n \\cdot M_A$ ile kütleye geç.',
    ],
    solutionSteps: [
      '**Bir moleküldeki atom sayısını bul.** $\\text{C}_2\\text{H}_6$ molekülünde $2$ C ve $6$ H atomu, toplam $8$ atom vardır. Yani $1$ mol $\\text{C}_2\\text{H}_6$ molekülünde $8$ mol atom bulunur.',
      "**Molekülün mol sayısını hesapla.** Verilen $1{,}2$ mol atomdur; molekül miktarına geçmek için 8'e böleriz: $$n = \\frac{1{,}2}{8} = 0{,}15\\ \\text{mol}\\ \\text{C}_2\\text{H}_6$$",
      '**Mol kütlesini hesapla.** $$M_A = 2 \\cdot 12 + 6 \\cdot 1 = 30\\ \\text{g/mol}$$',
      '**Kütleyi bul.** $$m = n \\cdot M_A = 0{,}15 \\cdot 30 = 4{,}5\\ \\text{g}$$ Doğru seçenek **C**. (Dikkat: $1{,}2 \\cdot 30 = 36$ yapmak atom ile molekülü karıştırmaktır; E seçeneği tam olarak bu tuzaktır.)',
    ],
    finalAnswer: 'C) 4,5',
    confidence: 0.97,
    followUp: {
      question: "Neden $1{,}2$'yi doğrudan $30$ ile çarpmadık?",
      answer:
        'Çünkü $30\\ \\text{g/mol}$, **1 mol molekülün** kütlesi. Soruda verilen $1{,}2$ mol ise molekül değil, **atom** miktarı. Mol kütlesiyle çarpmadan önce ikisinin aynı şeyi saydığından emin olmalıyız.\n\nBisiklet benzetmesi işe yarar: Her bisiklette 2 tekerlek varsa 12 tekerlek 6 bisiklet eder. Burada her $\\text{C}_2\\text{H}_6$ molekülünde $8$ atom var, yani: $$n_{\\text{molekül}} = \\frac{1{,}2}{8} = 0{,}15\\ \\text{mol}$$\n\nAncak bundan sonra mol kütlesiyle çarpabiliriz: $0{,}15 \\cdot 30 = 4{,}5\\ \\text{g}$. Doğrudan çarpsaydık $36\\ \\text{g}$ bulurduk; o da seçeneklerde tuzak olarak bekliyor.',
    },
    image: { source: require('./images/tyt-fen-mol-1.jpg'), width: 1056, height: 445 },
  },
  {
    key: 'tyt-fen-hucre-1',
    exam: 'TYT',
    subject: 'Fen',
    topicId: 'tyt-bio-hucre',
    difficulty: 2,
    questionText:
      'Ökaryot hücrelerde bulunan organellerle ilgili;\n\nI. Mitokondri ve kloroplast kendine ait DNA ve ribozom içerir.\nII. Ribozomlar zarla çevrili organellerdir.\nIII. Lizozomlar, hücre içi sindirimde görev alan hidrolitik enzimler taşır.\n\nifadelerinden hangileri doğrudur?\n\nA) Yalnız I\nB) Yalnız II\nC) I ve II\nD) I ve III\nE) II ve III',
    hints: [
      'Her öncülü ayrı ayrı değerlendir. Organelleri iki soruya göre düşün: Zarı var mı? Görevi ne?',
      'Ribozomun neyden yapıldığını hatırla (rRNA ve protein). Prokaryot hücrelerde hiç zarlı organel yokken ribozomun bulunması sana ne söyler?',
      'Mitokondri ve kloroplastın kendini eşleyebilmesi için kendi genetik materyaline ihtiyaç duyduğunu, lizozomun ise hücrenin sindirim kesesi olduğunu düşün; sonra doğru bulduğun öncülleri seçeneklerle eşleştir.',
    ],
    solutionSteps: [
      '**I. öncül:** Mitokondri ve kloroplast kendine ait DNA, RNA ve ribozom içerir. Bu sayede kendini eşleyebilir ve ihtiyaç duyduğu bazı proteinleri kendisi sentezleyebilir. **I doğrudur.**',
      '**II. öncül:** Ribozom, rRNA ve proteinlerden oluşan iki alt birimli bir yapıdır; etrafında zar yoktur. Zarlı organeli olmayan prokaryotlarda bile ribozom bulunması bunun en güzel kanıtıdır. **II yanlıştır.**',
      '**III. öncül:** Lizozomlar Golgi cisimciğinden kaynaklanan, tek katlı zarla çevrili keseciklerdir. İçlerindeki hidrolitik (sindirim) enzimleri ile hücre içine alınan maddeleri ve yıpranmış organelleri parçalar. **III doğrudur.**',
      'Doğru öncüller I ve III olduğundan cevap **D**.',
    ],
    finalAnswer: 'D) I ve III',
    confidence: 0.95,
    followUp: {
      question: 'Ribozom neden zarsız? Hücrede zarı olmayan başka organel var mı?',
      answer:
        'Ribozom, **rRNA ve proteinlerden** oluşan iki alt birimli küçük bir yapıdır; etrafında lipit zar yoktur. Sitoplazmada serbest hâlde ya da granüllü endoplazmik retikulumun yüzeyine tutunmuş olarak bulunur ve protein sentezler.\n\nİşine yarayacak bir ipucu: Prokaryotlarda (bakterilerde) zarlı organel hiç yoktur ama ribozom vardır. Bir yapı bakteride de bulunuyorsa, büyük ihtimalle zarsızdır.\n\nAkılda tutman gereken diğer zarsız organel **sentrozomdur**. Sentriollerden oluşur; hayvan hücrelerinde ve bazı ilkel bitki hücrelerinde bulunur, çiçekli bitki hücrelerinde bulunmaz. Bölünme sırasında iğ ipliklerinin oluşumunu düzenler. Yani YKS için akılda tutman gereken zarsız organeller: **ribozom ve sentrozom**.',
    },
    image: { source: require('./images/tyt-fen-hucre-1.jpg'), width: 1056, height: 610 },
  },
  {
    key: 'ayt-turev-1',
    exam: 'AYT',
    subject: 'Matematik',
    topicId: 'ayt-mat-turev-uygulamalar',
    difficulty: 3,
    questionText:
      '$f(x) = x^3 - 6x^2 + 9x + m$ fonksiyonunun yerel minimum değeri $2$ olduğuna göre, yerel maksimum değeri kaçtır?\n\nA) 2\nB) 3\nC) 4\nD) 5\nE) 6',
    hints: [
      "Yerel ekstremum noktalarını bulmak için türevi sıfıra eşitle: $f'(x) = 0$ denkleminin kökleri aday noktalardır.",
      "$f'(x) = 3x^2 - 12x + 9 = 3(x-1)(x-3)$ olur. İşaret tablosu kurarak hangi kökte yerel maksimum, hangisinde yerel minimum olduğunu belirle.",
      "Yerel minimumun olduğu noktadaki fonksiyon değerini $2$'ye eşitleyip $m$'yi bul; ardından aynı $m$ ile yerel maksimum noktasındaki fonksiyon değerini hesapla.",
    ],
    solutionSteps: [
      "**Türevi alalım.** Yerel ekstremumlar türevin sıfır olup işaret değiştirdiği yerlerde oluşur:\n$$f'(x) = 3x^2 - 12x + 9 = 3(x^2 - 4x + 3) = 3(x-1)(x-3)$$\nKritik noktalar $x = 1$ ve $x = 3$.",
      "**İşaret tablosu.** $f'(x)$ başkatsayısı pozitif olan ikinci dereceden bir ifade olduğundan köklerin dışında pozitif, kökler arasında negatiftir.\n- $x < 1$: $f' > 0$ (artan)\n- $1 < x < 3$: $f' < 0$ (azalan)\n- $x > 3$: $f' > 0$ (artan)\n\nFonksiyonun artandan azalana geçtiği $x = 1$'de yerel maksimum, azalandan artana geçtiği $x = 3$'te yerel minimum vardır.",
      "**Yerel minimumdan $m$'yi bulalım.**\n$$f(3) = 27 - 54 + 27 + m = m$$\nYerel minimum değeri $2$ verildiği için $m = 2$.",
      "**Yerel maksimum değeri.**\n$$f(1) = 1 - 6 + 9 + 2 = 6$$\nKısa yol: $f(1) - f(3) = 4$ farkı $m$'den bağımsızdır. Minimum $2$ ise maksimum $2 + 4 = 6$ olur.",
    ],
    finalAnswer: 'E) 6',
    confidence: 0.97,
    followUp: {
      question: "Neden $x = 1$'de maksimum, $x = 3$'te minimum dedik? Tersi olamaz mı?",
      answer:
        "Güzel soru! Hangisinin maksimum, hangisinin minimum olduğunu kökün küçük ya da büyük olması değil, **türevin işaretinin nasıl değiştiği** belirler.\n\n$f'(x) = 3(x-1)(x-3)$ ifadesine $x = 0$ koy: $3 \\cdot (-1) \\cdot (-3) = 9 > 0$, yani $x = 1$'den önce fonksiyon artıyor. $x = 2$ koy: $3 \\cdot 1 \\cdot (-1) = -3 < 0$, yani $1$ ile $3$ arasında azalıyor. Önce çıkıp sonra inen bir yolun en yüksek noktası tepedir; bu yüzden $x = 1$ yerel maksimum. İnip sonra yeniden çıkan yolun dibi de $x = 3$, yani yerel minimum.\n\nİstersen ikinci türevle de kontrol edebilirsin: $f''(x) = 6x - 12$. $f''(1) = -6 < 0$ olduğu için $x = 1$'de grafiğin çukurluğu aşağı doğrudur (maksimum), $f''(3) = 6 > 0$ olduğu için $x = 3$'te çukurluk yukarı doğrudur (minimum).",
    },
    image: { source: require('./images/ayt-turev-1.jpg'), width: 1056, height: 447 },
  },
  {
    key: 'ayt-integral-1',
    exam: 'AYT',
    subject: 'Matematik',
    topicId: 'ayt-mat-integral-belirli',
    difficulty: 3,
    questionText:
      '$y = x^2 - 2x$ eğrisi ile $x$ ekseni arasında, $0 \\le x \\le 3$ aralığında kalan bölgelerin alanları toplamı kaç birimkaredir?\n\nA) $0$\nB) $\\frac{4}{3}$\nC) $2$\nD) $\\frac{8}{3}$\nE) $4$',
    hints: [
      'Alan hesaplarken eğrinin $x$ ekseninin altında kaldığı kısımlarda integral negatif çıkar. Önce eğrinin $x$ eksenini kestiği noktaları bul.',
      "$x^2 - 2x = x(x-2)$ olduğundan eğri $x = 0$ ve $x = 2$'de ekseni keser. $[0, 2]$ aralığında eğri eksenin altında, $[2, 3]$ aralığında üstündedir; alanı bu iki parçaya bölerek hesapla.",
      'İlkel fonksiyon $F(x) = \\frac{x^3}{3} - x^2$. Birinci parçada $F(2) - F(0)$ değerinin mutlak değerini, ikinci parçada $F(3) - F(2)$ değerini bulup topla.',
    ],
    solutionSteps: [
      "**Eksenle kesişim noktaları.** $x^2 - 2x = 0 \\Rightarrow x(x-2) = 0$, yani $x = 0$ ve $x = 2$. Bu kökler $[0, 3]$ aralığını iki parçaya böler: $[0, 2]$'de eğri ile eksen arasında kalan bölge ve $[2, 3]$'te eğri, eksen ve $x = 3$ doğrusu arasında kalan bölge.",
      "**Eğrinin konumu.** $x = 1$ için $y = -1 < 0$: $[0, 2]$'de eğri eksenin **altında**. $x = 2{,}5$ için $y = 1{,}25 > 0$: $[2, 3]$'te eğri eksenin **üstünde**. Altta kalan parçanın integrali negatif çıkacağı için onu eksi işaretiyle (mutlak değerle) alırız.",
      '**Birinci bölge.** $F(x) = \\frac{x^3}{3} - x^2$ olmak üzere\n$$\\int_0^2 (x^2 - 2x)\\,dx = F(2) - F(0) = \\frac{8}{3} - 4 = -\\frac{4}{3}$$\nAlan negatif olamaz: $S_1 = \\frac{4}{3}$.',
      '**İkinci bölge.**\n$$\\int_2^3 (x^2 - 2x)\\,dx = F(3) - F(2) = (9 - 9) - \\left(-\\frac{4}{3}\\right) = \\frac{4}{3}$$\nYani $S_2 = \\frac{4}{3}$.',
      '**Toplam alan.** $S_1 + S_2 = \\frac{4}{3} + \\frac{4}{3} = \\frac{8}{3}$ birimkare.\n\nDikkat: $\\int_0^3 (x^2 - 2x)\\,dx$ doğrudan hesaplanırsa $0$ çıkar, çünkü alttaki ve üstteki eşit alanlar birbirini götürür. A şıkkındaki tuzak budur; sadece bir bölgeyi hesaplayıp bırakmak da B şıkkına götürür.',
    ],
    finalAnswer: 'D) $\\frac{8}{3}$',
    confidence: 0.97,
    followUp: {
      question: "İntegrali $0$'dan $3$'e direkt alınca neden $0$ çıkıyor? Arada bir bölge var, alan nasıl sıfır olabilir?",
      answer:
        "Çok yerinde bir soru, çünkü belirli integral ile alan aynı şey değil.\n\nBelirli integral **işaretli** alan hesaplar: eksenin üstündeki parçaları artı, altındakileri eksi sayar. Bu soruda $[0, 2]$'deki parça eksenin altında ($-\\frac{4}{3}$), $[2, 3]$'teki parça üstünde ($+\\frac{4}{3}$). Toplayınca\n$$-\\frac{4}{3} + \\frac{4}{3} = 0$$\nolur; yani alan yok olmuyor, iki eşit parça birbirini götürüyor.\n\nGerçek alanı bulmak için önce eğrinin ekseni kestiği noktaları bul, aralığı oradan böl ve altta kalan parçaların integralini mutlak değerle al. Kısaca: $\\text{Alan} = \\int_a^b |f(x)|\\,dx$.",
    },
    image: { source: require('./images/ayt-integral-1.jpg'), width: 1056, height: 455 },
  },
  {
    key: 'ayt-gazlar-1',
    exam: 'AYT',
    subject: 'Kimya',
    topicId: 'ayt-kim-gazlar',
    difficulty: 3,
    questionText:
      "Sabit hacimli $4{,}1$ litrelik kapalı bir kapta 27 °C'de $8{,}8$ gram $\\mathrm{CO_2}$ gazı bulunmaktadır.\n\nKaba aynı sıcaklıkta kaç gram $\\mathrm{He}$ gazı eklenirse kaptaki toplam basınç $3{,}6$ atm olur?\n\n(C: 12, O: 16, He: 4 g/mol; $R = 0{,}082$ L·atm/(mol·K); gazlar ideal davranmaktadır.)\n\nA) 0,8\nB) 1,6\nC) 2,0\nD) 2,4\nE) 3,2",
    hints: [
      'Gaz problemlerinde önce her şeyi mol sayısına çevir. Sabit hacim ve sıcaklıkta kaptaki toplam basınç, gazın cinsine bakmadan toplam mol sayısıyla doğru orantılıdır.',
      "$\\mathrm{CO_2}$'nin mol kütlesi $44$ g/mol'dür; buradan mol sayısını bul. Ardından $PV = nRT$ ile $3{,}6$ atm basınç için kapta toplam kaç mol gaz olması gerektiğini hesapla ($T = 300$ K).",
      "Gereken toplam mol sayısından kapta zaten bulunan $\\mathrm{CO_2}$ molünü çıkar; kalan, eklenmesi gereken He molüdür. Bunu He'nin mol kütlesiyle çarparak grama çevir.",
    ],
    solutionSteps: [
      "**$\\mathrm{CO_2}$'nin mol sayısı.** $M_{\\mathrm{CO_2}} = 12 + 2 \\cdot 16 = 44$ g/mol\n$$n_{\\mathrm{CO_2}} = \\frac{8{,}8}{44} = 0{,}2 \\text{ mol}$$",
      "**Sıcaklığı Kelvin'e çevir.** $T = 27 + 273 = 300$ K. İşlemi kolaylaştırmak için $RT = 0{,}082 \\cdot 300 = 24{,}6$ değerini bir kenara yazalım.",
      '**Hedef basınç için gereken toplam mol.** $PV = n_{\\text{top}} RT$ bağıntısından\n$$n_{\\text{top}} = \\frac{PV}{RT} = \\frac{3{,}6 \\cdot 4{,}1}{24{,}6} = \\frac{14{,}76}{24{,}6} = 0{,}6 \\text{ mol}$$',
      '**Eklenecek He miktarı.** Kapta zaten $0{,}2$ mol $\\mathrm{CO_2}$ var; eksik olan:\n$$n_{\\mathrm{He}} = 0{,}6 - 0{,}2 = 0{,}4 \\text{ mol}$$\n$$m_{\\mathrm{He}} = 0{,}4 \\cdot 4 = 1{,}6 \\text{ g}$$',
      "**Kontrol (kısa yol).** Başlangıç basıncı $P_1 = \\frac{0{,}2 \\cdot 24{,}6}{4{,}1} = 1{,}2$ atm. Sabit $V$ ve $T$'de $P \\propto n$ olduğundan basınç $1{,}2$ atm'den $3{,}6$ atm'ye, yani $3$ katına çıkıyorsa toplam mol de $0{,}2$'den $0{,}6$'ya çıkmalıdır. Sonuç aynı: $0{,}4$ mol He eklenir. (D şıkkı, kaptaki $\\mathrm{CO_2}$'yi unutup $0{,}6$ molün tamamını He sanma tuzağıdır.)",
    ],
    finalAnswer: 'B) 1,6',
    confidence: 0.96,
    followUp: {
      question: 'He ile $\\mathrm{CO_2}$ farklı gazlar, kütleleri bile çok farklı. Basınç hesabında neden sadece mol sayısı önemli oluyor?',
      answer:
        "Çok iyi bir nokta. İdeal gazda basınç, taneciklerin kabın çeperine çarpmasından doğar. Aynı sıcaklıkta her taneciğin ortalama kinetik enerjisi **gazın cinsinden bağımsız olarak** aynıdır. Ağır $\\mathrm{CO_2}$ molekülü daha yavaş hareket eder ama her çarpışması daha serttir; hafif He atomu ise daha hızlıdır, çepere daha sık ama daha zayıf çarpar. Sonuçta tanecik başına basınç katkısı eşit olur.\n\nBu yüzden $PV = nRT$ formülünde gazın cinsini gösteren hiçbir terim yok, sadece tanecik sayısı ($n$) var. Karışımlarda bunu Dalton'un kısmi basınçlar yasasıyla görürüz: her gaz, kapta tek başına olsaydı yapacağı basıncı yapar ve toplam basınç bunların toplamıdır.\n\nBu soruda $P_{\\mathrm{CO_2}} = 1{,}2$ atm, dolayısıyla He'nin katkısı $P_{\\mathrm{He}} = 3{,}6 - 1{,}2 = 2{,}4$ atm olmalı:\n$$n_{\\mathrm{He}} = \\frac{2{,}4 \\cdot 4{,}1}{24{,}6} = 0{,}4 \\text{ mol}$$\nAynı sonuç. Gazın kütlesi ancak en sonda, molü grama çevirirken işe karışır.",
    },
    image: { source: require('./images/ayt-gazlar-1.jpg'), width: 1056, height: 663 },
  },
];
