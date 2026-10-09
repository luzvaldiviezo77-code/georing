/**
 * GEORING EVAC v5.0 ULTRA - TACTICAL ENGINE
 * FIGAE - Universidad Nacional Federico Villarreal
 */

// ===================================================
// 1. SÍNTESIS DE AUDIO Y SONIDOS
// ===================================================
class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 880, type = 'sine', duration = 0.1) {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playAlarmSiren() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  speak(text) {
    if (this.muted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }
}

const audioEngine = new TacticalAudioEngine();

document.getElementById('btn-audio-toggle').addEventListener('click', () => {
  audioEngine.muted = !audioEngine.muted;
  const btn = document.getElementById('btn-audio-toggle');
  if (audioEngine.muted) {
    btn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> AUDIO OFF`;
    btn.classList.add('btn-danger');
  } else {
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> AUDIO ON`;
    btn.classList.remove('btn-danger');
    audioEngine.playBeep(1200, 'sine', 0.1);
  }
});

// ===================================================
// 2. COMPUERTAS Y APERTURA DE PANTALLA
// ===================================================
window.addEventListener('DOMContentLoaded', () => {
  const progressBar = document.getElementById('splash-bar');
  const statusText = document.getElementById('splash-status');
  const splashContainer = document.getElementById('intro-splash');

  const steps = [
    { percent: 20, text: "CARGANDO MOTOR GEOFÍSICO..." },
    { percent: 50, text: "VERIFICANDO SERVIDORES UNFV..." },
    { percent: 80, text: "CALIBRANDO SENSORES SÍSMICOS..." },
    { percent: 100, text: "¡SISTEMA LISTO! CORE OPERATIVO." }
  ];

  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      progressBar.style.width = `${steps[currentStep].percent}%`;
      statusText.textContent = steps[currentStep].text;
      audioEngine.playBeep(600 + (currentStep * 150), 'sine', 0.05);
      currentStep++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        audioEngine.speak("GeoRing EVAC activado. Listo para operacion táctica.");
        splashContainer.classList.add('open');
        setTimeout(() => {
          splashContainer.classList.add('finished');
          // CORRECCIÓN CLAVE PARA CELULARES: Forzar al mapa a redibujarse y cargar tiles
          map.invalidateSize();
        }, 1300);
      }, 300);
    }
  }, 300);
});

// ===================================================
// 3. MAPA Y CAPAS
// ===================================================
const defaultCoords = [-12.046374, -77.042793]; 
const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(defaultCoords, 14);
L.control.zoom({ position: 'bottomleft' }).addTo(map);

const tileLayers = {
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
  sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }),
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 })
};
tileLayers.street.addTo(map);

let userMarker = null;
let bufferCircle = null;
let floodPolygon = null;
let nearestRefugeLine = null;
let isReportingObstacle = false;

const poiGroup = L.layerGroup().addTo(map);
const obstacleGroup = L.layerGroup().addTo(map);

// ===================================================
// 4. SISMÓGRAFO DUAL EN TIEMPO REAL
// ===================================================
const seismoCanvas = document.getElementById('seismo-canvas');
const sCtx = seismoCanvas ? seismoCanvas.getContext('2d') : null;
let seismoData = new Array(120).fill(27);
window.isEarthquakeActive = false;
let currentMagnitude = 0.2;

function renderSeismograph() {
  if (!sCtx) return;
  sCtx.clearRect(0, 0, seismoCanvas.width, seismoCanvas.height);

  sCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  sCtx.lineWidth = 1;
  sCtx.beginPath();
  sCtx.moveTo(0, 27); sCtx.lineTo(300, 27);
  sCtx.stroke();

  seismoData.shift();
  const amp = window.isEarthquakeActive ? currentMagnitude * 5 : 1.2;
  const noise = (Math.random() - 0.5) * amp * 6;
  seismoData.push(27 + noise);

  sCtx.strokeStyle = window.isEarthquakeActive ? '#ef4444' : '#10b981';
  sCtx.lineWidth = window.isEarthquakeActive ? 2.0 : 1.5;
  sCtx.beginPath();
  for (let i = 0; i < seismoData.length; i++) {
    const x = (i / seismoData.length) * seismoCanvas.width;
    const y = seismoData[i];
    if (i === 0) sCtx.moveTo(x, y);
    else sCtx.lineTo(x, y);
  }
  sCtx.stroke();

  requestAnimationFrame(renderSeismograph);
}
renderSeismograph();

// ===================================================
// 5. GPS, CÁLCULOS Y EVENTOS DE MAPA
// ===================================================
const btnGps = document.getElementById('btn-gps');
btnGps.addEventListener('click', () => {
  if (!navigator.geolocation) return alert("Geolocalización no disponible.");
  btnGps.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo...`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      map.flyTo(coords, 16, { duration: 1.5 });
      updateUserPosition(coords);
      fetchFullTelemetry(coords[0], coords[1]);
      btnGps.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> FIX GPS`;
      audioEngine.speak("Posición de comando establecida.");
    },
    () => { btnGps.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> FIX GPS`; },
    { enableHighAccuracy: true }
  );
});

function updateUserPosition(latLng) {
  if (userMarker) map.removeLayer(userMarker);

  const customIcon = L.divIcon({
    className: 'tactical-user-marker',
    html: `<div style="position:relative; width:28px; height:28px;"><div style="position:absolute; width:100%; height:100%; border-radius:50%; background:#10b981; opacity:0.8; animation: pulseRing 1.3s infinite;"></div><div style="position:absolute; width:16px; height:16px; top:6px; left:6px; border-radius:50%; background:#047857; border:2px solid #fff; box-shadow:0 0 15px #10b981;"></div></div><style>@keyframes pulseRing { 0% { transform: scale(0.8); opacity:0.9; } 100% { transform: scale(3.2); opacity:0; } }</style>`,
    iconSize: [28, 28], iconAnchor: [14, 14]
  });

  userMarker = L.marker(latLng, { icon: customIcon }).addTo(map);
  userMarker.bindPopup("<b>📍 PUESTO DE EVACUACIÓN / OPERADOR</b>").openPopup();

  const radius = parseInt(document.getElementById('buffer-range').value);
  drawBufferArea(latLng, radius);
  calculateEvacuationTime(radius);
}

function drawBufferArea(latLng, radius) {
  if (bufferCircle) map.removeLayer(bufferCircle);
  bufferCircle = L.circle(latLng, {
    color: '#10b981', fillColor: '#10b981', fillOpacity: 0.12, weight: 1.5, dashArray: '6, 6', radius: radius
  }).addTo(map);
}

function calculateEvacuationTime(distanceMeters) {
  const walkingSpeedMps = 1.1; 
  const timeMinutes = ((distanceMeters / walkingSpeedMps) / 60).toFixed(1);
  document.getElementById('val-tiempo-evac').textContent = `${timeMinutes} min`;
  return timeMinutes;
}

// Clic en Mapa (Navegación u Obstáculo)
map.on('click', (e) => {
  if (isReportingObstacle) {
    const obsIcon = L.divIcon({
      html: `<div style="background:#ef4444; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 15px #ef4444; font-size:12px;"><i class="fa-solid fa-triangle-exclamation"></i></div>`
    });
    
    L.marker(e.latlng, { icon: obsIcon }).bindPopup("<b>⚠️ OBSTÁCULO / DERRUMBE REPORTADO</b><br>Zona no transitable").addTo(obstacleGroup);
    L.circle(e.latlng, { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, radius: 120 }).addTo(obstacleGroup);

    isReportingObstacle = false;
    document.getElementById('map-instruction-banner').classList.add('hidden');
    audioEngine.speak("Obstáculo fijado en el mapa. Recalculando vía segura.");
    addAiMessage("⚠️ **Obstáculo detectado.** Se ha marcado la zona intransitable en la red de evacuación.");
    return;
  }

  audioEngine.playBeep(900, 'sine', 0.05);
  const coords = [e.latlng.lat, e.latlng.lng];
  updateUserPosition(coords);
  fetchFullTelemetry(coords[0], coords[1]);
});

document.getElementById('btn-reportar-incidente').addEventListener('click', () => {
  isReportingObstacle = true;
  document.getElementById('map-instruction-banner').classList.remove('hidden');
  audioEngine.speak("Seleccione en el mapa la ubicación del bloqueo.");
});

async function fetchFullTelemetry(lat, lng) {
  document.getElementById('val-coordenadas').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data.address) {
      document.getElementById('val-distrito').textContent = data.address.suburb || data.address.district || "Sector Central";
      document.getElementById('val-provincia').textContent = data.address.city || "Lima";
    }
  } catch (e) {}

  try {
    const meteo = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
    const mData = await meteo.json();
    const altitud = mData.elevation ? Math.round(mData.elevation) : 18;
    document.getElementById('val-altitud').textContent = `${altitud} m.s.n.m.`;

    if (mData.current_weather) {
      document.getElementById('sensor-wind').textContent = `${mData.current_weather.windspeed} km/h`;
      document.getElementById('sensor-temp').textContent = `${mData.current_weather.temperature} °C`;
    }

    const badge = document.getElementById('risk-badge');
    const fill = document.getElementById('risk-bar-fill');
    if (altitud <= 15) {
      badge.className = 'badge-status red';
      badge.textContent = `¡ALTO RIESGO TSUNAMI!`;
      fill.style.width = `85%`;
      fill.style.background = '#ef4444';
    } else {
      badge.className = 'badge-status green';
      badge.textContent = `COTA SEGURA`;
      fill.style.width = `25%`;
      fill.style.background = '#10b981';
    }
  } catch (e) {}
}

// ===================================================
// 6. GENERACIÓN PDF Y GEOJSON REPARADOS
// ===================================================
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(56, 189, 248);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GEORING EVAC v5.0 - INFORME TÁCTICO", 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("FACULTAD DE INGENIERÍA GEOGRÁFICA, AMBIENTAL Y ECOTURISMO - UNFV", 14, 26);
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleString()}`, 14, 31);

    doc.setDrawColor(51, 65, 85);
    doc.line(14, 35, 196, 35);

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(11);
    doc.text("1. DATOS DE TELEMETRÍA Y GEOLOCALIZACIÓN", 14, 45);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Coordenadas: ${document.getElementById('val-coordenadas').textContent}`, 18, 53);
    doc.text(`Altitud de Cota: ${document.getElementById('val-altitud').textContent}`, 18, 60);
    doc.text(`Distrito / Provincia: ${document.getElementById('val-distrito').textContent} / ${document.getElementById('val-provincia').textContent}`, 18, 67);

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(11);
    doc.text("2. EVALUACIÓN DE RIESGO Y ACELERACIÓN DE SUELO", 14, 80);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Aceleración del Suelo (PGA): ${document.getElementById('val-pga').textContent}`, 18, 88);
    doc.text(`Tiempo Est. de Evacuación: ${document.getElementById('val-tiempo-evac').textContent}`, 18, 95);
    doc.text(`Estado de Riesgo: ${document.getElementById('risk-badge').textContent}`, 18, 102);

    doc.save(`GeoRing_Informe_${Date.now()}.pdf`);
    audioEngine.speak("Informe táctico descargado exitosamente.");
    addAiMessage("📄 **Informe PDF Generado:** Se ha descargado la evaluación oficial del sector.");
  } catch(err) {
    alert("Error al generar PDF: " + err.message);
  }
});

document.getElementById('btn-export-geojson').addEventListener('click', () => {
  if (!userMarker) return alert("Fije su posición en el mapa primero.");
  const pos = userMarker.getLatLng();

  const geojson = {
    "type": "FeatureCollection",
    "metadata": { "system": "GEORING EVAC v5.0", "timestamp": new Date().toISOString() },
    "features": [{
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [pos.lng, pos.lat] },
      "properties": { "pga": document.getElementById('val-pga').textContent }
    }]
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `GeoRing_Layer_${Date.now()}.geojson`;
  a.click();
});

// ===================================================
// 7. IA ASSIST CHAT INTERACTIVO MEJORADO
// ===================================================
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

function addAiMessage(text, isUser = false) {
  const div = document.createElement('div');
  div.className = isUser ? 'ai-msg user' : 'ai-msg bot';
  
  const icon = isUser ? 'fa-user' : 'fa-brain';
  div.innerHTML = `
    <div class="avatar"><i class="fa-solid ${icon}"></i></div>
    <div class="bubble">${text}</div>
  `;
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function processAiResponse(query) {
  const q = query.toLowerCase();
  audioEngine.playBeep(1100, 'sine', 0.05);

  setTimeout(() => {
    if (q.includes('ruta') || q.includes('refugio')) {
      togglePOICategory('refugio');
      addAiMessage("🧭 **Ruta Calculada:** Trazando la vía más corta hacia el refugio seguro más cercano.");
    } else if (q.includes('riesgo') || q.includes('cota')) {
      const alt = document.getElementById('val-altitud').textContent;
      addAiMessage(`🛡️ **Análisis de Cota:** Su posición actual está a **${alt}**. Cota segura recomendada: +20m.`);
    } else if (q.includes('sismo') || q.includes('simular')) {
      triggerEarthquakeSimulation(8.5);
      addAiMessage("🚨 **Simulacro Activado:** Ejecutando simulación de sismo Magnitud 8.5 Mw.");
    } else {
      addAiMessage("Comando procesado. Puede pulsar las acciones rápidas o consultar sobre **Ruta**, **Riesgo** o **Simulación**.");
    }
  }, 300);
}

function sendQuickAiCmd(cmdText) {
  addAiMessage(cmdText, true);
  processAiResponse(cmdText);
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const txt = chatInput.value.trim();
  if (!txt) return;

  addAiMessage(txt, true);
  chatInput.value = '';
  processAiResponse(txt);
});

function togglePOICategory(type) {
  if (!userMarker) return alert("Fije su posición en el mapa.");
  const pos = userMarker.getLatLng();
  poiGroup.clearLayers();

  const colors = { salud: '#ef4444', seguridad: '#eab308', refugio: '#3b82f6', agua: '#06b6d4' };
  const icons = { salud: 'fa-hospital', seguridad: 'fa-shield-cat', refugio: 'fa-campground', agua: 'fa-faucet-drip' };

  let closestDist = 999999;
  let closestLatLng = null;

  for (let i = 1; i <= 3; i++) {
    const pLat = pos.lat + (Math.random() - 0.5) * 0.01;
    const pLng = pos.lng + (Math.random() - 0.5) * 0.01;
    const target = L.latLng(pLat, pLng);
    const dist = pos.distanceTo(target);

    if (dist < closestDist) {
      closestDist = dist;
      closestLatLng = target;
    }

    const icon = L.divIcon({
      html: `<div style="background:${colors[type]}; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 10px ${colors[type]}; font-size:12px;"><i class="fa-solid ${icons[type]}"></i></div>`
    });

    L.marker([pLat, pLng], { icon: icon }).bindPopup(`<b>Estación ${type.toUpperCase()}</b><br>Distancia: ${Math.round(dist)}m`).addTo(poiGroup);
  }

  if (closestLatLng) {
    if (nearestRefugeLine) map.removeLayer(nearestRefugeLine);
    nearestRefugeLine = L.polyline([pos, closestLatLng], { color: '#3b82f6', weight: 3, dashArray: '6, 6' }).addTo(map);
    calculateEvacuationTime(closestDist);
  }
}

function triggerEarthquakeSimulation(magnitude = 8.5) {
  window.isEarthquakeActive = true;
  currentMagnitude = magnitude;
  audioEngine.playAlarmSiren();

  const mapDiv = document.getElementById('map');
  let count = 0;
  const interval = setInterval(() => {
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 20;
    mapDiv.style.transform = `translate(${x}px, ${y}px)`;
    count++;
    if (count > 40) {
      clearInterval(interval);
      mapDiv.style.transform = `translate(0px, 0px)`;
      window.isEarthquakeActive = false;
    }
  }, 40);

  document.getElementById('val-pga').textContent = `420.5 Gal`;
  document.getElementById('sensor-seismic').textContent = `${magnitude} Mw (CRÍTICO)`;
  document.getElementById('sensor-seismic').style.color = "#ef4444";
}

document.getElementById('btn-sos').addEventListener('click', () => triggerEarthquakeSimulation(8.5));
document.getElementById('btn-sim-tsunami').addEventListener('click', () => {
  if (!userMarker) return alert("Fije su posición en el mapa.");
  const height = parseInt(document.getElementById('tsunami-range').value);

  if (floodPolygon) map.removeLayer(floodPolygon);
  const pos = userMarker.getLatLng();
  const points = [];
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const dist = (Math.random() * 0.003 + 0.005);
    points.push([pos.lat + Math.sin(rad) * dist, pos.lng + Math.cos(rad) * dist]);
  }

  floodPolygon = L.polygon(points, { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.4 }).addTo(map);
  audioEngine.speak(`Inundación simulada para cota de ${height} metros.`);
});

document.getElementById('btn-clear-map').addEventListener('click', () => {
  poiGroup.clearLayers();
  obstacleGroup.clearLayers();
  if (floodPolygon) map.removeLayer(floodPolygon);
  if (nearestRefugeLine) map.removeLayer(nearestRefugeLine);
  audioEngine.playBeep(500, 'sine', 0.1);
});

document.querySelectorAll('.layer-thumb').forEach(thumb => {
  thumb.addEventListener('click', () => {
    document.querySelectorAll('.layer-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const selected = thumb.getAttribute('data-layer');
    Object.values(tileLayers).forEach(l => map.removeLayer(l));
    if (tileLayers[selected]) tileLayers[selected].addTo(map);
  });
});