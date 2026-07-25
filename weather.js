const cityInput = document.getElementById("city-input");
const addCityBtn = document.getElementById("add-city-btn");
const cityList = document.getElementById("city-list");
const radarFrame = document.getElementById("radar-frame");

const citiesRef = db.collection("weatherCities");

// Look up a city name -> lat/lon using Open-Meteo's free geocoding API
async function geocodeCity(name) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const result = data.results[0];
  return { name: result.name, lat: result.latitude, lon: result.longitude };
}

// Get current weather for a lat/lon using Open-Meteo's free forecast API
async function getWeather(lat, lon) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
  const data = await res.json();
  return data.current_weather;
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

    const card = document.createElement("div");
    card.style.display = "flex";
    card.style.justifyContent = "space-between";
    card.style.padding = "0.5rem";
    card.style.borderBottom = "1px solid #333";

    const info = document.createElement("span");
    info.textContent = weather
      ? `${city.name}: ${weather.temperature}°C`
      : `${city.name}: loading...`;

    const showBtn = document.createElement("button");
    showBtn.textContent = "Show on radar";
    showBtn.addEventListener("click", () => moveRadarTo(city.lat, city.lon));

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => {
      citiesRef.doc(doc.id).delete().then(renderCities);
    });

    card.appendChild(info);
    card.appendChild(showBtn);
    card.appendChild(removeBtn);
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
