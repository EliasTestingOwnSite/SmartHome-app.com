const cityInput = document.getElementById("city-input");
const addCityBtn = document.getElementById("add-city-btn");
const cityScroller = document.getElementById("city-scroller");
const radarFrame = document.getElementById("radar-frame");

const citiesRef = db.collection("weatherCities");

function describeWeather(code) {
  if (code === 0) return { category: "clear", icon: "☀️", text: "Clear sky" };
  if ([1, 2, 3].includes(code)) return { category: "cloudy", icon: "⛅", text: "Partly cloudy" };
  if ([45, 48].includes(code)) return { category: "cloudy", icon: "🌫️", text: "Fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { category: "rain", icon: "🌦️", text: "Drizzle" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { category: "rain", icon: "🌧️", text: "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { category: "snow", icon: "❄️", text: "Snow" };
  if ([95, 96, 99].includes(code)) return { category: "storm", icon: "⛈️", text: "Thunderstorm" };
  return { category: "cloudy", icon: "☁️", text: "Overcast" };
}

async function geocodeCity(name) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=de`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const result = data.results[0];
  const label = result.admin1
    ? `${result.name}, ${result.admin1}, ${result.country}`
    : `${result.name}, ${result.country}`;
  return { name: label, lat: result.latitude, lon: result.longitude };
}

// Full forecast: current conditions, today's high/low, and next 24h hourly data
async function getForecast(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&hourly=temperature_2m,precipitation_probability,weathercode` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`
  );
  return res.json();
}

function closestHourlyIndex(hourlyTimes, currentTimeStr) {
  const currentTime = new Date(currentTimeStr).getTime();
  let closestIdx = 0;
  let closestDiff = Infinity;
  hourlyTimes.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - currentTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  });
  return closestIdx;
}

function formatHour(isoTime) {
  const d = new Date(isoTime);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function moveRadarTo(lat, lon) {
  radarFrame.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&overlay=radar`;
}

async function renderCities() {
  const snapshot = await citiesRef.get();
  cityScroller.innerHTML = "";

  snapshot.forEach(async (doc) => {
    const city = doc.data();
    const data = await getForecast(city.lat, city.lon);
    const info = describeWeather(data.current_weather.weathercode);
    const nowIdx = closestHourlyIndex(data.hourly.time, data.current_weather.time);

    // Build next 12 hours strip starting from now
    let hourlyHtml = "";
    for (let i = nowIdx; i < Math.min(nowIdx + 12, data.hourly.time.length); i++) {
      const hInfo = describeWeather(data.hourly.weathercode[i]);
      hourlyHtml += `
        <div class="hour-block">
          <div class="hour-time">${i === nowIdx ? "Now" : formatHour(data.hourly.time[i])}</div>
          <div class="hour-icon">${hInfo.icon}</div>
          <div class="hour-temp">${Math.round(data.hourly.temperature_2m[i])}°</div>
          <div class="hour-rain">${data.hourly.precipitation_probability[i]}%</div>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = `city-page ${info.category}`;
    card.innerHTML = `
      <button class="remove-btn">✕</button>
      <div class="city-page-header">
        <div class="city-page-name">${city.name}</div>
        <div class="city-page-condition">${info.text}</div>
      </div>
      <div class="city-page-temp">${info.icon} ${Math.round(data.current_weather.temperature)}°C</div>
      <div class="city-page-hilo">H: ${Math.round(data.daily.temperature_2m_max[0])}° &nbsp; L: ${Math.round(data.daily.temperature_2m_min[0])}°</div>
      <div class="city-page-rain">🌧️ ${data.hourly.precipitation_probability[nowIdx]}% chance of rain right now</div>

      <div class="hourly-strip">${hourlyHtml}</div>

      <button class="radar-btn">Show on radar</button>
    `;

    card.querySelector(".radar-btn").addEventListener("click", () => moveRadarTo(city.lat, city.lon));
    card.querySelector(".remove-btn").addEventListener("click", () => {
      citiesRef.doc(doc.id).delete().then(renderCities);
    });

    cityScroller.appendChild(card);
  });
}

addCityBtn.addEventListener("click", async () => {
  const name = cityInput.value.trim();
  if (name === "") return;

  const location = await geocodeCity(name);
  if (!location) {
    alert("City not found, try a different spelling.");
    return;
  }

  await citiesRef.add(location);
  cityInput.value = "";
  renderCities();
});

renderCities();
