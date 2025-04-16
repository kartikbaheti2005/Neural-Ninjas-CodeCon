document.addEventListener("DOMContentLoaded", function() {
    const searchBtn = document.getElementById("search-btn");
    const searchInput = document.getElementById("location-search");
    const yearsSelect = document.getElementById("years");
    
    // Chart references
    const charts = {
        temperature: null,
        precipitation: null,
        humidity: null,
        wind: null
    };

    // Initialize with default location
    searchInput.value = "London";
    searchBtn.click();

    searchBtn.addEventListener("click", async function() {
        const location = searchInput.value.trim();
        const years = parseInt(yearsSelect.value);
        
        if (!location) {
            showError("Please enter a location");
            return;
        }

        try {
            showLoading(true);
            
            // Get coordinates
            const coords = await getCoordinates(location);
            if (!coords) {
                showError("Location not found. Try 'City, Country' format");
                return;
            }

            // Get historical data
            const weatherData = await getHistoricalWeather(coords.latitude, coords.longitude, years);
            
            // Render visualizations
            renderCharts(weatherData, coords.name || location, years);
            renderSummaryCards(weatherData);
            
        } catch (error) {
            showError("Failed to load data. Please try again.");
            console.error(error);
        } finally {
            showLoading(false);
        }
    });

    async function getCoordinates(location) {
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
            );
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) return null;
            
            return {
                latitude: data.results[0].latitude,
                longitude: data.results[0].longitude,
                name: data.results[0].name
            };
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    }

    async function getHistoricalWeather(lat, lon, years) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - years);
        
        const dateToString = (date) => date.toISOString().split('T')[0];
        
        const response = await fetch(
            `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
            `&start_date=${dateToString(startDate)}&end_date=${dateToString(endDate)}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max` +
            `&timezone=auto`
        );
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        return await response.json();
    }

    function renderCharts(weatherData, location, years) {
        const daily = weatherData.daily;
        const dates = daily.time.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        
        // Destroy existing charts
        Object.values(charts).forEach(chart => chart && chart.destroy());
        
        // Temperature Chart
        charts.temperature = new Chart(
            document.getElementById('temperatureChart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Max Temperature (°C)',
                            data: daily.temperature_2m_max,
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderWidth: 2,
                            tension: 0.1
                        },
                        {
                            label: 'Min Temperature (°C)',
                            data: daily.temperature_2m_min,
                            borderColor: 'rgba(54, 162, 235, 0.8)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderWidth: 2,
                            tension: 0.1
                        }
                    ]
                },
                options: getChartOptions(`Temperature in ${location} (${years} Year${years > 1 ? 's' : ''})`, '°C')
            }
        );
        
        // Precipitation Chart
        charts.precipitation = new Chart(
            document.getElementById('precipitationChart'),
            {
                type: 'bar',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Precipitation (mm)',
                        data: daily.precipitation_sum,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    }]
                },
                options: getChartOptions(`Precipitation in ${location} (${years} Year${years > 1 ? 's' : ''})`, 'mm')
            }
        );
        
        // Humidity Chart
        charts.humidity = new Chart(
            document.getElementById('humidityChart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Max Humidity (%)',
                        data: daily.relative_humidity_2m_max,
                        borderColor: 'rgba(153, 102, 255, 0.8)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        borderWidth: 2,
                        tension: 0.1
                    }]
                },
                options: getChartOptions(`Humidity in ${location} (${years} Year${years > 1 ? 's' : ''})`, '%')
            }
        );
        
        // Wind Chart
        charts.wind = new Chart(
            document.getElementById('windChart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Max Wind Speed (km/h)',
                        data: daily.wind_speed_10m_max,
                        borderColor: 'rgba(255, 159, 64, 0.8)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderWidth: 2,
                        tension: 0.1
                    }]
                },
                options: getChartOptions(`Wind Speed in ${location} (${years} Year${years > 1 ? 's' : ''})`, 'km/h')
            }
        );
    }

    function getChartOptions(title, unit) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.raw} ${unit}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: unit
                    }
                }
            }
        };
    }

    function renderSummaryCards(weatherData) {
        const daily = weatherData.daily;
        const container = document.getElementById('summary-cards');
        
        const stats = {
            tempMax: calculateStats(daily.temperature_2m_max, '°C'),
            tempMin: calculateStats(daily.temperature_2m_min, '°C'),
            precipitation: calculateStats(daily.precipitation_sum, 'mm'),
            humidity: calculateStats(daily.relative_humidity_2m_max, '%'),
            wind: calculateStats(daily.wind_speed_10m_max, 'km/h')
        };
        
        container.innerHTML = `
            <div class="summary-card">
                <h3>Max Temperature</h3>
                <p>Average: <strong>${stats.tempMax.avg}</strong></p>
                <p>Highest: <strong>${stats.tempMax.max}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Min Temperature</h3>
                <p>Average: <strong>${stats.tempMin.avg}</strong></p>
                <p>Lowest: <strong>${stats.tempMin.min}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Precipitation</h3>
                <p>Average: <strong>${stats.precipitation.avg}</strong></p>
                <p>Total: <strong>${stats.precipitation.total}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Humidity</h3>
                <p>Average: <strong>${stats.humidity.avg}</strong></p>
                <p>Peak: <strong>${stats.humidity.max}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Wind Speed</h3>
                <p>Average: <strong>${stats.wind.avg}</strong></p>
                <p>Max: <strong>${stats.wind.max}</strong></p>
            </div>
        `;
    }

    function calculateStats(data, unit) {
        const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
        const max = Math.max(...data).toFixed(1);
        const min = Math.min(...data).toFixed(1);
        const total = unit === 'mm' ? data.reduce((a, b) => a + b, 0).toFixed(1) : null;
        
        return {
            avg: `${avg} ${unit}`,
            max: `${max} ${unit}`,
            min: `${min} ${unit}`,
            total: total ? `${total} ${unit}` : null
        };
    }

    function showError(message) {
        document.getElementById("search-error").textContent = message;
    }

    function showLoading(loading) {
        const btn = document.getElementById("search-btn");
        btn.disabled = loading;
        btn.textContent = loading ? "Loading..." : "Search";
    }
});