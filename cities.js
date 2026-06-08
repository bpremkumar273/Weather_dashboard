const CITIES = [
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, timezone: 9 },
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060, timezone: -4 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, timezone: 1 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, timezone: 2 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, timezone: 10 },
  { name: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, timezone: 5.5 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, timezone: 3 },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, timezone: -3 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832, timezone: -4 },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, timezone: 2 },
  { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173, timezone: 3 },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708, timezone: 4 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, timezone: 8 },
  { name: "Berlin", country: "Germany", lat: 52.5200, lon: 13.4050, timezone: 2 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, timezone: -3 },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437, timezone: -7 },
  { name: "Reykjavik", country: "Iceland", lat: 64.1466, lon: -21.9426, timezone: 0 },
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219, timezone: 3 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, timezone: 7 },
  { name: "Auckland", country: "New Zealand", lat: -36.8485, lon: 174.7633, timezone: 12 },
  { name: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428, timezone: -5 },
  { name: "Nuuk", country: "Greenland", lat: 64.1743, lon: -51.7373, timezone: -1 },
  { name: "Delhi", country: "India", lat: 28.6139, lon: 77.2090, timezone: 5.5 },
  { name: "Death Valley", country: "United States", lat: 36.5323, lon: -116.9325, timezone: -7 },
  { name: "Cherrapunji", country: "India", lat: 25.2702, lon: 91.7323, timezone: 5.5 },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, timezone: 2 },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.9780, timezone: 9 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, timezone: -6 },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792, timezone: 1 },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, timezone: 3 }
];

// Export if module environment, else make it global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CITIES;
}
