# MAOTUN

**Küresel 3D Atlas, Canlı Sinyal Konsolu & Kişisel Dünya Keşif Pasaportu**

MAOTUN; **Tauri v2 + Rust + MapLibre GL JS v5 (3D Globe)** üzerine kurulu, sıfır API anahtarıyla çalışan, **Koyu Obsidyen & Sıcak Gümüş-Amber** tasarım dilinde hazırlanmış masaüstü canlı dünya atlası ve keşif konsoludur.

---

## Öne Çıkan Özellikler (`v3.0.0`)

### Kutusuz 3D Atlas Arayüzü
- **%94 Saf 3D Küre:** Soldaki kalabalık kutular ve varsayılan beyaz harita butonları yerine alt ortada **6 gruplu minimalist Yüzen Dock** (`Doğa`, `Gökyüzü`, `Şehir & Ağ`, `Medya`, `Keşif`, `Araçlar`) ve sağ altta özel koyu Zoom / 3D Eğim / Pusula kontrolleri.
- **Kalıcı Mini Radyo Barı:** Paneli kapatsan bile arka planda canlı FFT spektrumuyla çalmaya devam eden yerel radyo oynatıcısı.

### 20+ Canlı Veri & Sinyal Katmanı (Sıfır API Anahtarı)
- **İlçe/Şehir 7 Günlük Hava, Deniz & Doğa:** Open-Meteo 7 günlük tahmin, UV, Altın Saat / Ay Evresi / Yıldız Gözlem skoru, kıyı ilçelerinde canlı **Deniz Suyu Sıcaklığı & Dalga** (`Open-Meteo Marine`), **Sahra Tozu & Polen**, **Nehir/Sel Debisi** (`Open-Meteo Flood`) ve yakındaki **iNaturalist** yaban hayatı fotoğrafları.
- **NASA GIBS Günlük Uydu Fotoğrafı:** Tarih seçiciyle gerçek VIIRS True Color uydu görüntüsünü 3D küreye giydirme + RainViewer zaman kaydırıcılı canlı yağış radarı.
- **Uzay & Havacılık:** CelesTrak/yedekli SGP4 canlı uydular (90 dk yörünge yayı), **Launch Library 2** yaklaşan roket fırlatmaları, **NASA JPL** meteor/ateş topları, NOAA **Aurora & Kp** ve `adsb.lol v2` sivil + **Askerî (`MIL/LADD/PIA`)** uçuşlar.
- **Şehir, Türkiye & İstanbul Derinliği:** **OpenRailwayMap** + OSM Overpass tek tıkla Metro/Hastane/Eczane/Park/EV Şarj pinleme; İstanbul için **İSKİ Baraj Dolulukları**; Türkiye için **Kandilli + AFAD** birleşik depremler (tıklayınca tahmini hissedilme yarıçapı!), **KAF/DAF** fay hatları ve canlı kur/resmi tatil (`Frankfurter` + `Nager.Date`).
- **Ağ, Medya & Nabız:** **OONI** canlı internet sansürü / erişim engeli radarı, **Tor Onionoo** düğümleri, **IODA + RIPE RIS** BGP durumu, 200+ **KiwiSDR** kısa dalga alıcıları, 180+ doğrulanmış **HLS/MP4** kamu kamerası, 6'lı Kamera Duvarı, **Wikimedia EventStreams** canlı Vikipedi nabzı ve lokal **Ollama** bölge brifingi.
- **MAOTUN Keşif & Fotoğraf Pasaportu:** Seçili ilçede rastgele gizli mekân görevi, fotoğraf yükleme + otomatik **EXIF GPS doğrulama bonusu (+100 XP)**, rütbe/XP sistemi ve 3D kürede kendi altın fotoğraf pinlerin.
- **2 Nokta 3D Mesafe/Uçuş Ölçeri & Sinematik Otopilot Turu.**

---

## Kurulum
[GitHub Releases](https://github.com/murasakimono/maotun/releases) sayfasından Windows x64 için `MAOTUN_3.0.0_x64-setup.exe` dosyasını indirip çalıştırabilirsiniz.
