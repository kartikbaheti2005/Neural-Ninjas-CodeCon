const map = L.map('map').setView([20, 0], 2);

// 📜 Base Layer: OpenStreetMap
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 18,
});

// 🛰️ Satellite imagery (no labels)
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  }
);

// 📜 Labels (names and boundaries)
const labels = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Labels © Esri',
    maxZoom: 18,
  }
);

// 🛰️ NASA GIBS Layer (existing one)
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

// 🧭 Add the base layers to the map and set the initial view
osm.addTo(map);  // Default base layer
nasaLayer.addTo(map); // Optional if you still want NASA layers

// 📍 Layer control for toggling between map layers
L.control.layers({
  "OpenStreetMap": osm,
  "Satellite": L.layerGroup([satellite, labels]),
}).addTo(map);

// 📍 Hover Info Box
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

// 🧭 Mouse move event to update info box
map.on('mousemove', function (e) {
  info.update({ lat: e.latlng.lat, lng: e.latlng.lng });
});

// 🖱️ Click event to get place name and weather
map.on('click', function (e) {
  const lat = e.latlng.lat.toFixed(2);
  const lng = e.latlng.lng.toFixed(2);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const locationName = data.address.city || data.address.town || data.address.village || data.display_name || `Lat: ${lat}, Lng: ${lng}`;
      displayWeather(lat, lng, locationName);
    })
    .catch(err => {
      console.error("Error fetching location name:", err);
      displayWeather(lat, lng, `Lat: ${lat}, Lng: ${lng}`);
    });
});

// 🔍 Search logic
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
      map.setView([lat, lon], 8);  // Zoom to location
      displayWeather(lat, lon, display_name);
    })
    .catch(err => {
      errorBox.textContent = "Error searching location.";
      console.error(err);
    });
}

// Fetch and display weather data
function displayWeather(lat, lon, locationName) {
  const apiKey = 'c6b1ce204c3aaeadd0c76b7eb4d06544';  // Your API key
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  fetch(weatherUrl)
    .then(response => response.json())
    .then(data => {
      const { main, weather, wind, clouds, visibility, sys } = data;
      const resultPanel = document.getElementById("search-result");
      resultPanel.innerHTML = `
        <h3>📍 ${locationName}</h3>
        <p><b>🌡️ Temperature:</b> ${main.temp}°C</p>
        <p><b>🌤️ Weather:</b> ${weather[0].main} - ${weather[0].description}</p>
        <p><b>💨 Wind:</b> ${wind.speed} m/s</p>
        <p><b>🌫️ Visibility:</b> ${visibility} meters</p>
        <p><b>☁️ Cloudiness:</b> ${clouds.all}%</p>
        <p><b>💧 Humidity:</b> ${main.humidity}%</p>
        <p><b>📅 Sunrise:</b> ${new Date(sys.sunrise * 1000).toLocaleTimeString()}</p>
        <p><b>🌇 Sunset:</b> ${new Date(sys.sunset * 1000).toLocaleTimeString()}</p>
      `;
    })
    .catch(err => {
      console.error("Error fetching weather data:", err);
      const resultPanel = document.getElementById("search-result");
      resultPanel.innerHTML = "<p>❌ Failed to load weather data.</p>";
    });
}

document.getElementById('search-btn').addEventListener('click', searchLocation);
