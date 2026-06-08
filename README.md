# Aero | Advanced Weather Analytics & Forecast Dashboard

Aero is a premium, real-time meteorological intelligence web application designed with a dark-mode-first glassmorphic visual system. It features live geographic mapping, interactive meteorological forecasts, micro-metric observation gauges, and a high-performance weather particle animation system.

Aero operates out of the box in a high-fidelity geographic simulation mode (ideal for offline demonstration) and connects seamlessly to the **OpenWeatherMap API** for live global forecasting data.

---

## ✨ Features

- **Atmospheric Visual Themes**: Page backgrounds change color palettes dynamically based on current weather conditions (Sunny, Overcast, Rainy, Snowy, Stormy).
- **Canvas Particle Simulations**: Real-time canvas rendering of precipitation (rain droplets, snowfall, solar sunbeams, drifting cloud puffs) matching active weather.
- **Geographic Leaflet Mapping**:
  - Expanded **Full-width (span 4)** map render area for visual depth.
  - **Click-to-Pin**: Click anywhere on the map to drop a pin and instantly load localized weather data.
  - **Draggable Pins**: Drag and drop the weather marker anywhere to trigger dynamic re-fetching of weather coordinates on the fly.
  - **Nominatim Autocomplete**: Built-in address search bar leveraging OpenStreetMap's Nominatim API to suggest and pan to any worldwide location.
- **Forecast Trend Visualization**: Toggleable lines for Temperature and Precipitation probability hourly trends utilizing **Chart.js** smooth Bezier curves.
- **Observation Metrics Grid**:
  - **Wind Compass**: Circular indicator with a rotating needle displaying raw wind directions (0-360°) and velocities.
  - **UV Index Tracker**: Colored severity scale with a sliding indicator mapping UV danger levels and protective recommendations.
  - **Solar Position Arc**: Semi-circular path showing real-time solar elevation and remaining daylight hours.
  - **Air Quality Gauge**: Linear pollution index (AQI 1-5) mapping health safety advice.
  - **Barometer, Visibility, and Humidity Card**: Dynamic numeric readings.
- **Favorites Hub**: Pin locations to a sidebar favorites panel with instant local temperature estimates, persistent across page reloads.
- **Universal Settings Console**: Configuration drawer for toggling temperature units (°C/°F), inputting API tokens, adjusting glassmorphic card blur, and disabling heavy canvas animations for lower-end machines.

---

## 🛠️ Technology Stack

- **Core**: HTML5, Vanilla CSS3 (Custom glassmorphic utility layers)
- **Scripting**: Modern ES6+ JavaScript
- **Libraries (via CDN)**:
  - **Chart.js**: Graph visualizations
  - **Leaflet.js**: Geographic mapping
  - **Lucide Icons**: Clean, developer-grade interface iconography
- **Tooling**: Node.js & Vite (Development server & production builder)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Run

1. Open your terminal in the project directory.
2. Install the dev dependencies (Vite):
   ```bash
   npm install
   ```
3. Start the local Vite development server:
   ```bash
   npm run dev
   ```
4. Open the local address in your web browser:
   [http://localhost:5173/](http://localhost:5173/)

---

## ⚙️ Connecting Live Data (OpenWeatherMap)

Aero runs a simulated meteorological engine by default. To connect live data:

1. Register for a free account at [OpenWeatherMap](https://openweathermap.org/) and navigate to the **API Keys** section to generate a token.
2. Open Aero in your browser, click **System Settings** in the bottom left, and paste your API key in the input field.
3. Click **Apply Settings**. The application will now query live real-time conditions. Settings are persisted in your browser's local storage.
