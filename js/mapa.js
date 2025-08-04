(function() {
  // Leer parámetro de URL
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Mostrar panel
  function showPanel(id, html) {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.style.display = 'block';
  }

  const amarreId = getParam('amarre');
  if (!amarreId) {
    alert('Falta parámetro ?amarre=');
    throw new Error('Parámetro amarre faltante');
  }

  // Cargar datos de amarres
  fetch('data/amarres.json')
    .then(res => res.json())
    .then(data => {
      const entry = data[amarreId];
      if (!entry) throw new Error('ID de amarre no válido');

      const oficinaCoords = [40.41478, 0.43311];
      const amarreCoords  = [entry.lat, entry.lng];
      const ruta          = entry.route;
      const steps         = entry.steps;

      // El punto de entrada es el primer punto de la ruta
      const entryCoords = ruta[0];

      // Iniciar mapa
      const map = L.map('map').setView(oficinaCoords, 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Icono rojo para la oficina
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      });

      // Marcadores fijos
      L.marker(oficinaCoords, { icon: redIcon }).addTo(map)
        .bindPopup('Oficina del puerto');
      L.marker(entryCoords).addTo(map)
        .bindPopup('Entrada del puerto');
      L.marker(amarreCoords).addTo(map)
        .bindPopup(`Amarre ${amarreId}`);

      // Dibujar ruta marítima
      L.polyline(ruta, { color: 'blue', weight: 4, opacity: 0.8 }).addTo(map);

      // Marcador de usuario
      const userMarker = L.marker(oficinaCoords).addTo(map);

      // Función para paso más cercano
      function nearestStepIndex(pos) {
        let best = 0, minD = Infinity;
        steps.forEach((s,i) => {
          const d = map.distance(pos, [s.lat, s.lng]);
          if (d < minD) { minD = d; best = i; }
        });
        return best;
      }

      // Usar watch para ubicar en tiempo real
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];

          // Mover y mostrar marcador usuario
          userMarker.setLatLng(userPos).bindPopup('Estás aquí').openPopup();

          // Dibujar conexión al punto de entrada
          L.polyline([userPos, entryCoords], {
            color: 'gray', weight: 2, dashArray: '4,6', opacity: 0.6
          }).addTo(map);

          // Actualizar panel superior con paso actual
          const idx = nearestStepIndex(userPos);
          const step = steps[idx];
          showPanel('nav-panel', `
            <div class="distance">${step.distance}</div>
            <div class="instruction">${step.instruction}</div>
            ${step.sub ? `<div class="sub">${step.sub}</div>` : ''}
          `);

          // Panel inferior con distancia restante al amarre
          const rem = Math.round(map.distance(userPos, amarreCoords)) + ' m';
          showPanel('footer-panel', `
            <div class="footer-distance">${rem}</div>
            <div class="footer-text">Marina Benicarló</div>
          `);

          // Ajustar vista para incluir usuario y amarre
          const bounds = L.latLngBounds([userPos, entryCoords]);
          map.fitBounds(bounds, { padding: [50,50] });
        }, err => console.warn(err), {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000
        });
      }
    })
    .catch(e => console.error(e));
})();
