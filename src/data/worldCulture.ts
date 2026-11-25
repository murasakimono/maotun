export interface CityCultureProfile {
  keys: string[]; // lowercase matchers
  cinemaGames: { title: string; kind: 'Film' | 'Dizi' | 'Anime' | 'Oyun'; year: string }[];
  musicScene: { genres: string[]; icons: string; vibe: string };
  cuisine: { name: string; desc: string }[];
}

export interface CountryTravelGuide {
  visaTr: string;
  plug: string;
  etiquette: string[];
  phrases: { tr: string; local: string; pron: string }[];
}

export interface CostOfLiving {
  rent1bUsd: number;
  mealUsd: number;
  coffeeUsd: number;
  transitUsd: number;
  index: number; // NYC = 100
}

export const CITY_CULTURE_ATLAS: CityCultureProfile[] = [
  {
    keys: ['istanbul', 'i̇stanbul', 'kadıköy', 'beşiktaş', 'fatih', 'üsküdar', 'beyoğlu', 'tahtakale'],
    cinemaGames: [
      { title: "Assassin's Creed: Revelations", kind: 'Oyun', year: '2011' },
      { title: 'Skyfall', kind: 'Film', year: '2012' },
      { title: 'Ezel', kind: 'Dizi', year: '2009' },
      { title: 'Şahsiyet', kind: 'Dizi', year: '2018' },
      { title: 'Kış Uykusu / Masumiyet', kind: 'Film', year: '1997' },
    ],
    musicScene: {
      genres: ['Türkçe Yeraltı Rap (Kadıköy/Üsküdar)', 'Anadolu Psychedelic Rock', 'Dark Synth / Post-Punk'],
      icons: 'Ceza, Hidra, Saian, Barış Manço, Erkin Koray, Altın Gün, Jakuzi',
      vibe: 'Doğu makamlarıyla batı kırık ritimlerinin ve sert sokak lirizminin kesişim noktası.',
    },
    cuisine: [
      { name: 'Eminönü Balık Ekmek & Turşu Suyu', desc: 'Galata Köprüsü kıyısında ızgara uskumru.' },
      { name: 'Kokoreç & Midye Dolma', desc: 'Gece sokak kültürünün vazgeçilmez ikilisi.' },
      { name: 'Islak Hamburger', desc: 'Taksim meydanına özgü sarımsaklı soslu klasik.' },
    ],
  },
  {
    keys: ['hatay', 'antakya', 'iskenderun', 'defne', 'samandağ'],
    cinemaGames: [
      { title: 'Indiana Jones: Son Macera (Hatay Cumhuriyeti)', kind: 'Film', year: '1989' },
      { title: 'Asi', kind: 'Dizi', year: '2007' },
      { title: 'Kalp Yarası', kind: 'Dizi', year: '2021' },
    ],
    musicScene: {
      genres: ['Akdeniz Çok Sesli Halk Müziği', 'Arapça-Türkçe Füzyon', 'Yerel Underground Rap'],
      icons: 'Antakya Medeniyetler Korosu, yerel bağımsız MC sahnesi',
      vibe: 'Binlerce yıllık çok kültürlü ezgiler ve yüksek duygusal yoğunluk.',
    },
    cuisine: [
      { name: 'Antakya Künefesi', desc: 'Tuzsuz özel peynir ve odun ateşinde çıtır tel kadayıf.' },
      { name: 'Tepsi Kebabı & Kağıt Kebabı', desc: 'Zırh kıyması, kapya biber ve taş fırın aroması.' },
      { name: 'Humus, Babagannuş & Oruk', desc: 'UNESCO Gastronomi Şehri meze geleneği.' },
    ],
  },
  {
    keys: ['ankara', 'çankaya', 'kızılay'],
    cinemaGames: [
      { title: 'Behzat Ç.: Bir Ankara Polisiyesi', kind: 'Dizi', year: '2010' },
      { title: 'Anayurt Oteli', kind: 'Film', year: '1987' },
    ],
    musicScene: {
      genres: ['Ankara Türkçe Rap & Battle', 'Anadolu Rock', 'Indie / Alternative'],
      icons: 'Joker, Allame, Contra (etkileşim), Pilli Bebek, Son Feci Bisiklet',
      vibe: 'Gri beton, keskin lirizm, teknik flow ve gece stüdyo kültürü.',
    },
    cuisine: [
      { name: 'Aspava (SSK Dürüm)', desc: 'Sos, soğan, kaşar ve sınırsız ikram kültürü.' },
      { name: 'Ankara Tava', desc: 'Arpa şehriye üzerinde ağır pişmiş kuzu eti.' },
    ],
  },
  {
    keys: ['izmir', 'i̇zmir', 'bornova', 'konak', 'karşıyaka', 'çeşme'],
    cinemaGames: [
      { title: 'İncir Reçeli', kind: 'Film', year: '2011' },
      { title: 'Vatanım Sensin', kind: 'Dizi', year: '2016' },
    ],
    musicScene: {
      genres: ['Ege Alternative Rock', 'Synth-Pop', 'Türkçe Rap'],
      icons: 'Sezen Aksu, Mor ve Ötesi (etki), No.1, Şanışer',
      vibe: 'Rahat sahil ritmi ile melankolik modern Türkçe söz yazarlığı.',
    },
    cuisine: [
      { name: 'Boyoz & Fırınlanmış Yumurta', desc: 'Sabah kahvaltısının Sefarad mirası.' },
      { name: 'Çeşme Kumrusu & Söğüş', desc: 'Kömür ateşinde erimiş tulum peynirli sokak klasiği.' },
    ],
  },
  {
    keys: ['tokyo', 'shibuya', 'shinjuku', 'akihabara'],
    cinemaGames: [
      { title: 'Akira (Neo-Tokyo)', kind: 'Anime', year: '1988' },
      { title: 'Persona 5 Royal (Shibuya)', kind: 'Oyun', year: '2019' },
      { title: 'Lost in Translation', kind: 'Film', year: '2003' },
      { title: 'Jujutsu Kaisen (Shibuya Arc)', kind: 'Anime', year: '2023' },
      { title: 'Ghostwire: Tokyo', kind: 'Oyun', year: '2022' },
    ],
    musicScene: {
      genres: ['80s City Pop', 'Shibuya-kei', 'J-Rock / Lo-Fi Jazzhop'],
      icons: 'Tatsuro Yamashita, Nujabes, Lamp, King Gnu, Kenshi Yonezu',
      vibe: 'Neon yağmurlu gece sürüşleri, plak barları (Jazz Kissa) ve kusursuz prodüksiyon.',
    },
    cuisine: [
      { name: 'Tonkotsu / Shoyu Ramen', desc: 'Saatlerce kaynatılmış kemik suyu ve taze erişte.' },
      { name: 'Monjayaki & Izakaya Yakitori', desc: 'Kömürde şiş tavuk ve gece sokak tezgâhları.' },
    ],
  },
  {
    keys: ['new york', 'manhattan', 'brooklyn', 'queens'],
    cinemaGames: [
      { title: 'Taxi Driver', kind: 'Film', year: '1976' },
      { title: 'Marvel’s Spider-Man 2', kind: 'Oyun', year: '2023' },
      { title: 'GTA IV (Liberty City)', kind: 'Oyun', year: '2008' },
      { title: 'Mr. Robot', kind: 'Dizi', year: '2015' },
    ],
    musicScene: {
      genres: ['East Coast Boom Bap Hip-Hop', 'NY Drill', 'Post-Punk & Jazz'],
      icons: 'Nas, Wu-Tang Clan, Mobb Deep, The Strokes, Miles Davis',
      vibe: 'Hip-hop’un doğduğu Bronx blokları, yeraltı caz kulüpleri ve 24 saat yaşayan şehir.',
    },
    cuisine: [
      { name: 'NY Style Thin Slice Pizza', desc: 'Katlanarak yenen ince hamurlu 1-2$ sokak dilimi.' },
      { name: 'Pastrami on Rye & Bagel', desc: 'Katz’s geleneği tütsülenmiş et sandviçi.' },
    ],
  },
  {
    keys: ['london', 'londra', 'soho', 'camden'],
    cinemaGames: [
      { title: 'Sherlock', kind: 'Dizi', year: '2010' },
      { title: 'Watch Dogs: Legion', kind: 'Oyun', year: '2020' },
      { title: 'V for Vendetta', kind: 'Film', year: '2005' },
      { title: '28 Days Later', kind: 'Film', year: '2002' },
    ],
    musicScene: {
      genres: ['UK Grime & UK Drill', 'Drum & Bass / Jungle', 'Post-Punk & Britpop'],
      icons: 'Skepta, Burial, Joy Division (etki), Pink Floyd, Central Cee',
      vibe: 'Korsan radyo kültürü, sisli gece basları ve keskin İngiliz sokak akışı.',
    },
    cuisine: [
      { name: 'Fish & Chips (Malt Vinegar)', desc: 'Kıtır morina balığı ve kalın patates.' },
      { name: 'Brick Lane Curry & Sunday Roast', desc: 'Çok kültürlü Londra’nın baharatlı klasikleri.' },
    ],
  },
  {
    keys: ['seoul', 'seul', 'gangnam', 'hongdae'],
    cinemaGames: [
      { title: 'Parasite (Parazit)', kind: 'Film', year: '2019' },
      { title: 'Oldboy', kind: 'Film', year: '2003' },
      { title: 'Squid Game', kind: 'Dizi', year: '2021' },
      { title: 'Solo Leveling', kind: 'Anime', year: '2024' },
    ],
    musicScene: {
      genres: ['K-HipHop & R&B (Hongdae)', 'K-Pop', 'Korean Indie'],
      icons: 'Epik High, DPR LIVE, Dean, Hyukoh, NewJeans',
      vibe: 'Yüksek bütçeli prodüksiyon ile Hongdae yeraltı kulüp sahnesinin sentezi.',
    },
    cuisine: [
      { name: 'Tteokbokki & Korean Fried Chicken', desc: 'Acılı pirinç keki ve çift kızartılmış çıtır tavuk.' },
      { name: 'Samgyeopsal (Korean BBQ)', desc: 'Masa başı ızgara ve kimchi çeşitleri.' },
    ],
  },
  {
    keys: ['venice', 'venedik', 'rome', 'roma', 'napoli', 'milan'],
    cinemaGames: [
      { title: "Assassin's Creed II", kind: 'Oyun', year: '2009' },
      { title: 'JoJo’s Bizarre Adventure: Golden Wind', kind: 'Anime', year: '2018' },
      { title: 'La Grande Bellezza', kind: 'Film', year: '2013' },
    ],
    musicScene: {
      genres: ['Italo Disco', 'Italian Rap / Trap', 'Sinematik Film Müziği'],
      icons: 'Ennio Morricone, Giorgio Moroder, Måneskin, Sfera Ebbasta',
      vibe: 'Tarihi meydanlar, analog synthesizer mirası ve dramatik melodiler.',
    },
    cuisine: [
      { name: 'Napoliten Pizza & Cacio e Pepe', desc: 'Odun fırınında 90 saniyede pişen hamur.' },
      { name: 'Cicchetti & Espresso', desc: 'Venedik bar mezeleri ve ayaküstü kahve kültürü.' },
    ],
  },
];

export const COUNTRY_TRAVEL_GUIDES: Record<string, CountryTravelGuide> = {
  TR: {
    visaTr: 'Yurt İçi (Kimlik Kartı Yeterli)',
    plug: 'Tip C / F • 230V 50Hz',
    etiquette: ['Ayakkabıyla eve girilmez.', 'Çay ikramı misafirperverlik göstergesidir.'],
    phrases: [
      { tr: 'Merhaba', local: 'Merhaba', pron: 'mer-ha-ba' },
      { tr: 'Teşekkürler', local: 'Teşekkür ederim', pron: 'te-şek-kür' },
    ],
  },
  JP: {
    visaTr: 'TR Pasaportuna 90 Gün VİZESİZ',
    plug: 'Tip A / B • 100V (Dönüştürücü Gerekir)',
    etiquette: ['Bahşiş verilmez (hakaret sayılabilir).', 'Trende yüksek sesle telefon konuşulmaz.', 'Yürürken yemek yenmez.'],
    phrases: [
      { tr: 'Merhaba', local: 'こんにちは', pron: 'Konniçiva' },
      { tr: 'Teşekkürler', local: 'ありがとうございます', pron: 'Arigato gozaimasu' },
      { tr: 'Affedersiniz', local: 'すみません', pron: 'Sumimasen' },
      { tr: 'Ne kadar?', local: 'いくらですか', pron: 'İkura desuka?' },
    ],
  },
  US: {
    visaTr: 'B1/B2 ABD Vizesi Gerekli',
    plug: 'Tip A / B • 120V (Dönüştürücü Gerekir)',
    etiquette: ['Restoranlarda %15–20 bahşiş neredeyse zorunludur.', 'Etiket fiyatlarına eyalet vergisi kasada eklenir.'],
    phrases: [
      { tr: 'Merhaba', local: 'Hey / Hi there', pron: 'Hey' },
      { tr: 'Hesap lütfen', local: 'Check, please', pron: 'Çek pliz' },
    ],
  },
  GB: {
    visaTr: 'Birleşik Krallık Vizesi Gerekli',
    plug: 'Tip G (3 Pimli) • 230V',
    etiquette: ['Sıraya girmek kutsaldır, asla kaynak yapılmaz.', 'Yürüyen merdivende sağda durulur, soldan yürünür.'],
    phrases: [
      { tr: 'Teşekkürler', local: 'Cheers / Ta', pron: 'Çiırs' },
      { tr: 'Affedersiniz', local: 'Sorry / Excuse me', pron: 'Sori' },
    ],
  },
  KR: {
    visaTr: 'TR Pasaportuna 90 Gün VİZESİZ (K-ETA)',
    plug: 'Tip C / F • 220V (TR ile Uyumlu)',
    etiquette: ['Büyüklere bir şey verirken/alırken iki el kullanılır.', 'Bahşiş kültürü yoktur.'],
    phrases: [
      { tr: 'Merhaba', local: '안녕하세요', pron: 'Annyeonghaseyo' },
      { tr: 'Teşekkürler', local: '감사합니다', pron: 'Kamsahamnida' },
      { tr: 'Lezzetli', local: '맛있어요', pron: 'Maşissoyo' },
    ],
  },
  IT: {
    visaTr: 'Schengen Vizesi Gerekli',
    plug: 'Tip C / F / L • 230V',
    etiquette: ['Saat 11:00’den sonra sütlü kahve (cappuccino) genelde içilmez.', 'Masaya oturunca "coperto" servis ücreti eklenir.'],
    phrases: [
      { tr: 'Merhaba', local: 'Ciao / Buongiorno', pron: 'Çao / Buoncorno' },
      { tr: 'Teşekkürler', local: 'Grazie', pron: 'Gratsiye' },
      { tr: 'Hesap lütfen', local: 'Il conto, per favore', pron: 'İl konto per favore' },
    ],
  },
  DE: {
    visaTr: 'Schengen Vizesi Gerekli',
    plug: 'Tip C / F • 230V (TR ile Uyumlu)',
    etiquette: ['Pazar günleri marketler kapalıdır.', 'Kırmızı ışıkta araba olmasa bile karşıya geçilmez.', 'Nakit (Bargeld) hâlâ çok yaygındır.'],
    phrases: [
      { tr: 'Merhaba', local: 'Hallo / Guten Tag', pron: 'Halo' },
      { tr: 'Teşekkürler', local: 'Danke schön', pron: 'Danke şön' },
    ],
  },
  FR: {
    visaTr: 'Schengen Vizesi Gerekli',
    plug: 'Tip C / E • 230V (TR ile Uyumlu)',
    etiquette: ['Bir dükkâna girince mutlaka "Bonjour" denir.', 'İngilizce sormadan önce Fransızca selam vermek kapı açar.'],
    phrases: [
      { tr: 'Merhaba', local: 'Bonjour', pron: 'Bonjur' },
      { tr: 'Teşekkürler', local: 'Merci beaucoup', pron: 'Mersi boku' },
    ],
  },
  IS: {
    visaTr: 'Schengen Vizesi Gerekli',
    plug: 'Tip C / F • 230V (TR ile Uyumlu)',
    etiquette: ['Termal havuzlara girmeden önce duş almak zorunludur.', 'Yoldan çıkıp yosunlara basmak yasaktır.'],
    phrases: [
      { tr: 'Merhaba', local: 'Halló / Góðan daginn', pron: 'Hallo' },
      { tr: 'Teşekkürler', local: 'Takk', pron: 'Tak' },
    ],
  },
};

export const COST_OF_LIVING: Record<string, CostOfLiving> = {
  İstanbul: { rent1bUsd: 780, mealUsd: 9, coffeeUsd: 3.4, transitUsd: 0.75, index: 38 },
  Hatay: { rent1bUsd: 420, mealUsd: 6, coffeeUsd: 2.2, transitUsd: 0.55, index: 26 },
  Ankara: { rent1bUsd: 550, mealUsd: 7.5, coffeeUsd: 2.9, transitUsd: 0.65, index: 32 },
  İzmir: { rent1bUsd: 620, mealUsd: 8, coffeeUsd: 3.0, transitUsd: 0.65, index: 34 },
  Tokyo: { rent1bUsd: 1150, mealUsd: 9.5, coffeeUsd: 3.8, transitUsd: 1.6, index: 62 },
  'New York': { rent1bUsd: 3650, mealUsd: 24, coffeeUsd: 5.8, transitUsd: 2.9, index: 100 },
  Londra: { rent1bUsd: 2650, mealUsd: 21, coffeeUsd: 4.8, transitUsd: 3.4, index: 86 },
  Seul: { rent1bUsd: 980, mealUsd: 8.5, coffeeUsd: 3.9, transitUsd: 1.1, index: 58 },
  Venedik: { rent1bUsd: 1350, mealUsd: 18, coffeeUsd: 2.4, transitUsd: 2.0, index: 68 },
  Reykjavik: { rent1bUsd: 1950, mealUsd: 26, coffeeUsd: 5.2, transitUsd: 4.1, index: 89 },
};

export function findCityCulture(city: string, country: string): CityCultureProfile | null {
  const hay = `${city} ${country}`.toLowerCase();
  return CITY_CULTURE_ATLAS.find((c) => c.keys.some((k) => hay.includes(k))) || null;
}
