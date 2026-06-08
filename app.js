/* ==========================================================================
   AERO WEATHER DASHBOARD - APPLICATION CONTROLLER
   Integrations: Chart.js, Leaflet.js, Lucide Icons, Canvas Particles
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial State & Instantiations
  const api = new WeatherAPI();
  let currentWeatherData = null;
  let activeChartTab = 'temp'; // 'temp' or 'rain'
  let activeMapTab = 'standard'; // 'standard' or 'precipitation'
  
  // Library Instances
  let chartInstance = null;
  let leafletMap = null;
  let mapMarker = null;
  
  // Canvas Particles State
  const canvas = document.getElementById("weather-particles");
  const ctx = canvas.getContext("2d");
  let particleAnimationId = null;
  let particlesList = [];
  let currentParticleWeatherType = "";

  // 2. DOM Elements Bindings
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const searchSuggestions = document.getElementById("search-suggestions-dropdown");
  
  const unitSwitch = document.getElementById("unit-switch-checkbox");
  const sidebarFavorites = document.getElementById("sidebar-favorites-list");
  const favoritesCountBadge = document.getElementById("favorites-count");
  
  // Sidebar toggles
  const sidebar = document.getElementById("app-sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const mobileSidebarClose = document.getElementById("mobile-sidebar-close");
  
  // Modals & triggers
  const settingsTrigger = document.getElementById("settings-trigger");
  const settingsModal = document.getElementById("settings-modal");
  const settingsClose = document.getElementById("settings-close-btn");
  const settingsSave = document.getElementById("settings-save-btn");
  const settingsReset = document.getElementById("settings-reset-btn");
  const settingApiKey = document.getElementById("setting-api-key");
  const settingBlurIntensity = document.getElementById("setting-blur-intensity");
  const settingBlurLabel = document.getElementById("blur-intensity-val");
  const settingParticlesToggle = document.getElementById("setting-particles-toggle");
  const themeBtnDark = document.getElementById("theme-btn-dark");
  const themeBtnLight = document.getElementById("theme-btn-light");
  
  const alertsTicker = document.getElementById("alerts-ticker-container");
  const alertsTickerText = document.getElementById("alerts-ticker-text");
  const alertsTickerDetails = document.getElementById("alerts-ticker-details-btn");
  
  const alertsModal = document.getElementById("alerts-modal");
  const alertsClose = document.getElementById("alerts-close-btn");
  const alertsModalTitle = document.getElementById("alert-modal-title");
  const alertsModalSender = document.getElementById("alert-modal-sender");
  const alertsModalTime = document.getElementById("alert-modal-time");
  const alertsModalDesc = document.getElementById("alert-modal-description");
  const alertsModalDismiss = document.getElementById("alerts-modal-dismiss-btn");
  
  const favoritesNavTrigger = document.getElementById("nav-manage-locations");
  const favoritesManagerModal = document.getElementById("favorites-manager-modal");
  const favoritesManagerClose = document.getElementById("fav-mgr-close-btn");
  const favoritesManagerDone = document.getElementById("fav-mgr-done-btn");
  const favoritesManagerList = document.getElementById("favorites-mgr-list");
  
  // Charts & Tabs
  const chartTabTemp = document.getElementById("chart-tab-temp");
  const chartTabRain = document.getElementById("chart-tab-rain");
  
  // Map Tabs
  const mapTabStandard = document.getElementById("map-tab-standard");
  const mapTabPrecipitation = document.getElementById("map-tab-satellite");

  // Map Search Bindings
  const mapSearchInput = document.getElementById("map-search-input");
  const mapSearchClear = document.getElementById("map-search-clear");
  const mapSearchSuggestions = document.getElementById("map-search-suggestions");

  // Favorite toggle on current weather card
  const favoriteToggleBtn = document.getElementById("favorite-toggle-btn");

  // Default City Selection
  let currentCity = CITIES.find(c => c.name === "Tokyo"); // Default seed

  // ==========================================================================
  // INITIALIZATION AND REGULAR FLOW
  // ==========================================================================

  function init() {
    // Set settings UI inputs matching active settings
    settingApiKey.value = api.settings.apiKey || "";
    settingBlurIntensity.value = api.settings.blurIntensity !== undefined ? api.settings.blurIntensity : 15;
    settingBlurLabel.textContent = `${settingBlurIntensity.value}px`;
    settingParticlesToggle.checked = api.settings.particlesEnabled !== undefined ? api.settings.particlesEnabled : true;
    
    // Apply styling blur limits
    document.documentElement.style.setProperty('--glass-blur', `${settingBlurIntensity.value}px`);
    
    // Setup initial theme configurations
    if (api.settings.theme === 'light') {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      themeBtnLight.classList.add("active");
      themeBtnDark.classList.remove("active");
    } else {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      themeBtnDark.classList.add("active");
      themeBtnLight.classList.remove("active");
    }
    
    // Quick unit switch state
    unitSwitch.checked = api.settings.unit === 'imperial';
    
    // Setup resize listener for background animation canvas
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Render favorites elements in sidebar
    updateFavoritesUI();

    // Retrieve default location to display
    const savedFavorites = api.settings.favorites;
    if (savedFavorites && savedFavorites.length > 0) {
      const match = CITIES.find(c => c.name.toLowerCase() === savedFavorites[0].toLowerCase());
      if (match) currentCity = match;
    }
    
    // Fetch and load initial dashboard weather data
    loadWeatherForCity(currentCity);
    
    // Initialize Leaflet weather maps
    initMap(currentCity.lat, currentCity.lon);
    
    // Initial particle animation triggers
    startParticleEngine();
    
    // Trigger Lucide SVG processing
    lucide.createIcons();
  }

  // ==========================================================================
  // CORE WEATHER FETCHING & RENDERING PIPELINES
  // ==========================================================================

  async function loadWeatherForCity(cityObj) {
    showLoadingState();
    
    try {
      const data = await api.getWeatherData(cityObj);
      currentWeatherData = data;
      renderWeatherDashboard(data);
    } catch (e) {
      console.error("Critical failure during weather render", e);
      alert(`Error loading data for ${cityObj.name}. Check connection or API keys.`);
    }
  }

  function showLoadingState() {
    document.getElementById("weather-city-name").textContent = "Loading...";
    document.getElementById("weather-current-temp").textContent = "--";
    document.getElementById("weather-description").textContent = "Updating climate metrics...";
  }

  function renderWeatherDashboard(data) {
    const isImperial = api.settings.unit === 'imperial';
    const tempUnit = isImperial ? '°F' : '°C';
    const speedUnit = isImperial ? 'mph' : 'km/h';

    // 1. Current Weather
    document.getElementById("weather-city-name").textContent = data.city;
    document.getElementById("weather-country-name").textContent = data.country || "Observation Point";
    document.getElementById("weather-current-temp").textContent = data.current.temp;
    document.getElementById("weather-current-unit").textContent = tempUnit;
    document.getElementById("weather-description").textContent = data.current.description;
    document.getElementById("weather-temp-min").textContent = `${data.current.temp_min}${tempUnit}`;
    document.getElementById("weather-temp-max").textContent = `${data.current.temp_max}${tempUnit}`;
    
    document.getElementById("weather-feels-like").textContent = `${data.current.feels_like}${tempUnit}`;
    document.getElementById("weather-humidity").textContent = `${data.current.humidity}%`;
    document.getElementById("weather-wind").textContent = `${data.current.wind_speed} ${speedUnit}`;

    // Update Favorite Icon Star indicator
    if (api.isFavorite(data.city)) {
      favoriteToggleBtn.classList.add("pinned");
    } else {
      favoriteToggleBtn.classList.remove("pinned");
    }

    // Set main weather visual icon
    const iconContainer = document.getElementById("weather-primary-icon");
    iconContainer.innerHTML = getWeatherIconMarkup(data.current.weather_type, "primary-weather-svg");

    // 2. Active Severe Weather Warnings Ticker
    if (data.current.alert) {
      alertsTicker.style.display = "block";
      alertsTickerText.textContent = `${data.current.alert.title}: ${data.current.alert.description}`;
    } else {
      alertsTicker.style.display = "none";
    }

    // 3. Dynamic Visual Theme Backgrounds
    applyAtmosphericTheme(data.current.weather_type);

    // 4. Update Header Date-Clock
    updateHeaderClock(data.timezone);

    // 5. Render Apple Weather Style 7-Day Forecast
    renderWeeklyForecast(data.daily, isImperial);

    // 6. Draw Hourly Chart
    renderForecastChart(data.hourly);

    // 7. Update Detailed Metrics widgets
    
    // A. Wind Compass
    document.getElementById("wind-metric-val").textContent = data.current.wind_speed;
    document.getElementById("wind-metric-unit").textContent = speedUnit;
    document.getElementById("wind-compass-needle").style.transform = `translate(-50%, -50%) rotate(${data.current.wind_deg}deg)`;
    document.getElementById("wind-metric-dir").textContent = `${getWindCompassDirection(data.current.wind_deg)} (${data.current.wind_deg}°)`;

    // B. UV Index Slider and Rating
    const uvVal = data.current.uv_index;
    const uvLevel = getUvIndexLevel(uvVal);
    const uvBadge = document.getElementById("uv-metric-level");
    document.getElementById("uv-metric-val").textContent = uvVal;
    uvBadge.textContent = uvLevel.text;
    
    // Clear previous UV classes and apply new
    uvBadge.className = "uv-gauge-level";
    uvBadge.classList.add(uvLevel.class);
    
    // Place slider indicator dot (0 to 11+)
    const uvPercent = Math.min(100, (uvVal / 11) * 100);
    document.getElementById("uv-metric-indicator").style.left = `${uvPercent}%`;
    document.getElementById("uv-metric-desc").textContent = uvLevel.desc;

    // C. Solar Arc Trajectory (Sunrise/Sunset)
    renderSolarTrajectory(data.current.sunrise, data.current.sunset, data.timezone);

    // D. Air Quality Index (AQI) slider & advice
    const aqiVal = data.current.aqi;
    const aqiLevel = getAqiLevel(aqiVal);
    document.getElementById("aqi-badge-val").textContent = aqiVal;
    document.getElementById("aqi-title-val").textContent = aqiLevel.title;
    document.getElementById("aqi-health-val").textContent = aqiLevel.desc;
    document.getElementById("aqi-metric-cursor").style.left = `${((aqiVal - 1) / 4) * 100}%`;
    document.getElementById("aqi-metric-advice").textContent = aqiLevel.advice;

    // E. Observations Card
    document.getElementById("obs-visibility-val").textContent = `${data.current.visibility} km`;
    document.getElementById("obs-pressure-val").textContent = `${data.current.pressure} hPa`;
    document.getElementById("obs-humidity-val").textContent = `${data.current.humidity}%`;
    document.getElementById("obs-rain-chance-val").textContent = `${data.hourly[0]?.rain_chance || 0}%`;

    // 8. Move and Pin Leaflet map focus
    if (leafletMap) {
      leafletMap.setView([data.lat, data.lon], 11);
      
      if (mapMarker) {
        mapMarker.setLatLng([data.lat, data.lon]);
        mapMarker.setPopupContent(`<b>${data.city}</b><br>${data.current.temp}${tempUnit}, ${data.current.description}`);
      } else {
        mapMarker = L.marker([data.lat, data.lon]).addTo(leafletMap)
          .bindPopup(`<b>${data.city}</b><br>${data.current.temp}${tempUnit}, ${data.current.description}`).openPopup();
      }
      
      document.getElementById("map-coordinates-label").textContent = `Coords: ${data.lat.toFixed(4)}°N, ${data.lon.toFixed(4)}°E`;
    }

    // Refresh lucide icons rendered dynamic
    lucide.createIcons();
  }

  // Helper mapping: return dynamic visual icons
  function getWeatherIconMarkup(type, customClass = "") {
    let iconName = "sun";
    switch (type) {
      case "Clear": iconName = "sun"; break;
      case "Clouds": iconName = "cloud"; break;
      case "Rain": iconName = "cloud-rain"; break;
      case "Drizzle": iconName = "cloud-drizzle"; break;
      case "Snow": iconName = "snowflake"; break;
      case "Thunderstorm": iconName = "cloud-lightning"; break;
      default: iconName = "cloud-sun";
    }
    return `<i data-lucide="${iconName}" class="${customClass}"></i>`;
  }

  // ==========================================================================
  // DETAILED SUB-WIDGET CALCULATIONS & RENDERING
  // ==========================================================================

  // Apply visual theme transitions & dynamic overlays
  function applyAtmosphericTheme(type) {
    const backdrop = document.getElementById("sky-backdrop");
    const lightning = document.querySelector(".lightning-overlay");
    
    // Clear previous dynamic backdrops
    backdrop.className = "sky-backdrop";
    if (lightning) {
      lightning.classList.remove("lightning-active");
      lightning.remove();
    }
    
    switch (type) {
      case "Clear":
        backdrop.classList.add("bg-sunny");
        break;
      case "Clouds":
        backdrop.classList.add("bg-cloudy");
        break;
      case "Rain":
      case "Drizzle":
        backdrop.classList.add("bg-rainy");
        break;
      case "Snow":
        backdrop.classList.add("bg-snowy");
        break;
      case "Thunderstorm":
        backdrop.classList.add("bg-thunderstorm");
        // Inject lightning element overlay
        const overlay = document.createElement("div");
        overlay.className = "lightning-overlay lightning-active";
        backdrop.appendChild(overlay);
        break;
      default:
        backdrop.classList.add("bg-sunny");
    }
    
    // Update Canvas Weather State to trigger particles change
    currentParticleWeatherType = type;
  }

  // Header dynamic time display relative to timezone offset
  function updateHeaderClock(timezoneOffset) {
    // Calculate current UTC and apply target offset
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const localTimeDate = new Date(utc + (3600000 * timezoneOffset));

    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    document.getElementById("local-date").textContent = localTimeDate.toLocaleDateString('en-US', dateOptions);
    document.getElementById("local-time").textContent = localTimeDate.toLocaleTimeString('en-US', timeOptions);
  }

  // Apple Weather range indicators slider
  function renderWeeklyForecast(dailyList, isImperial) {
    const container = document.getElementById("weekly-forecast-list");
    container.innerHTML = "";

    // Find the absolute min and max temp across all 7 days to size the sliding bar correctly
    let absoluteMin = Math.min(...dailyList.map(d => d.temp_min));
    let absoluteMax = Math.max(...dailyList.map(d => d.temp_max));
    let absoluteRange = absoluteMax - absoluteMin;

    dailyList.forEach(day => {
      // Calculate percentages for Apple style visual bars
      let leftPercent = 0;
      let widthPercent = 100;
      
      if (absoluteRange > 0) {
        leftPercent = ((day.temp_min - absoluteMin) / absoluteRange) * 100;
        widthPercent = ((day.temp_max - day.temp_min) / absoluteRange) * 100;
      }

      const row = document.createElement("div");
      row.className = "weekly-row";
      row.innerHTML = `
        <div class="weekly-day-info">
          <span class="weekly-day-name">${day.dayName}</span>
          <span class="weekly-date">${day.date}</span>
        </div>
        <div class="weekly-cond-icon">
          ${getWeatherIconMarkup(day.weather_type, "weekly-icon-svg")}
        </div>
        <div class="weekly-temp-indicator-wrapper">
          <span class="weekly-min-label">${day.temp_min}°</span>
          <div class="weekly-slider-bar">
            <div class="weekly-slider-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
          <span class="weekly-max-label">${day.temp_max}°</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // Solar Trajectory Semicircle Arc calculations
  function renderSolarTrajectory(sunriseUnix, sunsetUnix, timezoneOffset) {
    const nowUnix = Date.now() / 1000;
    
    // Semicircle measurements
    const startX = 5;
    const endX = 95;
    const arcRadiusX = 40;
    const arcRadiusY = 40;
    const baselineY = 45;

    const dot = document.getElementById("sun-arc-position-dot");
    const progressArc = document.getElementById("sun-arc-progress");
    const message = document.getElementById("sun-solar-message");

    // Format Sunrise / Sunset Times
    const utcOffset = timezoneOffset * 3600;
    const sunriseDate = new Date((sunriseUnix + utcOffset + new Date().getTimezoneOffset() * 60) * 1000);
    const sunsetDate = new Date((sunsetUnix + utcOffset + new Date().getTimezoneOffset() * 60) * 1000);

    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    document.getElementById("sun-sunrise-val").textContent = sunriseDate.toLocaleTimeString('en-US', timeOptions);
    document.getElementById("sun-sunset-val").textContent = sunsetDate.toLocaleTimeString('en-US', timeOptions);

    if (nowUnix < sunriseUnix) {
      // Before Sunrise
      dot.style.left = `5%`;
      dot.style.top = `45px`;
      progressArc.style.strokeDashoffset = "283";
      message.textContent = "Before Sunrise. Sun has not risen.";
    } else if (nowUnix > sunsetUnix) {
      // After Sunset
      dot.style.left = `95%`;
      dot.style.top = `45px`;
      progressArc.style.strokeDashoffset = "0";
      message.textContent = "After Sunset. Night has fallen.";
    } else {
      // Daylight underway
      const daylightDuration = sunsetUnix - sunriseUnix;
      const elapsed = nowUnix - sunriseUnix;
      const progress = elapsed / daylightDuration; // Value between 0 and 1

      // Semicircle Trigo: angle 180 (Pi) to 0 (sunrise to sunset)
      const angle = Math.PI - (progress * Math.PI);
      const x = 50 + Math.cos(angle) * arcRadiusX; // 50 is center X
      const y = baselineY - Math.sin(angle) * arcRadiusY;

      dot.style.left = `${x}%`;
      dot.style.top = `${y}px`;

      // Update stroke dash array offset (dasharray is approx 283)
      const offset = 283 - (progress * 283);
      progressArc.style.strokeDashoffset = offset;

      const remainingMin = Math.round((sunsetUnix - nowUnix) / 60);
      const remainingHours = (remainingMin / 60).toFixed(1);
      message.textContent = `${remainingHours} hours of daylight remaining`;
    }
  }

  // Compass text calculator
  function getWindCompassDirection(deg) {
    const directions = ["North", "N-East", "East", "S-East", "South", "S-West", "West", "N-West"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return directions[index];
  }

  // UV categories mapper
  function getUvIndexLevel(uv) {
    if (uv <= 2) return { text: "Low", class: "uv-low", desc: "No danger for average individuals." };
    if (uv <= 5) return { text: "Moderate", class: "uv-mod", desc: "Sunscreen SPF 15 recommended. Wear sunglasses." };
    if (uv <= 7) return { text: "High", class: "uv-high", desc: "Protection required. Reduce sun exposure between 11 AM - 4 PM." };
    if (uv <= 10) return { text: "Very High", class: "uv-veryhigh", desc: "Seek shade. Wear hat, sunscreen, long clothing." };
    return { text: "Extreme", class: "uv-extreme", desc: "Unprotected skin can burn in minutes. Avoid mid-day sun." };
  }

  // AQI categories mapper
  function getAqiLevel(aqi) {
    switch(aqi) {
      case 1: return { title: "Good", desc: "AQI (1/5) Air quality is pristine.", advice: "Ideal conditions for outdoor cardiovascular exercises and running." };
      case 2: return { title: "Fair", desc: "AQI (2/5) Mild pollutant levels present.", advice: "Acceptable air condition. Exceptionally sensitive people should monitor symptoms." };
      case 3: return { title: "Moderate", desc: "AQI (3/5) Moderate allergen risks.", advice: "Healthy individuals can exercise outdoors, but reduce intense sessions if coughing." };
      case 4: return { title: "Poor", desc: "AQI (4/5) Air is heavily polluted.", advice: "Sensitive groups should remain indoors. Limit intense outdoor exposure." };
      case 5: return { title: "Very Poor", desc: "AQI (5/5) Hazardous alert level.", advice: "Avoid all outdoor activity. Close windows, run indoor air filtration." };
      default: return { title: "Fair", desc: "Aero Atmosphere Metrics.", advice: "Monitoring air particle distributions..." };
    }
  }

  // ==========================================================================
  // CHART.JS LINE CHART IMPLEMENTATION
  // ==========================================================================

  function renderForecastChart(hourlyList) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const isImperial = api.settings.unit === 'imperial';
    const tempUnit = isImperial ? '°F' : '°C';

    const labels = hourlyList.map(h => h.time);
    
    // Choose dataset depending on active tab
    const chartData = activeChartTab === 'temp' 
      ? hourlyList.map(h => h.temp) 
      : hourlyList.map(h => h.rain_chance);

    const labelText = activeChartTab === 'temp' ? `Temperature (${tempUnit})` : 'Rain Chance (%)';
    
    // Color Schemes based on tab
    const borderColor = activeChartTab === 'temp' ? '#38bdf8' : '#818cf8';
    const bgGradientStart = activeChartTab === 'temp' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(129, 140, 248, 0.25)';

    const chartCtx = document.getElementById("hourly-forecast-chart").getContext("2d");
    
    // Gradient fills
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, bgGradientStart);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    // Custom Tooltip Configs matching app theme
    const isDark = api.settings.theme !== 'light';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';

    chartInstance = new Chart(chartCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: labelText,
          data: chartData,
          borderColor: borderColor,
          borderWidth: 3,
          pointBackgroundColor: borderColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4 // Bezier smooth curves
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `${context.parsed.y} ${activeChartTab === 'temp' ? tempUnit : '%'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 }
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 }
            }
          }
        }
      }
    });
  }

  // ==========================================================================
  // LEAFLET GEOGRAPHIC WEATHER MAP IMPLEMENTATION
  // ==========================================================================

  function initMap(lat, lon) {
    if (leafletMap) return;

    // Build leaflet map DOM node
    leafletMap = L.map('leaflet-weather-map', {
      zoomControl: false
    }).setView([lat, lon], 11);

    // Standard OpenStreetMap base map tile layer
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap);

    // Zoom controls customized positioning
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

    // Drop custom pin on map click
    leafletMap.on('click', async function(e) {
      const { lat, lng } = e.latlng;
      const customLocation = {
        name: `Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        lat: lat,
        lon: lng,
        country: "Custom Pin",
        timezone: Math.round(lng / 15) // Approximate timezone
      };
      currentCity = customLocation;
      await loadWeatherForCity(customLocation);
    });
  }

  // ==========================================================================
  // SEARCH CONSOLE SUGGESTIONS AUTOCOMPLETE
  // ==========================================================================

  searchInput.addEventListener("input", () => {
    const val = searchInput.value.trim().toLowerCase();
    
    if (val.length === 0) {
      searchSuggestions.style.display = "none";
      searchClear.style.display = "none";
      return;
    }

    searchClear.style.display = "block";
    
    // Filter matching global cities
    const filtered = CITIES.filter(city => 
      city.name.toLowerCase().includes(val) || 
      city.country.toLowerCase().includes(val)
    ).slice(0, 5); // Limit dropdown length

    if (filtered.length > 0) {
      searchSuggestions.innerHTML = "";
      filtered.forEach(city => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.innerHTML = `
          <div>
            <span class="suggestion-city">${city.name}</span>
            <span class="suggestion-country">${city.country}</span>
          </div>
          <span class="suggestion-coords">${city.lat.toFixed(1)}°N, ${city.lon.toFixed(1)}°E</span>
        `;
        
        item.addEventListener("click", () => {
          currentCity = city;
          loadWeatherForCity(city);
          
          // Reset autocomplete triggers
          searchInput.value = "";
          searchSuggestions.style.display = "none";
          searchClear.style.display = "none";
        });

        searchSuggestions.appendChild(item);
      });
      searchSuggestions.style.display = "block";
    } else {
      searchSuggestions.style.display = "none";
    }
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchSuggestions.style.display = "none";
    searchClear.style.display = "none";
  });

  // Click outside to collapse search options
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.style.display = "none";
    }
    if (!mapSearchInput.contains(e.target) && !mapSearchSuggestions.contains(e.target)) {
      mapSearchSuggestions.style.display = "none";
    }
  });

  // ==========================================================================
  // MAP SEARCH AUTOCOMPLETE (NOMINATIM API)
  // ==========================================================================
  let mapSearchTimeout = null;

  mapSearchInput.addEventListener("input", () => {
    const val = mapSearchInput.value.trim();
    
    if (val.length === 0) {
      mapSearchSuggestions.style.display = "none";
      mapSearchClear.style.display = "none";
      return;
    }

    mapSearchClear.style.display = "block";

    if (mapSearchTimeout) {
      clearTimeout(mapSearchTimeout);
    }

    mapSearchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data && data.length > 0) {
          mapSearchSuggestions.innerHTML = "";
          data.forEach(item => {
            const parts = item.display_name.split(',');
            const title = parts[0].trim();
            const sub = parts.slice(1).join(',').trim();
            
            const div = document.createElement("div");
            div.className = "map-suggestion-item";
            div.innerHTML = `
              <span class="map-suggestion-title">${title}</span>
              <span class="map-suggestion-sub">${sub}</span>
            `;
            
            div.addEventListener("click", () => {
              const lat = parseFloat(item.lat);
              const lon = parseFloat(item.lon);
              
              const customLoc = {
                name: title,
                lat: lat,
                lon: lon,
                country: parts[parts.length - 1]?.trim() || "Search Pin",
                timezone: Math.round(lon / 15)
              };
              
              currentCity = customLoc;
              loadWeatherForCity(customLoc);
              
              // Clear map search input
              mapSearchInput.value = "";
              mapSearchSuggestions.style.display = "none";
              mapSearchClear.style.display = "none";
            });
            
            mapSearchSuggestions.appendChild(div);
          });
          mapSearchSuggestions.style.display = "block";
        } else {
          mapSearchSuggestions.style.display = "none";
        }
      } catch (err) {
        console.warn("Error fetching address suggestions from Nominatim", err);
      }
    }, 400); // 400ms debounce
  });

  mapSearchClear.addEventListener("click", () => {
    mapSearchInput.value = "";
    mapSearchSuggestions.style.display = "none";
    mapSearchClear.style.display = "none";
  });

  // ==========================================================================
  // SIDEBAR & FAVORITES HANDLERS
  // ==========================================================================

  favoriteToggleBtn.addEventListener("click", () => {
    if (!currentWeatherData) return;
    
    const favorites = api.toggleFavorite(currentWeatherData.city);
    updateFavoritesUI();

    if (api.isFavorite(currentWeatherData.city)) {
      favoriteToggleBtn.classList.add("pinned");
    } else {
      favoriteToggleBtn.classList.remove("pinned");
    }
  });

  function updateFavoritesUI() {
    sidebarFavorites.innerHTML = "";
    const favs = api.settings.favorites;
    favoritesCountBadge.textContent = favs.length;

    if (favs.length === 0) {
      sidebarFavorites.innerHTML = `<div class="nav-item settings-help" style="padding-left: 12px;">No pinned locations.</div>`;
      return;
    }

    favs.forEach(cityName => {
      const match = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
      if (!match) return;

      const link = document.createElement("a");
      link.href = "#";
      link.className = "fav-nav-link";
      
      // Compute temporary values matching metrics
      let currentTempText = "";
      if (currentWeatherData && currentWeatherData.city.toLowerCase() === cityName.toLowerCase()) {
        currentTempText = `${currentWeatherData.current.temp}°`;
      } else {
        // Quick estimate simulation to show values instantly
        const isImperial = api.settings.unit === 'imperial';
        const base = Math.abs(match.lat) < 15 ? 28 : Math.abs(match.lat) > 55 ? 2 : 16;
        const temp = isImperial ? Math.round((base * 9)/5 + 32) : base;
        currentTempText = `${temp}°`;
      }

      link.innerHTML = `
        <div class="fav-nav-info">
          <span>${match.name}</span>
          <span style="font-size: 10px; color: var(--text-muted);">${match.country}</span>
        </div>
        <span class="fav-nav-temp">${currentTempText}</span>
      `;

      link.addEventListener("click", (e) => {
        e.preventDefault();
        currentCity = match;
        loadWeatherForCity(match);
        
        // Collapse mobile sidebar if open
        sidebar.classList.remove("active");
      });

      sidebarFavorites.appendChild(link);
    });
  }

  // Favorites Pin Manager Modal operations
  favoritesNavTrigger.addEventListener("click", (e) => {
    e.preventDefault();
    renderFavoritesManagerList();
    favoritesManagerModal.style.display = "flex";
  });

  function renderFavoritesManagerList() {
    favoritesManagerList.innerHTML = "";
    const favs = api.settings.favorites;

    if (favs.length === 0) {
      favoritesManagerList.innerHTML = `<p class="settings-help">No favorites saved yet.</p>`;
      return;
    }

    favs.forEach(cityName => {
      const item = document.createElement("div");
      item.className = "favorites-mgr-item";
      item.innerHTML = `
        <span>${cityName}</span>
        <button class="fav-remove-btn" data-city="${cityName}" aria-label="Remove">
          <i data-lucide="trash-2"></i>
        </button>
      `;

      item.querySelector(".fav-remove-btn").addEventListener("click", (e) => {
        const target = e.currentTarget.getAttribute("data-city");
        api.toggleFavorite(target);
        updateFavoritesUI();
        renderFavoritesManagerList();
        
        if (currentWeatherData && currentWeatherData.city === target) {
          favoriteToggleBtn.classList.remove("pinned");
        }
        lucide.createIcons();
      });

      favoritesManagerList.appendChild(item);
    });
    
    lucide.createIcons();
  }

  favoritesManagerClose.addEventListener("click", () => favoritesManagerModal.style.display = "none");
  favoritesManagerDone.addEventListener("click", () => favoritesManagerModal.style.display = "none");

  // Mobile drawer controls
  sidebarToggle.addEventListener("click", () => sidebar.classList.add("active"));
  mobileSidebarClose.addEventListener("click", () => sidebar.classList.remove("active"));

  // ==========================================================================
  // CONFIGURATION MODAL CONTROLS & SETTINGS VALUES SAVING
  // ==========================================================================

  settingsTrigger.addEventListener("click", () => settingsModal.style.display = "flex");
  settingsClose.addEventListener("click", () => settingsModal.style.display = "none");
  
  settingBlurIntensity.addEventListener("input", () => {
    settingBlurLabel.textContent = `${settingBlurIntensity.value}px`;
  });

  themeBtnDark.addEventListener("click", () => {
    themeBtnDark.classList.add("active");
    themeBtnLight.classList.remove("active");
  });
  
  themeBtnLight.addEventListener("click", () => {
    themeBtnLight.classList.add("active");
    themeBtnDark.classList.remove("active");
  });

  settingsSave.addEventListener("click", () => {
    const key = settingApiKey.value.trim();
    const blur = parseInt(settingBlurIntensity.value);
    const particles = settingParticlesToggle.checked;
    const isDarkTheme = themeBtnDark.classList.contains("active");

    // Persist settings
    api.saveSettings({
      apiKey: key,
      blurIntensity: blur,
      particlesEnabled: particles,
      theme: isDarkTheme ? 'dark' : 'light'
    });

    // Apply aesthetics immediately
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    
    if (isDarkTheme) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
    }

    settingsModal.style.display = "none";
    
    // Restart animation engine reflecting toggle settings
    startParticleEngine();
    
    // Reload weather with updated configurations (such as new API keys)
    loadWeatherForCity(currentCity);
  });

  settingsReset.addEventListener("click", () => {
    if (confirm("Reset configurations to default settings?")) {
      api.saveSettings(api.defaults);
      init();
      settingsModal.style.display = "none";
    }
  });

  // Quick Switch Fahrenheit - Celsius Checkbox handler
  unitSwitch.addEventListener("change", () => {
    const unitValue = unitSwitch.checked ? 'imperial' : 'metric';
    api.saveSettings({ unit: unitValue });
    
    // Redraw lists, cards, charts
    if (currentWeatherData) {
      renderWeatherDashboard(currentWeatherData);
      updateFavoritesUI();
    }
  });

  // Severe Alerts triggers
  alertsTickerDetails.addEventListener("click", () => {
    if (!currentWeatherData || !currentWeatherData.current.alert) return;
    
    alertsModalTitle.textContent = currentWeatherData.current.alert.title;
    alertsModalSender.textContent = currentWeatherData.current.alert.sender;
    alertsModalTime.textContent = `${currentWeatherData.current.alert.starts} - ${currentWeatherData.current.alert.ends}`;
    alertsModalDesc.textContent = currentWeatherData.current.alert.description;
    
    alertsModal.style.display = "flex";
  });

  alertsClose.addEventListener("click", () => alertsModal.style.display = "none");
  alertsModalDismiss.addEventListener("click", () => alertsModal.style.display = "none");

  // Chart Forecast switcher tabs
  chartTabTemp.addEventListener("click", () => {
    if (activeChartTab === 'temp') return;
    activeChartTab = 'temp';
    chartTabTemp.classList.add("active");
    chartTabRain.classList.remove("active");
    if (currentWeatherData) renderForecastChart(currentWeatherData.hourly);
  });

  chartTabRain.addEventListener("click", () => {
    if (activeChartTab === 'rain') return;
    activeChartTab = 'rain';
    chartTabRain.classList.add("active");
    chartTabTemp.classList.remove("active");
    if (currentWeatherData) renderForecastChart(currentWeatherData.hourly);
  });

  // ==========================================================================
  // HIGH-PERFORMANCE ATMOSPHERIC CANVAS PARTICLES ENGINE
  // ==========================================================================

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startParticleEngine() {
    if (particleAnimationId) {
      cancelAnimationFrame(particleAnimationId);
    }

    if (api.settings.particlesEnabled === false) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    particlesList = [];
    loopParticles();
  }

  function loopParticles() {
    // Canvas sizing validation
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      resizeCanvas();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Seed new particles based on weather density
    spawnAtmosphericParticles();

    // Render & Move items
    updateAndDrawParticles();

    particleAnimationId = requestAnimationFrame(loopParticles);
  }

  function spawnAtmosphericParticles() {
    const maxParticles = 120;
    
    if (particlesList.length >= maxParticles) return;

    // Control spawn rate matching conditions
    if (currentParticleWeatherType === "Rain" || currentParticleWeatherType === "Thunderstorm") {
      const spawnCount = currentParticleWeatherType === "Thunderstorm" ? 3 : 2;
      for (let i = 0; i < spawnCount; i++) {
        particlesList.push({
          x: Math.random() * canvas.width,
          y: -10,
          vy: 8 + Math.random() * 6,
          vx: -1.5 - Math.random() * 1.5,
          length: 12 + Math.random() * 14,
          width: 1 + Math.random() * 1,
          opacity: 0.15 + Math.random() * 0.25,
          type: 'rain'
        });
      }
    } else if (currentParticleWeatherType === "Drizzle") {
      if (Math.random() < 0.6) {
        particlesList.push({
          x: Math.random() * canvas.width,
          y: -10,
          vy: 4 + Math.random() * 3,
          vx: -0.5 - Math.random() * 0.5,
          length: 6 + Math.random() * 8,
          width: 0.8,
          opacity: 0.1 + Math.random() * 0.15,
          type: 'rain'
        });
      }
    } else if (currentParticleWeatherType === "Snow") {
      if (Math.random() < 0.4) {
        particlesList.push({
          x: Math.random() * canvas.width,
          y: -10,
          vy: 1 + Math.random() * 1.5,
          vx: Math.sin(Math.random() * Math.PI) * 0.5 - 0.25,
          radius: 1.5 + Math.random() * 3.5,
          opacity: 0.2 + Math.random() * 0.4,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
          wobbleFactor: Math.random() * 10,
          type: 'snow'
        });
      }
    } else if (currentParticleWeatherType === "Clear") {
      // Glow floating rays - rare spawn
      if (Math.random() < 0.04 && particlesList.length < 25) {
        particlesList.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vy: -(0.3 + Math.random() * 0.5),
          vx: Math.random() * 0.4 - 0.2,
          radius: 15 + Math.random() * 25,
          opacity: 0.02 + Math.random() * 0.05,
          type: 'sunbeam'
        });
      }
    } else if (currentParticleWeatherType === "Clouds") {
      // Large faint passing cloud puffs - very rare
      if (Math.random() < 0.008 && particlesList.filter(p => p.type === 'cloud').length < 8) {
        particlesList.push({
          x: -120,
          y: Math.random() * (canvas.height * 0.6),
          vy: 0,
          vx: 0.1 + Math.random() * 0.25,
          radius: 80 + Math.random() * 100,
          opacity: 0.05 + Math.random() * 0.08,
          type: 'cloud'
        });
      }
    }
  }

  function updateAndDrawParticles() {
    for (let i = particlesList.length - 1; i >= 0; i--) {
      const p = particlesList[i];

      // Update positions
      p.y += p.vy;
      p.x += p.vx;

      // Type behaviors
      if (p.type === 'rain') {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.lineWidth = p.width;
        ctx.moveTo(p.x, p.y);
        // Draw slanted lines matching velocity vectors
        ctx.lineTo(p.x + p.vx, p.y + p.length);
        ctx.stroke();

        // Bounds validation
        if (p.y > canvas.height + 10) {
          particlesList.splice(i, 1);
        }
      } 
      else if (p.type === 'snow') {
        p.wobbleFactor += p.wobbleSpeed;
        p.x += Math.sin(p.wobbleFactor) * 0.4; // Wobbling sway behavior

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bounds validation
        if (p.y > canvas.height + 10) {
          particlesList.splice(i, 1);
        }
      } 
      else if (p.type === 'sunbeam') {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(253, 224, 71, ${p.opacity})`);
        grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bounds validation
        if (p.y < -p.radius || p.x < -p.radius || p.x > canvas.width + p.radius) {
          particlesList.splice(i, 1);
        }
      }
      else if (p.type === 'cloud') {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
        grad.addColorStop(0.7, `rgba(255, 255, 255, ${p.opacity * 0.4})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bounds validation
        if (p.x > canvas.width + p.radius) {
          particlesList.splice(i, 1);
        }
      }
    }
  }

  // ==========================================================================
  // RUN SYSTEM INITIALIZER
  // ==========================================================================
  init();
});
