(function() {
  // Helper: leer parámetro URL
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Helper: actualizar panel
  function showPanel(id, html) {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.style.display = 'block';
  }

  const amarreId = getParam('amarre');
  if (!amarreId) {
    alert('Falta parámetro ?amarre=');
    throw 'Parámetro amarre faltante';
  }

  // Cargar datos
  fetch('data/amarres.json')
    .then(res => res.json())
    .then(data => {
      const entry = data[amarreId];
      if (!entry) throw 'ID de amarre no válido';

      const oficinaCoords = [40.41478, 0.43311];
      const amarreCoords  = [entry.lat, entry.lng];
      const ruta          = entry.route;
      const steps         = entry.steps;

      // Inicializar Leaflet
      const map = L.map('map').setView(oficinaCoords, 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Marcadores fijos
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      });
      L.marker(oficinaCoords, {icon:redIcon}).addTo(map).bindPopup('Oficina');
      L.marker(amarreCoords).addTo(map).bindPopup(`Amarre ${amarreId}`);

      // Dibujar ruta marítima
      L.polyline(ruta, {color:'blue', weight:4, opacity:0.8}).addTo(map);

      // Preparar marcador del usuario
      const userMarker = L.marker(oficinaCoords).addTo(map);

      // Función para elegir el step más cercano
      function nearestStepIndex(pos) {
        let best = 0, minD = Infinity;
        steps.forEach((s,i) => {
          const d = map.distance(pos, [s.lat,s.lng]);
          if (d < minD) { minD = d; best = i; }
        });
        return best;
      }

      // Iniciar watchPosition
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];

          // Mover marcador del usuario
          userMarker.setLatLng(userPos).bindPopup('Estás aquí').openPopup();

          // Actualizar instrucciones
          const idx = nearestStepIndex(userPos);
          const step = steps[idx];
          showPanel('nav-panel', `
            <div class="distance">${step.distance}</div>
            <div class="instruction">${step.instruction}</div>
            ${step.sub ? `<div class="sub">${step.sub}</div>` : ''}
          `);

          // Mostrar footer con distancia restante al amarre
          const rem = Math.round(map.distance(userPos, amarreCoords)) + ' m';
          showPanel('footer-panel', `
            <div class="footer-distance">${rem}</div>
            <div class="footer-text">Marina Benicarló</div>
          `);

          // Ajustar bounds (opcional: solo primeras veces o si sale del viewport)
          const bounds = L.latLngBounds([userPos, amarreCoords]);
          map.fitBounds(bounds, { padding: [50,50] });

        }, err => console.warn('watchPosition error', err), {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000
        });
      } else {
        alert('Tu navegador no soporta geolocalización.');
      }
    })
    .catch(e => console.error(e));
})();
