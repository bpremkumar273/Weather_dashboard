class WeatherAPI {
  constructor() {
    this.storageKey = 'weather_dashboard_settings';
    this.defaults = {
      apiKey: '',
      unit: 'metric', // metric (C, km/h) or imperial (F, mph)
      favorites: ['Tokyo', 'New York', 'London', 'Mumbai'],
      theme: 'dark'
    };
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("Could not load settings from LocalStorage, using defaults.", e);
    }
    return { ...this.defaults };
  }

  saveSettings(newSettings = {}) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (e) {
      console.error("Failed to save settings to LocalStorage", e);
    }
  }

  toggleFavorite(cityName) {
    let favs = [...this.settings.favorites];
    const index = favs.indexOf(cityName);
    if (index > -1) {
      favs.splice(index, 1);
    } else {
      favs.push(cityName);
    }
    this.saveSettings({ favorites: favs });
    return favs;
  }

  isFavorite(cityName) {
    return this.settings.favorites.includes(cityName);
  }

  async getWeatherData(cityObj) {
    const { name, lat, lon, timezone } = cityObj;
    const apiKey = this.settings.apiKey;

    if (apiKey && apiKey.trim() !== "") {
      try {
        return await this.fetchFromLiveAPI(cityObj, apiKey);
      } catch (error) {
        console.warn("Failed to fetch live weather data. Falling back to high-fidelity simulation.", error);
        return this.generateSimulatedData(cityObj);
      }
    } else {
      // Return high-fidelity simulation immediately
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.generateSimulatedData(cityObj));
        }, 600); // Simulate network delay
      });
    }
  }

  async fetchFromLiveAPI(cityObj, apiKey) {
    const { name, lat, lon } = cityObj;
    const unit = this.settings.unit === 'metric' ? 'metric' : 'imperial';

    // 1. Current Weather
    const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`);
    if (!currentRes.ok) throw new Error(`Weather API returned status ${currentRes.status}`);
    const currentRaw = await currentRes.json();

    // 2. Forecast Data (5 Day / 3 Hour)
    const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`);
    if (!forecastRes.ok) throw new Error(`Forecast API returned status ${forecastRes.status}`);
    const forecastRaw = await forecastRes.json();

    // 3. Air Pollution Data
    let aqi = 2; // Default moderate
    try {
      const airRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
      if (airRes.ok) {
        const airRaw = await airRes.json();
        aqi = airRaw.list?.[0]?.main?.aqi || 2; // AQI 1-5
      }
    } catch (e) {
      console.warn("Could not fetch air quality data.", e);
    }

    // Map openweather icons/weather classes to our dashboard schema
    const weatherMain = currentRaw.weather?.[0]?.main || "Clear";
    const weatherDesc = currentRaw.weather?.[0]?.description || "clear sky";

    // Transform hourly forecast (extract first 24 hours / 8 steps of 3h forecast)
    const hourly = forecastRaw.list.slice(0, 8).map(item => {
      const date = new Date(item.dt * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      return {
        time: `${hours}:00`,
        temp: Math.round(item.main.temp),
        rain_chance: Math.round((item.pop || 0) * 100),
        weather_type: item.weather?.[0]?.main || "Clear"
      };
    });

    // Transform daily forecast (aggregate 5 days)
    const daysMap = {};
    forecastRaw.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!daysMap[dayName]) {
        daysMap[dayName] = {
          dayName,
          date: dateStr,
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          weather_types: [item.weather?.[0]?.main || "Clear"],
          pops: [item.pop || 0],
          humidities: [item.main.humidity]
        };
      } else {
        daysMap[dayName].temp_min = Math.min(daysMap[dayName].temp_min, item.main.temp_min);
        daysMap[dayName].temp_max = Math.max(daysMap[dayName].temp_max, item.main.temp_max);
        daysMap[dayName].weather_types.push(item.weather?.[0]?.main || "Clear");
        daysMap[dayName].pops.push(item.pop || 0);
        daysMap[dayName].humidities.push(item.main.humidity);
      }
    });

    const daily = Object.values(daysMap).slice(0, 7).map(d => {
      // Find most common weather type
      const counts = {};
      let maxType = d.weather_types[0];
      let maxCount = 0;
      d.weather_types.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
        if (counts[t] > maxCount) {
          maxCount = counts[t];
          maxType = t;
        }
      });

      const avgRainChance = d.pops.reduce((sum, v) => sum + v, 0) / d.pops.length;
      const avgHumidity = d.humidities.reduce((sum, v) => sum + v, 0) / d.humidities.length;

      return {
        dayName: d.dayName,
        date: d.date,
        temp_min: Math.round(d.temp_min),
        temp_max: Math.round(d.temp_max),
        weather_type: maxType,
        rain_chance: Math.round(avgRainChance * 100),
        humidity: Math.round(avgHumidity)
      };
    });

    // UV Index: OpenWeatherMap requires a different api call, we simulate UV based on weather type and coords
    const latAbs = Math.abs(lat);
    let baseUv = Math.max(1, 12 - (latAbs / 8)); // Stronger near equator
    if (weatherMain === "Rain" || weatherMain === "Thunderstorm") baseUv *= 0.15;
    else if (weatherMain === "Clouds") baseUv *= 0.5;
    const uvIndex = Math.max(1, Math.min(11, Math.round(baseUv)));

    // Visibility in raw standard is meters
    const visibilityKm = (currentRaw.visibility || 10000) / 1000;

    // Convert speed to proper metric if requested
    // OpenWeather API units metric: m/s. We want km/h.
    // If unit imperial: miles/hour. We keep as is.
    let windSpeed = currentRaw.wind?.speed || 0;
    if (unit === 'metric') {
      windSpeed = Math.round(windSpeed * 3.6); // m/s to km/h
    } else {
      windSpeed = Math.round(windSpeed); // mph
    }

    // Weather warnings (simulate if weather is extreme)
    let alert = null;
    if (windSpeed > 50) {
      alert = {
        title: "High Wind Advisory",
        sender: "Local Meteorological Authority",
        description: `Strong sustained winds of up to ${windSpeed} ${unit === 'metric' ? 'km/h' : 'mph'} are expected. Secure loose objects and exercise caution when driving.`,
        starts: "Today",
        ends: "Tomorrow"
      };
    } else if (weatherMain === "Thunderstorm") {
      alert = {
        title: "Severe Thunderstorm Warning",
        sender: "National Weather Service",
        description: "Severe thunderstorms detected in the area, capable of producing lighting, hail, and localized flooding. Stay indoors.",
        starts: "Immediate",
        ends: "Tonight"
      };
    } else if (unit === 'metric' ? currentRaw.main.temp > 38 : currentRaw.main.temp > 100) {
      alert = {
        title: "Extreme Heat Warning",
        sender: "Ministry of Health",
        description: "Dangerous levels of heat are forecast. Drink plenty of fluids, stay in air-conditioned rooms, and avoid strenuous outdoor activity.",
        starts: "Immediate",
        ends: "In 2 days"
      };
    }

    return {
      city: name,
      country: cityObj.country || currentRaw.sys?.country || "",
      lat: lat,
      lon: lon,
      timezone: cityObj.timezone !== undefined ? cityObj.timezone : (currentRaw.timezone / 3600),
      current: {
        temp: Math.round(currentRaw.main.temp),
        temp_min: Math.round(currentRaw.main.temp_min),
        temp_max: Math.round(currentRaw.main.temp_max),
        feels_like: Math.round(currentRaw.main.feels_like),
        humidity: currentRaw.main.humidity || 50,
        pressure: currentRaw.main.pressure || 1013,
        wind_speed: windSpeed,
        wind_deg: currentRaw.wind?.deg || 0,
        uv_index: uvIndex,
        aqi: aqi,
        visibility: visibilityKm,
        sunrise: currentRaw.sys?.sunrise || (Date.now()/1000 - 18000),
        sunset: currentRaw.sys?.sunset || (Date.now()/1000 + 18000),
        weather_type: weatherMain,
        description: weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1),
        alert: alert
      },
      hourly: hourly,
      daily: daily
    };
  }

  generateSimulatedData(cityObj) {
    const { name, lat, lon, timezone } = cityObj;
    const isImperial = this.settings.unit === 'imperial';

    // Hash name to get reproducible seed for static behavior per day
    const daySeed = new Date().getDate() + new Date().getMonth() * 31;
    const seed = this.hashString(name) + daySeed;
    
    // Core climate profiles
    let climate = "temperate";
    if (Math.abs(lat) < 15) climate = "tropical";
    else if (Math.abs(lat) > 55) climate = "arctic";
    else if (name === "Death Valley" || name === "Dubai" || name === "Cairo") climate = "desert";
    else if (name === "Cherrapunji") climate = "monsoon";

    // Setup base averages depending on climate and time of year (approximate seasonal influence)
    const month = new Date().getMonth();
    const isNorthernHemisphere = lat >= 0;
    const isSummer = isNorthernHemisphere ? (month >= 5 && month <= 8) : (month <= 1 || month >= 11);
    const isWinter = isNorthernHemisphere ? (month <= 1 || month >= 11) : (month >= 5 && month <= 8);

    let baseTemp = 18; // Celsius default
    let humidityBase = 60;
    let windBase = 12;
    let clearChance = 0.4;
    let rainChanceVal = 0.2;
    let snowChanceVal = 0.0;

    switch (climate) {
      case "tropical":
        baseTemp = isSummer ? 31 : 27;
        humidityBase = 80;
        windBase = 8;
        clearChance = 0.25;
        rainChanceVal = 0.6;
        break;
      case "desert":
        baseTemp = isSummer ? 42 : 25;
        humidityBase = 15;
        windBase = 14;
        clearChance = 0.9;
        rainChanceVal = 0.02;
        break;
      case "arctic":
        baseTemp = isSummer ? 8 : -8;
        humidityBase = 75;
        windBase = 22;
        clearChance = 0.2;
        rainChanceVal = 0.1;
        snowChanceVal = 0.6;
        break;
      case "monsoon":
        baseTemp = 24;
        humidityBase = 90;
        windBase = 16;
        clearChance = 0.05;
        rainChanceVal = 0.85;
        break;
      default: // temperate
        baseTemp = isSummer ? 25 : isWinter ? 5 : 15;
        humidityBase = 55;
        windBase = 11;
        clearChance = 0.45;
        rainChanceVal = 0.25;
        snowChanceVal = isWinter ? 0.2 : 0.0;
    }

    // Daily fluctuations based on random seed
    const tempOffset = (this.seededRandom(seed) * 8) - 4; // -4 to +4 C variance
    const activeBaseTemp = baseTemp + tempOffset;

    // Pick dynamic weather state
    const randState = this.seededRandom(seed + 1);
    let weatherType = "Clear";
    let desc = "Clear Sky";

    if (randState < clearChance) {
      weatherType = "Clear";
      desc = "Clear sky";
    } else if (randState < clearChance + rainChanceVal) {
      const intensity = this.seededRandom(seed + 2);
      if (intensity < 0.2) {
        weatherType = "Drizzle";
        desc = "Light misting drizzle";
      } else if (intensity < 0.8) {
        weatherType = "Rain";
        desc = "Moderate rain showers";
      } else {
        weatherType = "Thunderstorm";
        desc = "Heavy thunderstorm with lightning";
      }
    } else if (randState < clearChance + rainChanceVal + snowChanceVal) {
      weatherType = "Snow";
      desc = this.seededRandom(seed + 3) > 0.5 ? "Fluffy snow flurries" : "Heavy winter snowfall";
    } else {
      weatherType = "Clouds";
      const density = this.seededRandom(seed + 4);
      desc = density < 0.3 ? "Few passing clouds" : density < 0.7 ? "Partly cloudy skies" : "Overcast gloomy clouds";
    }

    // Build Current Details
    const now = new Date();
    const currentHour = now.getHours();
    
    // Diurnal variation: warmest around 3pm, coolest around 5am
    const diurnalFactor = Math.sin(((currentHour - 9) / 24) * 2 * Math.PI); // -1 to +1
    const currentTempC = activeBaseTemp + (diurnalFactor * 5); // +/- 5 deg swing
    const currentTemp = Math.round(isImperial ? this.cToF(currentTempC) : currentTempC);
    
    const tempMinC = activeBaseTemp - 6;
    const tempMaxC = activeBaseTemp + 6;
    const tempMin = Math.round(isImperial ? this.cToF(tempMinC) : tempMinC);
    const tempMax = Math.round(isImperial ? this.cToF(tempMaxC) : tempMaxC);

    const feelsLikeC = currentTempC + (humidityBase > 70 ? (humidityBase - 70) * 0.1 : 0) - (windBase > 15 ? (windBase - 15) * 0.05 : 0);
    const feelsLike = Math.round(isImperial ? this.cToF(feelsLikeC) : feelsLikeC);

    // Weather details
    const humidity = Math.round(Math.min(99, Math.max(10, humidityBase + (this.seededRandom(seed + 5) * 20 - 10) - (diurnalFactor * 10))));
    const windSpeedC = Math.round(Math.max(2, windBase + (this.seededRandom(seed + 6) * 12 - 6)));
    const windSpeed = isImperial ? Math.round(windSpeedC * 0.621371) : windSpeedC; // km/h to mph
    const windDeg = Math.round(this.seededRandom(seed + 7) * 360);
    const pressure = Math.round(1008 + (this.seededRandom(seed + 8) * 12) + (weatherType === "Clear" ? 4 : -4));
    
    // UV Index curve based on hour & climate
    let solarElevation = Math.max(0, Math.sin(((currentHour - 6) / 12) * Math.PI)); // Peak at 12pm
    let maxUv = climate === "desert" ? 11 : climate === "tropical" ? 10 : climate === "arctic" ? 3 : 7;
    if (weatherType === "Rain" || weatherType === "Thunderstorm") maxUv *= 0.2;
    else if (weatherType === "Clouds") maxUv *= 0.5;
    const uvIndex = Math.round(solarElevation * maxUv);

    // AQI (1-5)
    let aqi = 1;
    if (climate === "desert") aqi = 2; // Sand dust
    else if (name === "Mumbai" || name === "Delhi" || name === "Lagos") aqi = 4; // High pollution simulation
    else if (name === "Tokyo" || name === "New York" || name === "London") aqi = 2; // Moderate
    else aqi = 1; // Good

    const visibility = Math.max(1, Math.round(16 - (humidity * 0.1) - (weatherType === "Rain" || weatherType === "Snow" ? 8 : 0)));

    // Sunrise & Sunset Unix
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    const timezoneOffsetSec = timezone * 3600;
    const sunrise = todayStart + (6 * 3600) - timezoneOffsetSec; // approx 6:00 AM local
    const sunset = todayStart + (18.5 * 3600) - timezoneOffsetSec; // approx 6:30 PM local

    // Warnings
    let alert = null;
    if (climate === "desert" && currentTempC > 43) {
      alert = {
        title: "Extreme Desert Heat Warning",
        sender: "Department of Environmental Health",
        description: "Hazardously hot conditions expected. Temperatures will reach life-threatening levels. Avoid sun exposure and strenuous activity.",
        starts: "11:00 AM",
        ends: "07:00 PM"
      };
    } else if (weatherType === "Thunderstorm" && windSpeedC > 30) {
      alert = {
        title: "Severe Thunderstorm Warning",
        sender: "Met Office Hydrologic Safety",
        description: "Severe weather cells moving through. Fast-moving cloud-to-ground lightning and torrential rain could trigger immediate urban flooding.",
        starts: "Immediate",
        ends: "Tonight"
      };
    } else if (climate === "arctic" && currentTempC < -15) {
      alert = {
        title: "Extreme Freeze Warning",
        sender: "Arctic Safety Commission",
        description: "Severe sub-zero freeze underway. Exposed skin will develop frostbite within 10-15 minutes. Heavy winds are causing massive windchill values.",
        starts: "Immediate",
        ends: "Friday"
      };
    } else if (name === "Cherrapunji" && weatherType === "Rain" && humidity > 95) {
      alert = {
        title: "Heavy Rainfall Alert",
        sender: "Regional Disaster Mitigation",
        description: "Extremely heavy monsoon rainfall is occurring. Localized landslides and severe river swelling are highly probable in low-lying routes.",
        starts: "Active",
        ends: "Tomorrow"
      };
    }

    // Generate Hourly Forecast (24 Items)
    const hourly = [];
    for (let i = 0; i < 24; i++) {
      const hTime = new Date(now.getTime() + (i * 3600 * 1000));
      const hourVal = hTime.getHours();
      const localHourStr = `${hourVal.toString().padStart(2, '0')}:00`;
      
      const hourDiurnal = Math.sin(((hourVal - 9) / 24) * 2 * Math.PI);
      const hTempC = activeBaseTemp + (hourDiurnal * 5.2) + (this.seededRandom(seed + 10 + i) * 1.5 - 0.75);
      const hTemp = Math.round(isImperial ? this.cToF(hTempC) : hTempC);

      // Fluctuating conditions for hourly
      let hType = weatherType;
      let hRain = 0;
      if (weatherType === "Rain" || weatherType === "Drizzle") {
        hRain = Math.round(40 + (Math.sin(i / 3) * 30) + (this.seededRandom(seed + i) * 20));
        hType = hRain > 30 ? "Rain" : "Clouds";
      } else if (weatherType === "Thunderstorm") {
        hRain = Math.round(60 + (Math.sin(i / 2) * 30));
        hType = hRain > 40 ? "Thunderstorm" : "Rain";
      } else if (weatherType === "Snow") {
        hRain = Math.round(30 + (Math.sin(i / 4) * 30));
        hType = hRain > 20 ? "Snow" : "Clouds";
      } else if (weatherType === "Clouds") {
        hRain = Math.round(this.seededRandom(seed + 15 + i) * 15);
        hType = hRain > 10 ? "Drizzle" : "Clouds";
      } else {
        hRain = Math.round(this.seededRandom(seed + 20 + i) * 5);
      }

      hourly.push({
        time: localHourStr,
        temp: hTemp,
        rain_chance: Math.max(0, Math.min(100, hRain)),
        weather_type: hType
      });
    }

    // Generate Daily Forecast (7 Days)
    const daily = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const dTime = new Date(now.getTime() + (i * 24 * 3600 * 1000));
      const dayName = i === 0 ? "Today" : weekdays[dTime.getDay()];
      const dateStr = dTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Daily weather shift simulation
      const daySeed = seed + 50 + i;
      const dRand = this.seededRandom(daySeed);
      let dType = "Clear";
      let dRain = 10;
      
      if (dRand < clearChance - 0.1) {
        dType = "Clear";
        dRain = Math.round(this.seededRandom(daySeed + 1) * 10);
      } else if (dRand < clearChance + rainChanceVal) {
        dType = this.seededRandom(daySeed + 2) > 0.8 ? "Thunderstorm" : "Rain";
        dRain = Math.round(50 + this.seededRandom(daySeed + 3) * 45);
      } else if (dRand < clearChance + rainChanceVal + snowChanceVal) {
        dType = "Snow";
        dRain = Math.round(40 + this.seededRandom(daySeed + 4) * 40);
      } else {
        dType = "Clouds";
        dRain = Math.round(15 + this.seededRandom(daySeed + 5) * 25);
      }

      const dTempOffset = (this.seededRandom(daySeed + 6) * 10) - 5; // -5 to +5 C
      const dMaxC = activeBaseTemp + dTempOffset + 5;
      const dMinC = activeBaseTemp + dTempOffset - 5;

      daily.push({
        dayName: dayName,
        date: dateStr,
        temp_min: Math.round(isImperial ? this.cToF(dMinC) : dMinC),
        temp_max: Math.round(isImperial ? this.cToF(dMaxC) : dMaxC),
        weather_type: dType,
        rain_chance: dRain,
        humidity: Math.round(humidityBase + (this.seededRandom(daySeed + 7) * 20 - 10))
      });
    }

    return {
      city: name,
      country: cityObj.country,
      lat: lat,
      lon: lon,
      timezone: timezone,
      current: {
        temp: currentTemp,
        temp_min: tempMin,
        temp_max: tempMax,
        feels_like: feelsLike,
        humidity: humidity,
        pressure: pressure,
        wind_speed: windSpeed,
        wind_deg: windDeg,
        uv_index: uvIndex,
        aqi: aqi,
        visibility: visibility,
        sunrise: sunrise,
        sunset: sunset,
        weather_type: weatherType,
        description: desc,
        alert: alert
      },
      hourly: hourly,
      daily: daily
    };
  }

  // Helper algorithms
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  cToF(c) {
    return (c * 9) / 5 + 32;
  }

  fToC(f) {
    return ((f - 32) * 5) / 9;
  }
}

// Export if module environment, else make it global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeatherAPI;
}
