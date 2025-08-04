function() {
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
      const entry       = data[amarreId];
      const oficinaCoords= [40.41478, 0.43311];
      const amarreCoords = [entry.lat, entry.lng];
      const ruta         = entry.route;  // Array de coordenadas del recorrido completo
      const steps        = entry.steps;  // Array con puntos de maniobra e indicaciones

      // Punto de entrada: el primer punto de la ruta
      const entryCoords = ruta[0];

      // Inicializar mapa
      const map = L.map('map').setView(oficinaCoords, 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Icono de embarcación para el usuario
      const boatIcon = new L.Icon({
        iconUrl: 'https://img.icons8.com/fluency/48/000000/boat.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      // Marcadores fijos
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      });
      L.marker(oficinaCoords, { icon: redIcon }).addTo(map).bindPopup('Oficina');
      L.marker(entryCoords).addTo(map).bindPopup('Entrada del puerto');
      L.marker(amarreCoords).addTo(map).bindPopup(`Amarre ${amarreId}`);

      // Dibujar ruta completa al principio
      let routeLine = L.polyline(ruta, { color: 'blue', weight: 4, opacity: 0.8 }).addTo(map);

      // Marcador del usuario con icono de barco
      const userMarker = L.marker(oficinaCoords, { icon: boatIcon }).addTo(map);

      // Función para encontrar índice más cercano en array de coordenadas
      function nearestIndex(pos, coordsArray) {
        let best = 0, minD = Infinity;
        coordsArray.forEach((c,i) => {
          const d = map.distance(pos, c);
          if (d < minD) { minD = d; best = i; }
        });
        return best;
      }

      // Vigilancia de geolocalización en tiempo real
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];

          // Mover marcador del usuario
          userMarker.setLatLng(userPos).bindPopup('Estás aquí').openPopup();

          // Actualizar ruta restante: recortar ruta completa
          const idxRoute = nearestIndex(userPos, ruta);
          const remaining = ruta.slice(idxRoute);
          routeLine.setLatLngs(remaining);

          // Dibujar línea punteada al punto de entrada
          L.polyline([userPos, entryCoords], {
            color: 'gray', weight: 2, dashArray: '4,6', opacity: 0.6
          }).addTo(map);

          // Actualizar panel de indicaciones
          const idxStep = nearestIndex(userPos, steps.map(s => [s.lat, s.lng]));
          const step    = steps[idxStep];
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

          // Ajustar vista para incluir usuario y ruta
          const bounds = L.latLngBounds([userPos, amarreCoords]);
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
