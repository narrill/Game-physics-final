let canvas;
let context;
let origin;
let debug = false;

const groundLevel = 100;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const UP_VECTOR = [0, -1];
const DOWN_VECTOR = [0, 1];
const RIGHT_VECTOR = [1, 0];
const LEFT_VECTOR = [-1, 0];

const rotateVector = (vector, theta) => {
  const matrix = [
    Math.cos(theta), -Math.sin(theta),
    Math.sin(theta), Math.cos(theta)
  ];
  return [matrix[0] * vector[0] + matrix[1] * vector[1], matrix[2] * vector[0] + matrix[3] * vector[1]];
};

const addVector = (v1, v2) => [v1[0] + v2[0], v1[1] + v2[1]];
const subVector = (v1, v2) => [v1[0] - v2[0], v1[1] - v2[1]];
const dotVector = (v1, v2) => v1[0] * v2[0] + v1[1] * v2[1];
const dotVector3 = (v1, v2) => v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
const crossVector = (v1, v2) => [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
const scaleVector = (s, v) => [s * v[0], s * v[1]];
const scaleVector3 = (s, v) => [s * v[0], s * v[1], s * v[2]];
const negateVector = (v) => [-v[0], -v[1]];
const perpendicularVectorCCW = (v) => [v[1], -v[0]];
const perpendicularVectorCW = (v) => [-v[1], v[0]];
const tripleProduct = (v1, v2, v3) => subVector(scaleVector(dotVector(v3, v1), v2), scaleVector(dotVector(v3, v2), v1));
const vectorMagSqr = (v) => v[0] * v[0] + v[1] * v[1];
const magVector = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
const normalizeVector = (v) => {
  const mag = magVector(v);
  return [v[0] / mag, v[1] / mag];
};
const distance = (p1, p2) => magVector(subVector(p1, p2));
const distanceFromLineToPoint = (line, p) => Math.abs(dotVector(normalizeVector(perpendicularVectorCCW(subVector(line[0], line[1]))), p));
const vec2ToVec3 = (v) => [v[0], v[1], 0];

class SoftBodyNode {
  constructor(x, y, m) {
    this.position = [x, y];
    this.velocity = [0, 0];
    this.force = [0, 0];
    this.mass = m;
    this.radius = Math.sqrt(m / Math.PI);
    this.linked = [];
  }

  updateSpringForce(dt) {
    for(let c = 0; c < this.linked.length; ++c) {
      const spring = this.linked[c];
      const other = this.linked[c].other;
      let diff = subVector(other.position, this.position);
      const distance = magVector(diff);
      diff = normalizeVector(diff);

      const compression = distance - spring.restLength;
      const velocity = subVector(other.velocity, this.velocity);

      const force = (compression * spring.k) + dotVector(velocity, diff) * spring.damping;
      this.force = addVector(this.force, scaleVector(force, diff));
    }
  }

  update(dt) {    
    this.velocity = addVector(this.velocity, scaleVector(dt/this.mass, this.force));
    this.position = addVector(this.position, scaleVector(dt, this.velocity));
    this.force = [0, 0];
  }

  drawLinks(ctx) {
    for(let c = 0; c < this.linked.length; ++c) {     
      const other = this.linked[c].other; 
      ctx.save();
      ctx.strokeStyle = 'grey';
      ctx.beginPath();
      ctx.moveTo(this.position[0], this.position[1]);
      ctx.lineTo(other.position[0], other.position[1]);
      ctx.strokeWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(this.position[0], this.position[1], this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  link(node, restLength, k, damping) {
    this.linked.push({
      other: node,
      restLength,
      k,
      damping
    });
  }
}

class SoftBody {
  constructor(x, y, width, height, spacing, restLength = 100, k = 3000, damping = 20) {
    this.nodes = [];
    for(let c = 0; c < width; ++c) {
      for(let i = 0; i < height; ++i) {
        this.nodes.push(new SoftBodyNode(x + c * spacing, y + i * spacing, 100));
      }
    }

    for(let c = 0; c < this.nodes.length - 1; ++c) {
      for(let i = c + 1; i < this.nodes.length; ++i) {
        this.nodes[c].link(this.nodes[i], restLength, k, damping);
        this.nodes[i].link(this.nodes[c], restLength, k, damping);
      }
    }
  }

  draw(ctx) {
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].drawLinks(ctx);
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].draw(ctx);
  }

  update(dt) {
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].updateSpringForce();
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].update(dt);
  }
}

const softBodies = [];

const draw = (now) => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for(let c = 0; c < softBodies.length; ++c)
    softBodies[c].draw(context);
};

const update = (dt) => {
  for(let c = 0; c < softBodies.length; ++c)
    softBodies[c].update(dt);
};

let lastTime = 0;
let accumulator = 0;

const frame = () => {
  const now = Date.now().valueOf();
  let dt = (now - lastTime) / 1000;

  lastTime = now;

  const step = .01;

  if(dt >= step*8) {
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
  canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  origin = [canvas.width / 2, canvas.height / 2];
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    origin = [canvas.width / 2, canvas.height / 2];
  });
  document.body.appendChild(canvas);
  context = canvas.getContext('2d'); 

  window.addEventListener('mousedown', (e) => {
    const clickPoint = [e.clientX, e.clientY];
    const worldPoint = subVector(clickPoint, origin);
    gravPoint = worldPoint;
  });

  window.addEventListener('keydown', (e) => {
    if(e.repeat)
      return;
    if(e.key === 'd')
      debug = !debug;
  });

  softBodies.push(new SoftBody(300, 200, 6, 6, 3));

  lastTime = Date.now();
  requestAnimationFrame(frame);
};