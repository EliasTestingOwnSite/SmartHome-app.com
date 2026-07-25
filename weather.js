const cityInput = document.getElementById("city-input");
const addCityBtn = document.getElementById("add-city-btn");
const cityList = document.getElementById("city-list");
const radarFrame = document.getElementById("radar-frame");

const citiesRef = db.collection("weatherCities");

// Maps Open-Meteo's weather codes to a category, icon, and readable text
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
  // Include country/region so it's clear exactly which place was matched
  const label = result.admin1
    ? `${result.name}, ${result.admin1}, ${result.country}`
    : `${result.name}, ${result.country}`;
  return { name: label, lat: result.latitude, lon: result.longitude };
}

// Current weather + rain chance for right now
async function getWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true&hourly=precipitation_probability&timezone=auto`
  );
  const data = await res.json();

  let rainChance = null;
  if (data.hourly && data.current_weather) {
    const currentTime = new Date(data.current_weather.time).getTime();
    let closestIdx = 0;
    let closestDiff = Infinity;
    data.hourly.time.forEach((t, i) => {
      const diff = Math.abs(new Date(t).getTime() - currentTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    });
    rainChance = data.hourly.precipitation_probability[closestIdx];
  }

  return {
    temperature: data.current_weather.temperature,
    weathercode: data.current_weather.weathercode,
    rainChance
  };
}

function moveRadarTo(lat, lon) {
  radarFrame.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&overlay=radar`;
}

async function renderCities() {
  const snapshot = await citiesRef.get();
  cityList.innerHTML = "";

  snapshot.forEach(async (doc) => {
    const city = doc.data();
    const weather = await getWeather(city.lat, city.lon);
    const info = describeWeather(weather.weathercode);

    const card = document.createElement("div");
    card.className = `city-card ${info.category}`;

    card.innerHTML = `
      <div class="city-name">${city.name}</div>
      <div class="temp">${info.icon} ${Math.round(weather.temperature)}°C</div>
      <div class="condition">${info.text}</div>
      <div class="rain-chance">🌧️ ${weather.rainChance !== null ? weather.rainChance + "% chance of rain" : "Rain data unavailable"}</div>
      <div class="card-actions">
        <button class="radar-btn">Show on radar</button>
        <button class="remove-btn">Remove</button>
      </div>
    `;

    card.querySelector(".radar-btn").addEventListener("click", () => moveRadarTo(city.lat, city.lon));
    card.querySelector(".remove-btn").addEventListener("click", () => {
      citiesRef.doc(doc.id).delete().then(renderCities);
    });

    cityList.appendChild(card);
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
