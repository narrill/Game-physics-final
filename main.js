let scene;
let camera;
let renderer;
const input = new Input();

let lastTime = 0;
let accumulator = 0;

const GRAVITY_FORCE = 2;
const gravPoint = new THREE.Vector3();
const polyhedrons = [];

const tripleProduct = (v1, v2, v3) => v1.clone().cross(v2.clone().cross(v3));

const MAX_ITERATIONS = 50;
const handleCollision = (poly1, poly2) => {
  const cso = new ConfigurationSpaceObject(poly1, poly2);
  let colliding;
  let sindex = 0;
  const simplex = [];

  let dir = poly2.position.sub(poly1.position);
  simplex.push(cso.supportInfo(dir));
  let a = simplex[0].csoSupport;

  if(dir.dot(a) <= 0) {
    colliding = false;
  }

  dir.negate();

  let iterations = 0;
  while(colliding !== true && colliding !== false) {
    simplex[++sindex] = cso.supportInfo(dir);
    a = simplex[0].csoSupport;

    // Parallel faces on the dodecahedrons give us numerical issues,
    // so we have to break at a maximum iteration count. Icky
    if(dir.dot(simplex[sindex].csoSupport) < 0 || iterations > MAX_ITERATIONS) {
      colliding = false;
      break;
    }

    const ao = a.clone().negate();

    // Line case
    if(sindex < 2) {
      const b = simplex[1].csoSupport;
      const ab = b.clone().sub(a);
      dir = tripleProduct(ab, ao, ab);
      continue;
    }
    // Triangle case
    else if(sindex < 3) {
      const b = simplex[1].csoSupport;
      const c = simplex[2].csoSupport;
      const ab = b.clone().sub(a);
      const ac = c.clone().sub(a);
      dir = ac.clone().cross(ab);
      if(dir.dot(ao) < 0)
        dir.negate();
    }
    // Tetrahedron case
    else {
      const b = simplex[1].csoSupport;
      const c = simplex[2].csoSupport;
      const d = simplex[3].csoSupport;

      const ad = d.clone().sub(a);
      const bd = d.clone().sub(b);
      const cd = d.clone().sub(c);

      const d0 = d.clone().negate();

      const abdNorm = ad.clone().cross(bd);
      const bcdNorm = bd.clone().cross(cd);
      const cadNorm = cd.clone().cross(ad);

      if(abdNorm.dot(d0) > 0) {
        simplex.splice(2, 1);
        dir = abdNorm;
        --sindex;
      }
      else if(bcdNorm.dot(d0) > 0) {
        simplex.splice(0, 1);
        dir = bcdNorm;
        --sindex;
      }
      else if(cadNorm.dot(d0) > 0) {
        simplex.splice(1, 1);
        dir = cadNorm;
        --sindex;
      }
      else {
        colliding = true;
        break;
      }
    }
    ++iterations;
  }

  return colliding;
};

const update = (dt) => {
  for(let c = 0; c < polyhedrons.length; ++c) {
    const poly = polyhedrons[c];
    const gravityForce = gravPoint.clone().sub(poly.position).normalize().multiplyScalar(GRAVITY_FORCE);
    poly.force.add(gravityForce);
    poly.update(dt);
  }

  for(let c = 0; c < polyhedrons.length - 1; ++c) {
    for(let n = c + 1; n < polyhedrons.length; ++n) {
      if(handleCollision(polyhedrons[c], polyhedrons[n])) {
        polyhedrons[c].collide();
        polyhedrons[n].collide();
      }
    }
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

  window.addEventListener('keydown', (e) => {
    if(e.repeat)
      return;
    input.trigger(e.code);
  });

  window.addEventListener('keyup', (e) => {
    input.release(e.code);
  });

  document.body.appendChild(renderer.domElement);

  const dLight = new THREE.DirectionalLight();
  dLight.position.z = .5;
  scene.add(dLight);

  const light = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(light);

  camera.position.set(10, 20, 20);
  camera.lookAt(0, 0, 0);

  const DIMENSIONS = 2;
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