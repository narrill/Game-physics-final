let scene;
let camera;
let renderer;

let lastTime = 0;
let accumulator = 0;

const GRAVITY_FORCE = 2;
const gravPoint = new THREE.Vector3();
const polyhedrons = [];

const update = (dt) => {
  for(let c = 0; c < polyhedrons.length; ++c) {
    const poly = polyhedrons[c];
    const gravityForce = gravPoint.clone().sub(poly.position).normalize().multiplyScalar(GRAVITY_FORCE);
    poly.force.add(gravityForce);
    poly.update(dt);
  }
};

const draw = (now) => {
  renderer.render(scene, camera);
};

const frame = () => {
  const now = Date.now().valueOf();
  let dt = (now - lastTime) / 1000;

  lastTime = now;

  const step = .01;

  if(dt >= step * 8) {
    dt = 0;
    console.log('throttle');
  }

  accumulator += dt;

  while(accumulator >= step){
    update(step);
    accumulator -= step;
  } 
  
  draw(now);

  requestAnimationFrame(frame);
};

window.onload = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  document.body.appendChild(renderer.domElement);

  const dLight = new THREE.DirectionalLight();
  dLight.position.z = .5;
  scene.add(dLight);

  const light = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(light);

  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);

  const DIMENSIONS = 3;
  const SPACING = 10;
  const START = -SPACING * DIMENSIONS / 2 + SPACING/2;
  for(let row = 0; row < DIMENSIONS; ++row) {
    for(let col = 0; col < DIMENSIONS; ++col) {
      for(let z = 0; z < DIMENSIONS; ++z) {
        const polygonKeys = Object.keys(POLYHEDRONS);
        const polygonIndex = Math.floor(Math.random() * polygonKeys.length);
        const polygon = POLYHEDRONS[polygonKeys[polygonIndex]];
        polyhedrons.push(new Polyhedron(polygon, new THREE.Vector3(START + SPACING * row, START + SPACING * col, START + SPACING * z)));
      }
    }
  }

  lastTime = Date.now();
  requestAnimationFrame(frame);
};