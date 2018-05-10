class SoftBodyNode {
  constructor(x, y, m) {
    this.position = [x, y];
    this.velocity = [0, 0];
    this.force = [0, 0];
    this.mass = m;
    this.radius = Math.sqrt(m / Math.PI);
    this.linked = [];
    this.selected = false;
    this.anchored = false;
  }

  // Calculate and sum forces exerted by linked nodes
  updateSpringForce(restLength, k, damping) {
    if(this.selected || this.anchored)
      return;

    for(let c = 0; c < this.linked.length; ++c) {
      const other = this.linked[c];
      const to = subVector(other.position, this.position);
      const distance = magVector(to);
      const direction = normalizeVector(to);

      // F = kx + bx'
      // where k is spring constant
      // x is compression, i.e. distance - rest length
      // b is a damping constant
      // x' is magnitude of relative velocity in the direction of the other node
      const force = ((distance - restLength) * k) + dotVector(subVector(other.velocity, this.velocity), direction) * damping;
      this.force = addVector(this.force, scaleVector(force, direction));
    }
  }

  // Integrate position, clear forces, handle collision with ground plane
  update(dt) {    
    if(this.selected || this.anchored)
      return;

    this.force = addVector(this.force, [0, GRAVITY_FORCE]); // add gravity

    // implicit euler
    this.velocity = addVector(this.velocity, scaleVector(dt / this.mass, this.force));
    this.position = addVector(this.position, scaleVector(dt, this.velocity));

    this.force = [0, 0];

    // Collision with ground plane
    if(this.position[1] + this.radius > canvas.height - groundLevel) {
      this.position[1] = canvas.height - groundLevel - this.radius; //reset position
      this.velocity[0] -= this.velocity[0] * FRICTION; // apply approximation of friction
      this.velocity[1] = -this.velocity[1]; // perfectly elastic bounce
    }
  }

  raycast(x, y) {
    return vectorMagSqr(subVector([x, y], this.position)) <= this.radius * this.radius;
  }

  drawLinks(ctx) {
    for(let c = 0; c < this.linked.length; ++c) {
      const other = this.linked[c];
      ctx.moveTo(this.position[0], this.position[1]);
      ctx.lineTo(other.position[0], other.position[1]);
    }
  }

  draw(ctx) {
    ctx.save();
    if(this.anchored) {
      this.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(this.position[0], this.position[1], this.radius + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const isHovered = this.raycast(mousePosition[0], mousePosition[1]);
    ctx.fillStyle = (this.selected) ? 'blue' : (isHovered) ? 'skyblue' : 'green';
    ctx.beginPath();
    ctx.arc(this.position[0], this.position[1], this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  link(node) {
    if(!node)
      return;
    this.linked.push(node);
  }
}