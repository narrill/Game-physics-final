let scene;
let camera;
let renderer;
const input = new Input();

let o1;

let lastTime = 0;
let accumulator = 0;

const GRAVITY_FORCE = 2;
const gravPoint = new THREE.Vector3();
const polyhedrons = [];

const isZero = (v) => {
  return v.x === 0 && v.y === 0 && v.z === 0;
};

const isNearlyEqual = (v1, v2, epsilon = .0001) => {
  const diff = v1.clone().sub(v2);
  return Math.abs(diff.x) <= epsilon && Math.abs(diff.y) <= epsilon && Math.abs(diff.z) <= epsilon;
};

// Projects point p onto the triangle formed by a, b, and c, and returns the barycentric coefficients
const projectedBarycenterCoord = (p, a, b, c) => {
  const u = b.clone().sub(a);
  const v = c.clone().sub(a);
  const coeff = {};
  const n = u.clone().cross(v);
  const oneOver4ASquared = 1.0 / n.dot(n);
  const w = p.clone().sub(a);
  coeff.b = u.clone().cross(w).dot(n) * oneOver4ASquared;
  coeff.c = w.clone().cross(v).dot(n) * oneOver4ASquared;
  coeff.a = 1.0 - coeff.b - coeff.c;
  return coeff;
};

// Minkowski Portal Refinement for collision and contacts
const mprCollision = (poly1, poly2) => {
  const cso = new ConfigurationSpaceObject(poly2, poly1);

  // Returns the collision normal or undefined. If contact vectors are passed, they will be set to the 
  // appropriate world-space contact points. Interior point (v) and ray direction (r) may optionally be passed.
  const mprTest = (v = poly2.position.sub(poly1.position), r = v.clone().negate(), contact1, contact2) => {
    // Phase one - portal generation
    // Start with interior point - difference of geometric centers
    //const v = poly2.position.sub(poly1.position);

    // if they overlap the shapes are colliding
    // if(isZero(v))
    //   return true;

    // pick a search direction - interior point to origin
    //const r = v.clone().negate();

    // get the first boundary point and the next search direction
    let a = cso.supportInfo(r);
    const nva = v.clone().cross(a.csoSupport);

    if(isZero(nva))
      // if(v.dot(a.csoSupport) < 0)
      //   return true;
      // else
      //   return false;
      return false;

    // next boundary point and search direction
    let b = cso.supportInfo(nva);
    let nvab = a.csoSupport.clone().sub(v).cross(b.csoSupport.clone().sub(v));

    if(isZero(nvab))
      return false;

    // final boundary point - with this we have a portal
    // (triangle composed of boundary points on the minkowski difference)
    let c = cso.supportInfo(nvab);

    // Phase two - portal validation
    // we need to make sure the origin ray, r, intersects the portal
    let done = false;

    while(!done) {
      done = true;

      // This does half-plane checks on all the faces in the simplex (minus the portal) to
      // determine whether the origin is inside them. If a check fails, we swap the point
      // opposite the plane for a support point in the direction of the outward plane normal.
      // Loops until all checks succeed
      nvab = a.csoSupport.clone().sub(v).cross(b.csoSupport.clone().sub(v));
      let nvbc = b.csoSupport.clone().sub(v).cross(c.csoSupport.clone().sub(v));
      let nvca = c.csoSupport.clone().sub(v).cross(a.csoSupport.clone().sub(v));

      if(r.dot(nvab) > 0) {
        done = false;
        c = cso.supportInfo(nvab);
        const tmp = a;
        a = b;
        b = tmp;
      }
      else if(r.dot(nvbc) > 0) {
        done = false;
        a = cso.supportInfo(nvbc);
        const tmp = b;
        b = c;
        c = tmp;
      }
      else if(r.dot(nvca) > 0) {
        done = false;
        b = cso.supportInfo(nvca);
        const tmp = a;
        a = c;
        c = tmp;
      }
    }

    // Phase three - portal refinement
    // We know the origin ray passes through the portal, so we just need to push the portal
    // to the edge of the minkowski difference and see if its half-plane check succeeds. We
    // do this so we can get contact information - normally we would just push out until the
    // half-plane check succeeds.
    // Early out if a half-plane check at the furthest support point fails
    let hit = false;
    let stop = false;
    const EPSILON = .0001;
    while(true) {
      // Outward portal normal
      const n = c.csoSupport.clone().sub(a.csoSupport).cross(b.csoSupport.clone().sub(a.csoSupport));

      if(stop) {
        if(!hit)
          return false;
        // calculate and set contact points if applicable
        if(contact1 && contact2) {
          const coeff = projectedBarycenterCoord(v, a.csoSupport, b.csoSupport, c.csoSupport);
          const a1 = a.support1W.clone();
          const b1 = b.support1W.clone();
          const c1 = c.support1W.clone();
          contact1.copy(
            a1.multiplyScalar(coeff.a).add(b1.multiplyScalar(coeff.b)).add(c1.multiplyScalar(coeff.c))
          );
          const a2 = a.support2W.clone();
          const b2 = b.support2W.clone();
          const c2 = c.support2W.clone();
          contact2.copy(
            a2.multiplyScalar(coeff.a).add(b2.multiplyScalar(coeff.b)).add(c2.multiplyScalar(coeff.c))
          );

          const am = a.csoSupport.clone();
          const bm = b.csoSupport.clone();
          const cm = c.csoSupport.clone();
          const projectedOrigin = am.multiplyScalar(coeff.a).add(bm.multiplyScalar(coeff.b)).add(cm.multiplyScalar(coeff.c));
          const penetrationDepth = projectedOrigin.length();

          // return portal normal scaled by distance from origin to portal (penetration vector)
          return n.normalize().multiplyScalar(penetrationDepth);
        }
        else
          // return portal normal (contact normal)
          return n.normalize();
      }

      // Half-plane check
      if(a.csoSupport.dot(n) >= 0) {
        hit = true;
      }

      // New point to add
      const p = cso.supportInfo(n);

      // stop if the pc edge is nearly perpendicular to the portal normal,
      // or if the origin is past the support plane
      if(p.csoSupport.clone().sub(c.csoSupport).dot(n) <= EPSILON || p.csoSupport.dot(n) < 0) {
        stop = true;
      }

      // replace one of the boundary points with the new point based on
      // half-plane checks
      if(v.dot(p.csoSupport.clone().cross(a.csoSupport)) > 0)
        if(v.dot(p.csoSupport.clone().cross(b.csoSupport)) < 0)
          c = p;
        else
          a = p;
      else
        if(v.dot(p.csoSupport.clone().cross(c.csoSupport)) > 0)
          b = p;
        else
          a = p;
    }
  }

  let cn = mprTest();
  if(cn) {
    const contact1 = new THREE.Vector3();
    const contact2 = new THREE.Vector3();
    const penetrationVector = mprTest(cn.clone().negate(), cn, contact1, contact2);
    //console.log(penetrationVector);
    console.log(contact1);
    console.log(contact2);
    console.log();
    if(penetrationVector) {
      //poly1.translate(penetrationVector.clone().multiplyScalar(1));
      //poly2.translate(penetrationVector.clone().multiplyScalar(-.5));
    }

    return true;
  }
  return false;
};

const update = (dt) => {
  if(input.isDown("KeyW"))
    o1._v.z -= 1;
  if(input.isDown("KeyS"))
    o1._v.z += 1;
  if(input.isDown("KeyA"))
    o1._v.x -= 1;
  if(input.isDown("KeyD"))
    o1._v.x += 1;
  if(input.isDown("KeyX"))
    o1._v.y -= 1;
  if(input.isDown("Space"))
    o1._v.y += 1;

  for(let c = 0; c < polyhedrons.length; ++c) {
    const poly = polyhedrons[c];
    const gravityForce = gravPoint.clone().sub(poly.position).normalize().multiplyScalar(GRAVITY_FORCE);
    poly.force.add(gravityForce);
    poly.update(dt);
  }

  for(let c = 0; c < polyhedrons.length - 1; ++c) {
    for(let n = c + 1; n < polyhedrons.length; ++n) {
      if(mprCollision(polyhedrons[c], polyhedrons[n])) {
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

  // const DIMENSIONS = 2;
  // const SPACING = 10;
  // const START = -SPACING * DIMENSIONS / 2 + SPACING/2;
  // for(let row = 0; row < DIMENSIONS; ++row) {
  //   for(let col = 0; col < DIMENSIONS; ++col) {
  //     for(let z = 0; z < DIMENSIONS; ++z) {
  //       const polygonKeys = Object.keys(POLYHEDRONS);
  //       const polygonIndex = Math.floor(Math.random() * polygonKeys.length);
  //       const polygon = POLYHEDRONS[polygonKeys[polygonIndex]];
  //       polyhedrons.push(new Polyhedron(polygon, new THREE.Vector3(START + SPACING * row, START + SPACING * col, START + SPACING * z)));
  //     }
  //   }
  // }
  o1 = new Polyhedron(POLYHEDRONS.BOX, new THREE.Vector3(2, 2, 2));
  polyhedrons.push(o1);
  polyhedrons.push(new Polyhedron(POLYHEDRONS.BOX, new THREE.Vector3(-2, 2, 2)));

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  lastTime = Date.now();
  requestAnimationFrame(frame);
};