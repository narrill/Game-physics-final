let canvas;
let context;
let origin;
let debug = false;

let selectedNode;

const groundLevel = 100;
const GRAVITY_FORCE = 100000;

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
  if(mag === 0)
    retirn [0, 0];
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
    this.selected = false;
  }

  updateSpringForce(dt) {
    if(this.selected)
      return;
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
    if(this.selected)
      return;
    this.force = addVector(this.force, [0, GRAVITY_FORCE]);
    this.velocity = addVector(this.velocity, scaleVector(dt / this.mass, this.force));
    this.position = addVector(this.position, scaleVector(dt, this.velocity));
    if(this.position[1] + this.radius > canvas.height - groundLevel) {
      this.position[1] = canvas.height - groundLevel - this.radius;
      this.velocity[1] = 0;
    }
    this.force = [0, 0];
  }

  raycast(x, y) {
    return vectorMagSqr(subVector([x, y], this.position)) <= this.radius * this.radius;
  }

  drawLinks(ctx) {
    for(let c = 0; c < this.linked.length; ++c) {
      const other = this.linked[c].other;
      ctx.moveTo(this.position[0], this.position[1]);
      ctx.lineTo(other.position[0], other.position[1]);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = (this.selected) ? 'blue' : 'green';
    ctx.beginPath();
    ctx.arc(this.position[0], this.position[1], this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  link(node, restLength, k, damping) {
    if(!node)
      return;
    this.linked.push({
      other: node,
      restLength,
      k,
      damping
    });
  }
}

class SoftBody {
  constructor() {
    this.nodes = [];    
  }

  raycast(x, y) {
    for(let c = 0; c < this.nodes.length; ++c) {
      if(this.nodes[c].raycast(x, y))
        return this.nodes[c];
    }
    return undefined;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'grey';
    ctx.strokeWidth = 2;
    ctx.beginPath();
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].drawLinks(ctx);
    ctx.stroke();
    ctx.restore();
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

// All nodes link to all other nodes
class BlobBody extends SoftBody{
  constructor(x, y, width, height, spacing = 50, restLength = spacing, k = 50000, damping = 100) {
    super();
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
}

// Nodes link only to their neighbors
class GridBody extends SoftBody {
  constructor(x, y, width, height, spacing = 50, restLength = spacing, k = 20000, damping = 1000) {
    super();
    for(let c = 0; c < width; ++c) {
      for(let i = 0; i < height; ++i) {
        this.nodes.push(new SoftBodyNode(x + c * spacing, y + i * spacing, 100));
      }
    }

    for(let c = 0; c < this.nodes.length; ++c) {
      const current = this.nodes[c];
      const rowPosition = c % width;

      current.link(this.nodes[c + width], restLength, k, damping);
      current.link(this.nodes[c - width], restLength, k, damping);

      if(rowPosition !== width - 1) {
        current.link(this.nodes[c + 1], restLength, k, damping);
        current.link(this.nodes[c + width + 1], restLength, k, damping);
        current.link(this.nodes[c - width + 1], restLength, k, damping);
      }

      if(rowPosition !== 0) {
        current.link(this.nodes[c - 1], restLength, k, damping);
        current.link(this.nodes[c + width - 1], restLength, k, damping);
        current.link(this.nodes[c - width - 1], restLength, k, damping);
      }
    }
  }
}

const softBodies = [];

const draw = (now) => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'saddleBrown';
  context.fillRect(0, canvas.height - groundLevel, canvas.width, groundLevel);
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
    for(let c = 0; c < softBodies.length; ++c) {
      const node = softBodies[c].raycast(clickPoint[0], clickPoint[1]);
      if(node) {
        selectedNode = node;
        node.selected = true;
        break;
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if(selectedNode)
      selectedNode.selected = false;
    selectedNode = undefined;
  });

  window.addEventListener('mousemove', (e) => {
    if(selectedNode)
      selectedNode.position = [e.clientX, e.clientY];
  });

  window.addEventListener('keydown', (e) => {
    if(e.repeat)
      return;
    if(e.key === 'd')
      debug = !debug;
  });

  softBodies.push(new GridBody(300, 200, 16, 16, 20));

  softBodies.push(new BlobBody(500, 200, 6, 6));

  lastTime = Date.now();
  requestAnimationFrame(frame);
};