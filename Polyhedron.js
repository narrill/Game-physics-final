class Polyhedron {
  constructor(polyhedron, position) {
    this._mesh = new THREE.Mesh(polyhedron.geometry, new THREE.MeshLambertMaterial({ color: 0x00ff00 }));
    this._mesh.position.copy(position);
    this._v = new THREE.Vector3(0, 0, 0);
    this._w = new THREE.Quaternion();
    this._m = polyhedron.mass;
    this._f = new THREE.Vector3(0, 0, 0);

    this._shouldCalculateAABB = true;

    // to-do, set inertia tensor

    scene.add(this._mesh);
  }

  update(dt) {
    const adt = this._f.multiplyScalar(dt / this._m);
    this._v.add(adt);
    this._mesh.position.add(this._v.clone().multiplyScalar(dt));
    this._f.set(0, 0, 0);
    this._shouldCalculateAABB = true;
    this._mesh.updateMatrix();
    this._mesh.updateMatrixWorld();
  }

  // Returns a clone because the object's matrix needs to be updated with position changes
  // The object should only be moved via its velocity or force vectors
  get position() {
    return this._mesh.position.clone();
  }

  get velocity() {
    return this._v;
  }

  // Returns a clone because the object's matrix needs to be updated with rotation changes
  // The object should only be rotated via its angular velocity
  get orientation() {
    const quat = new THREE.Quaternion();
    return this._mesh.rotation.clone();
  }

  get force() {
    return this._f;
  }

  get aabb() {
    if(this._shouldCalculateAABB) {
      this._aabb = new THREE.Box3().setFromObject(this._mesh);
      this._shouldCalculateAABB = false;
    }

    return this._aabb.clone();
  }

  worldToModelDir(d) {
    return d.clone().applyQuaterion(this.orientation);
  }

  worldToModel(v) {
    return this._mesh.worldToLocal(v.clone());
  }

  modelToWorld(v) {
    return this._mesh.localToWorld(v.clone());
  }

  supportFunction(direction) {
    let max = -Number.MAX_VALUE;
    let selectedVert;

    const buffer = this._mesh.geometry.position;

    for(let c = 0; c < this.vertices.length; ++c) {
      const vert = new THREE.Vector3(buffer.getX(c), buffer.getY(c), buffer.getZ(c));
      const projVert = direction.dot(vert);
      if(projVert > max) {
        max = projVert;
        selectedVert = vert;
      }
    }

    return selectedVert;
  }
}

// Polyhedron static geometry & physics properties
const POLYHEDRONS = {
  BOX: { 
    geometry: new THREE.BoxGeometry(1, 1, 1)
  },
  CYLINDER: { 
    geometry: new THREE.CylinderGeometry(1, 1, 3)
  },
  DODECAHEDRON: { 
    geometry: new THREE.DodecahedronGeometry(2)
  }
};

Object.keys(POLYHEDRONS).forEach((SHAPE) => {
  const polyhedron = POLYHEDRONS[SHAPE];
  const geometry = polyhedron.geometry;

  // Transform polygons such that the centroid is at the origin
  const verts = geometry.vertices;
  let centroid = new THREE.Vector3();
  for (let i = 0; i < verts.length; ++i) {
    const current = verts[i];
    centroid.add(current);
  }
  centroid.multiplyScalar(1 / verts.length);

  geometry.translate(centroid.x, centroid.y, centroid.z);

  // Calculate mass
  const faces = polyhedron.geometry.faces;
  let volume = 0;
  for(let i = 0; i < faces.length; ++i) {
    const current = faces[i];
    const a = verts[current.a].clone();
    const b = verts[current.b].clone();
    const c = verts[current.c].clone();
    volume += Math.abs(a.dot(b.cross(c))) / 6;
  }

  const DENSITY = 1;
  polyhedron.mass = volume * DENSITY;

  // to-do, calculate inertia tensor

  // Convert to buffer geometry for rendering performance
  POLYHEDRONS[SHAPE].geometry = new THREE.BufferGeometry().fromGeometry(geometry);
});