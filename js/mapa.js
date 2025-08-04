(function() {
  // Pasos de navegación de ejemplo
  const steps = [
    {
      distance: '60 m',
      instruction: 'Sal del pantalán y continúa por estribor',
      sub: 'A continuación, vira todo a babor'
    }
  ];
  let currentStep = 0;

  // Mostrar panel
  function showPanel(id, html) {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.style.display = 'block';
  }

  // Obtener parámetro URL
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const amarreId = getParam('amarre');
  if (!amarreId) {
    alert('Parámetro amarre faltante');
    throw new Error('Falta parametro amarre');
  }

  // Cargar datos de amarres
  fetch('../data/amarres.json')
    .then(r => r.json())
    .then(data => {
      const entry = data[amarreId];
      if (!entry) {
        alert(`Amarre "${amarreId}" no encontrado.`);
        throw new Error('ID inválido');
      }

      const oficinaCoords = [40.41478, 0.43311];
      const amarreCoords  = [entry.lat, entry.lng];
      const ruta          = entry.route;

      // Inicializar mapa
      const map = L.map('map').setView(oficinaCoords, 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Icono rojo para oficina
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      });

      // Marcadores
      L.marker(oficinaCoords, { icon: redIcon })
        .addTo(map).bindPopup('Oficina del puerto');
      L.marker(amarreCoords)
        .addTo(map).bindPopup(`Amarre ${amarreId}`).openPopup();

      // Dibujar ruta marítima
      L.polyline(ruta, { color: 'blue', weight: 4, opacity: 0.8 }).addTo(map);

      // Panel superior
      const step = steps[currentStep];
      showPanel('nav-panel', `
        <div class="distance">${step.distance}</div>
        <div class="instruction">${step.instruction}</div>
        <div class="sub">${step.sub}</div>
      `);

      // Panel inferior
      showPanel('footer-panel', `
        <div class="footer-distance">375 m</div>
        <div class="footer-text">Marina Benicarló</div>
      `);

      // Geolocalización
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const userCoords = [pos.coords.latitude, pos.coords.longitude];
          L.marker(userCoords)
            .addTo(map).bindPopup('Estás aquí').openPopup();
          const bounds = L.latLngBounds([userCoords, amarreCoords]);
          map.fitBounds(bounds, { padding: [50,50] });
        });
      }
    });
})();
