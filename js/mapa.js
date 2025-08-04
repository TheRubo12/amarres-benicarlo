// js/mapa.js

(function() {
  // Helper: leer parámetro URL
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Helper: mostrar y actualizar paneles
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

  // Cargar datos de amarres (fíjate en la ruta ../data...)
  fetch('../data/amarres.json')
    .then(res => res.json())
    .then(data => {
      const entry = data[amarreId];
      if (!entry) throw new Error('ID de amarre no válido');

      const oficinaCoords = [40.41478, 0.43311];
      const amarreCoords  = [entry.lat, entry.lng];
      const ruta          = entry.route;   // Array de coordenadas
      const steps         = entry.steps;   // Array de pasos con lat, lng, distance, instruction, sub

      // Punto de entrada al puerto (el primer punto de la ruta)
      const entryCoords = ruta[0];

      // 1) Crear mapa y centrar
      const map = L.map('map').setView(oficinaCoords, 17);

      // 2) Capa base OSM
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // 3) Capa náutica OpenSeaMap
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenSeaMap & OpenStreetMap contributors',
        opacity: 0.6,
        maxZoom: 18
      }).addTo(map);

      // 4) Iconos personalizados
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25,41],
        iconAnchor: [12,41],
        popupAnchor: [1,-34],
        shadowSize: [41,41]
      });
      const boatIcon = new L.Icon({
        iconUrl: 'https://img.icons8.com/fluency/48/000000/boat.png',
        iconSize: [32,32],
        iconAnchor: [16,16]
      });

      // 5) Marcadores fijos
      L.marker(oficinaCoords, { icon: redIcon })
        .addTo(map).bindPopup('Oficina del puerto');
      L.marker(entryCoords)
        .addTo(map).bindPopup('Entrada del puerto');
      L.marker(amarreCoords)
        .addTo(map).bindPopup(`Amarre ${amarreId}`);

      // 6) Dibujar la ruta completa inicialmente
      let routeLine = L.polyline(ruta, {
        color: 'blue',
        weight: 4,
        opacity: 0.8
      }).addTo(map);

      // 7) Marcador de usuario (barco)
      const userMarker = L.marker(oficinaCoords, { icon: boatIcon })
        .addTo(map);

      // Helper: encuentra índice más cercano en un array de coords
      function nearestIndex(pos, coordsArray) {
        let best = 0, minD = Infinity;
        coordsArray.forEach((c,i) => {
          const d = map.distance(pos, c);
          if (d < minD) {
            minD = d;
            best = i;
          }
        });
        return best;
      }

      // 8) Vigilar geolocalización en tiempo real
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
          const userPos = [position.coords.latitude, position.coords.longitude];

          // Mover marcador del usuario
          userMarker.setLatLng(userPos).bindPopup('Estás aquí').openPopup();

          // Recortar la ruta restante
          const idxRoute = nearestIndex(userPos, ruta);
          const remaining = ruta.slice(idxRoute);
          routeLine.setLatLngs(remaining);

          // Panel superior: paso actual
          const idxStep = nearestIndex(
            userPos,
            steps.map(s => [s.lat, s.lng])
          );
          const step = steps[idxStep];
          showPanel('nav-panel', `
            <div class="distance">${step.distance}</div>
            <div class="instruction">${step.instruction}</div>
            ${step.sub ? `<div class="sub">${step.sub}</div>` : ''}
          `);

          // Panel inferior: distancia restante al amarre
          const rem = Math.round(map.distance(userPos, amarreCoords)) + ' m';
          showPanel('footer-panel', `
            <div class="footer-distance">${rem}</div>
            <div class="footer-text">Marina Benicarló</div>
          `);

          // Ajustar vista para incluir usuario y ruta remanente
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
    .catch(err => {
      console.error(err);
      alert('Error cargando datos de amarres.');
    });

})();
