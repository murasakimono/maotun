<div align="center">

# MAOTUN

**Küresel Sinyal Konsolu & Canlı Dünya İstihbarat Küresi**

[![Version](https://img.shields.io/badge/release-v1.0.0-38bdf8?style=for-the-badge)](https://github.com/murasakimono/maotun/releases/latest)
[![Platform](https://img.shields.io/badge/Windows-x64-05070a?style=for-the-badge&logo=windows)](https://github.com/murasakimono/maotun/releases/latest)
[![Stack](https://img.shields.io/badge/Tauri_v2_+_Rust_+_MapLibre_3D-0ea5e9?style=for-the-badge&logo=rust)](https://tauri.app)

</div>

---

**MAOTUN**, tam ekran yaşayan bir **3D Dünya Küresi** üzerinden herhangi bir **semte, şehre veya ülkeye** tıklayarak o bölgedeki canlı kameraları, yerel radyoları, açık TV kanallarını, havadaki uçuşları, uyduları, anlık depremleri, afetleri, internet kesintilerini ve son dakika haberlerini tek pencerede toplayan açık kaynaklı bir masaüstü komuta konsoludur.

**Sıfır API anahtarı, sıfır abonelik, sıfır takip.**

## Canlı Veri Katmanları

| Katman | Kaynak |
|---|---|
| **3D Küre → Sokak Zoom** | MapLibre GL JS v5 (`globe`) + OpenFreeMap Dark |
| **Canlı Depremler (TR + Global)** | Kandilli Rasathanesi Canlı API + USGS GeoJSON |
| **Doğal Afetler** | NASA EONET v3 (yangınlar, fırtınalar, volkanlar) |
| **Canlı Uçuşlar (ADS-B)** | `api.adsb.lol` |
| **Canlı Uydular** | ISS Canlı Telemetri + Yörünge Takibi (Tiangong, Hubble, NOAA-20, Starlink) |
| **Yerel Radyolar** | Radio-Browser.info (uygulama içi kalıcı mini çalar) |
| **Açık Canlı TV** | IPTV-Org ülke bazlı HLS akışları (`hls.js` gömülü oynatıcı) |
| **Canlı Şehir Kameraları** | 7/24 şehir kameraları + Çoklu Kamera Duvarı (6 şehir eşzamanlı) + özel HLS/YouTube ekleme |
| **İnternet Kesintileri** | IODA v2 (Georgia Tech / CAIDA) |
| **Haberler & AI Brifing** | GDELT 2.0 + opsiyonel lokal Ollama durum özeti |

## Kurulum (Windows x64)

1. [Releases](https://github.com/murasakimono/maotun/releases/latest) sayfasından **`MAOTUN_1.0.0_x64-setup.exe`** dosyasını indirip çalıştır.
2. Haritada istediğin semte/şehre tıkla veya sol üstten ara (ör. `Kadıköy`, `Antakya`, `Tokyo`, `New York`).

## Kaynaktan Derleme

```bash
npm install
npm run tauri build
```
