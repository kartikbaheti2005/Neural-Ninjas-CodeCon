// 🌍 Planetary Dashboard Data Integration
const map = L.map('map').setView([20, 0], 2);

// 🗺️ Base Layer: OpenStreetMap
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 18,
});
osm.addTo(map);

// 🌐 Satellite Layer
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  }
);

// 🏷️ Labels
const labels = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Labels © Esri',
    maxZoom: 18,
  }
);

// 🛰️ NASA GIBS Layer
const nasaLayer = L.tileLayer(
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MOD_LSTD_CLIM_M/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
  {
    attribution: 'NASA GIBS',
    maxZoom: 9,
    opacity: 0.7,
    tileSize: 256,
    noWrap: true,
  }
);
nasaLayer.addTo(map);

L.control.layers({
  "OpenStreetMap": osm,
  "Satellite": L.layerGroup([satellite, labels]),
}).addTo(map);

// 📌 Coordinate Info Panel
const info = L.control();
info.onAdd = function () {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};
info.update = function (props) {
  this._div.innerHTML = `
    <h4>Planet Data</h4>
    <b>Hover over map</b><br/>
    ${props ? `<b>Lat:</b> ${props.lat.toFixed(2)}<br><b>Lon:</b> ${props.lng.toFixed(2)}` : ''}
  `;
};
info.addTo(map);

map.on('mousemove', function (e) {
  info.update({ lat: e.latlng.lat, lng: e.latlng.lng });
});

map.on('click', function (e) {
  const lat = e.latlng.lat.toFixed(2);
  const lng = e.latlng.lng.toFixed(2);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const locationName = data.address.city || data.address.town || data.address.village || data.display_name || `Lat: ${lat}, Lng: ${lng}`;
      displayEnvironmentData(lat, lng, locationName);
    })
    .catch(err => {
      console.error("Error fetching location name:", err);
      displayEnvironmentData(lat, lng, `Lat: ${lat}, Lng: ${lng}`);
    });
});

function searchLocation() {
  const location = document.getElementById('location-search').value;
  const errorBox = document.getElementById('search-error');
  errorBox.textContent = "";

  if (!location) {
    errorBox.textContent = "Please enter a location name.";
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) {
        errorBox.textContent = "Location not found.";
        return;
      }
      const { lat, lon, display_name } = data[0];
      map.setView([lat, lon], 8);
      displayEnvironmentData(lat, lon, display_name);
    })
    .catch(err => {
      errorBox.textContent = "Error searching location.";
      console.error(err);
    });
}

async function displayEnvironmentData(lat, lon, locationName) {
  const resultPanel = document.getElementById("search-result");
  const apiKey = 'c6b1ce204c3aaeadd0c76b7eb4d06544';
  const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const carbonURL = `https://www.climatewatchdata.org/api/v1/data/historical_emissions?country=IND&gas=CO2&source=CAIT&sector=Total%20including%20LUCF`;
  const airURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  try {
    const [weatherRes, carbonRes, airRes] = await Promise.all([
      fetch(weatherURL),
      fetch(carbonURL),
      fetch(airURL)
    ]);

    const weatherData = await weatherRes.json();
    const carbonData = await carbonRes.json();
    const airData = await airRes.json();

    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const co2Emission = carbonData.data && carbonData.data.length > 0 ? carbonData.data[0].emissions.slice(-1)[0].value : 'N/A';

    const aqiValue = airData.list[0].main.aqi;
    const aqiText = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqiValue - 1] || 'N/A';

    resultPanel.innerHTML = `
      <h3>📍 ${locationName}</h3>
      <p><b>🌡️ Temperature:</b> ${temp} °C</p>
      <p><b>💧 Humidity:</b> ${humidity}%</p>
      <p><b>🔥 Carbon Emissions (India):</b> ${co2Emission} Mt</p>
      <p><b>💨 Air Quality Index (AQI):</b> ${aqiText} (${aqiValue})</p>
    `;
  } catch (err) {
    console.error("Error fetching environment data:", err);
    resultPanel.innerHTML = `<p>⚠️ Error loading environment data.</p>`;
  }
}

document.getElementById('search-btn').addEventListener('click', searchLocation);
document.getElementById('toggle-btn').addEventListener('click', function () {
  document.querySelector('.nav-links').classList.toggle('active');
});
