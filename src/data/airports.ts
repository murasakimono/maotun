export interface MajorAirport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export const MAJOR_AIRPORTS: MajorAirport[] = [
  { iata: 'IST', name: 'İstanbul Havalimanı', city: 'İstanbul', country: 'TR', lat: 41.2753, lon: 28.7519 },
  { iata: 'SAW', name: 'Sabiha Gökçen', city: 'İstanbul', country: 'TR', lat: 40.8986, lon: 29.3092 },
  { iata: 'ESB', name: 'Esenboğa Havalimanı', city: 'Ankara', country: 'TR', lat: 40.1281, lon: 32.9951 },
  { iata: 'ADB', name: 'Adnan Menderes', city: 'İzmir', country: 'TR', lat: 38.2924, lon: 27.157 },
  { iata: 'AYT', name: 'Antalya Havalimanı', city: 'Antalya', country: 'TR', lat: 36.8987, lon: 30.8005 },
  { iata: 'HTY', name: 'Hatay Havalimanı', city: 'Hatay', country: 'TR', lat: 36.3628, lon: 36.2822 },
  { iata: 'TZX', name: 'Trabzon Havalimanı', city: 'Trabzon', country: 'TR', lat: 40.9951, lon: 39.7897 },
  { iata: 'LHR', name: 'London Heathrow', city: 'Londra', country: 'GB', lat: 51.47, lon: -0.4543 },
  { iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR', lat: 49.0097, lon: 2.5479 },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE', lat: 50.0379, lon: 8.5622 },
  { iata: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL', lat: 52.3105, lon: 4.7683 },
  { iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'AE', lat: 25.2532, lon: 55.3657 },
  { iata: 'JFK', name: 'New York JFK', city: 'New York', country: 'US', lat: 40.6413, lon: -73.7781 },
  { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'US', lat: 33.9416, lon: -118.4085 },
  { iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP', lat: 35.5494, lon: 139.7798 },
  { iata: 'ICN', name: 'Seoul Incheon', city: 'Seul', country: 'KR', lat: 37.4602, lon: 126.4407 },
  { iata: 'SIN', name: 'Singapore Changi', city: 'Singapur', country: 'SG', lat: 1.3644, lon: 103.9915 },
];
