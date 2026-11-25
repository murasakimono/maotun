# MAOTUN

**Küresel Sinyal Konsolu & Canlı 3D Dünya Kartografi Enstrümanı**

MAOTUN; **Tauri v2 + Rust + MapLibre GL JS v5 (3D Globe)** üzerine kurulu, sıfır API anahtarıyla çalışan, İsviçre kartografisi ve endüstriyel enstrüman estetiğinde tasarlanmış canlı dünya gözlem ve sinyal konsoludur.

---

## Öne Çıkan Özellikler (`v2.0.0`)

### 3D Kartografi & Küre Motoru
- **Native 3D Küre & 3D Arazi Kabartması (Terrain DEM):** OpenFreeMap Dark vektör harita + açılıp kapatılabilen AWS Open Data Terrarium 3D yükselti modeli.
- **Gerçek Zamanlı Gece/Gündüz Çizgisi (Solar Terminator):** Güneşin dik açısına göre anlık hesaplanan gece yarımküresi ve alacakaranlık sınırı.
- **İsviçre / Enstrüman Arayüzü:** Keskin teknik ızgara, `Chakra Petch` + `IBM Plex Mono (tabular-nums)` tipografi, canlı UTC/TR saatleri, imleç koordinat cetveli ve kapatılabilir prosedürel WebAudio mekanik şalter/sonar sesleri.

### Canlı Veri & Sinyal Katmanları (15 Katman)
- **Deprem & Fay Hatları:** Kandilli + AFAD (tekilleştirilmiş Türkiye canlı) + USGS M2.5+ küresel depremler ve Kuzey/Doğu Anadolu + Ege aktif fay hatları.
- **Gerçek SGP4 Uydu Yörüngeleri:** CelesTrak canlı TLE verisi + `satellite.js` SGP4 motoru (ISS, Starlink, NOAA, GPS) ve seçilen uydu için **90 dakikalık gerçek yörünge yayı**.
- **Sivil & Askerî Havacılık:** `adsb.lol v2` canlı uçuşlar + küresel **Askerî (`MIL`) / Kısıtlı (`LADD`) / Gizli (`PIA`)** uçuş ayrımı.
- **KiwiSDR Kısa Dalga Radyo Alıcıları:** Dünya genelindeki açık HF/kısa dalga WebSDR alıcıları + yerel FM radyolar için canlı **WebAudio FFT Ses Spektrumu**.
- **Hava Radarı, Hava Kalitesi & Uzay Havası:** RainViewer zaman kaydırıcılı canlı yağış radarı, Open-Meteo anlık sıcaklık/rüzgâr/PM2.5/US AQI ve NOAA SWPC canlı **Aurora ovali + Kp indeksi**.
- **Küresel Altyapı & Deniz Trafiği:** Denizaltı fiber optik kablo omurgası, IODA v2 + RIPE RIS BGP internet durumu, Digitraffic (veya opsiyonel ücretsiz `AISstream.io` anahtarıyla küresel) canlı gemiler, NASA EONET afetler ve opsiyonel `NASA FIRMS` termal yangınlar.

### Komuta & Medya Araçları
- **`Ctrl+K` Komut Paleti:** Şehir, katman, ISS kilidi, otopilot ve modüller arasında klavyeden anlık geçiş.
- **Sinematik Otopilot Vitrin Turu:** 2. monitör için önemli canlı olaylara ve şehirlere otomatik kamera uçuşu.
- **Gelişmiş Kamera Sistemi & 6-Şehir Duvarı:** YouTube Live, HLS (`.m3u8`) ve periyodik yenilenen JPEG Snapshot kamera desteği + JSON içe/dışa aktarma.
- **Bölgesel Sismik Alarm & Lokal Ollama Brifingi:** Seçili bölge/büyüklük eşiği uyarıları ve tamamen lokal çalışan Ollama durum özeti.

---

## Kurulum

[GitHub Releases](https://github.com/murasakimono/maotun/releases) sayfasından Windows x64 için `MAOTUN_2.0.0_x64-setup.exe` kurulum dosyasını indirip çalıştırın.

### Geliştirme
```bash
npm install
npm run tauri dev
npm run tauri build
```
