const orbitalContainer = document.getElementById('orbitalContainer');
const streetMapEl = document.getElementById('streetMap');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020712);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 3.1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
orbitalContainer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 1.4;
controls.maxDistance = 9;
controls.enableDamping = true;

const texLoader = new THREE.TextureLoader();
const dayTexture = texLoader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg');
const nightTexture = texLoader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/earth-night.jpg');
const bumpTexture = texLoader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_4k.jpg');
const cloudTexture = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshPhongMaterial({
    map: dayTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.025,
    shininess: 4,
    specular: new THREE.Color(0x333333),
  })
);
scene.add(earth);

const cloudLayer = new THREE.Mesh(
  new THREE.SphereGeometry(1.008, 96, 96),
  new THREE.MeshLambertMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
);
scene.add(cloudLayer);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.04, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x6ea6ff,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  })
);
scene.add(atmosphere);

scene.add(new THREE.AmbientLight(0x6d86bf, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(4, 2, 3);
scene.add(sun);

const state = {
  autoSpin: true,
  clouds: true,
  atmosphere: true,
  night: false,
  inStreetView: false,
};

const cityMap = {
  newyork: { center: [-74.006, 40.7128], zoom: 15.2, bearing: -20 },
  tokyo: { center: [139.6917, 35.6895], zoom: 15.5, bearing: 24 },
  london: { center: [-0.1276, 51.5072], zoom: 15.3, bearing: 10 },
  sydney: { center: [151.2093, -33.8688], zoom: 15.1, bearing: -38 },
};

let map;
function initMap() {
  if (map) return;

  map = new maplibregl.Map({
    container: 'streetMap',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 1.8,
    pitch: 0,
    bearing: 0,
    antialias: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

  map.on('style.load', () => {
    if (!map.getLayer('3d-buildings') && map.getSource('openmaptiles')) {
      map.addLayer({
        id: '3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        filter: ['==', ['get', 'render_height'], ['get', 'render_height']],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#b8c8de',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.88,
        },
      });
    }
  });
}

function setNightMode(enabled) {
  state.night = enabled;
  earth.material.map = enabled ? nightTexture : dayTexture;
  earth.material.emissive = new THREE.Color(enabled ? 0x9f9276 : 0x000000);
  earth.material.emissiveIntensity = enabled ? 0.42 : 0;
  atmosphere.material.opacity = enabled ? 0.08 : 0.14;
}

document.getElementById('toggleSpin').addEventListener('change', (e) => {
  state.autoSpin = e.target.checked;
});

document.getElementById('toggleClouds').addEventListener('change', (e) => {
  state.clouds = e.target.checked;
  cloudLayer.visible = state.clouds;
});

document.getElementById('toggleAtmosphere').addEventListener('change', (e) => {
  state.atmosphere = e.target.checked;
  atmosphere.visible = state.atmosphere;
});

document.getElementById('toggleNight').addEventListener('change', (e) => {
  setNightMode(e.target.checked);
});

function toStreet(cityKey) {
  initMap();
  const city = cityMap[cityKey];
  if (!city) return;

  state.inStreetView = true;
  streetMapEl.classList.add('active');

  map.jumpTo({ center: city.center, zoom: 2, pitch: 0, bearing: 0 });
  map.easeTo({
    center: city.center,
    zoom: city.zoom,
    bearing: city.bearing,
    pitch: 62,
    duration: 3800,
    essential: true,
  });
}

for (const button of document.querySelectorAll('[data-city]')) {
  button.addEventListener('click', () => toStreet(button.dataset.city));
}

document.getElementById('orbitalView').addEventListener('click', () => {
  state.inStreetView = false;
  streetMapEl.classList.remove('active');
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (!state.inStreetView && state.autoSpin) {
    earth.rotation.y += 0.0009;
  }

  if (state.clouds) {
    cloudLayer.rotation.y += 0.0012;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (map) map.resize();
});
