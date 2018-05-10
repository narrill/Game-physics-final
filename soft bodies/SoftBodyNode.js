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

  updateSpringForce(restLength, k, damping) {
    if(this.selected || this.anchored)
      return;
    for(let c = 0; c < this.linked.length; ++c) {
      const other = this.linked[c];
      const to = subVector(other.position, this.position);
      const distance = magVector(to);
      const direction = normalizeVector(to);

      const force = ((distance - restLength) * k) + dotVector(subVector(other.velocity, this.velocity), direction) * damping;
      this.force = addVector(this.force, scaleVector(force, direction));
    }
  }

  update(dt) {    
    if(this.selected || this.anchored)
      return;
    this.force = addVector(this.force, [0, GRAVITY_FORCE]);
    this.velocity = addVector(this.velocity, scaleVector(dt / this.mass, this.force));
    this.position = addVector(this.position, scaleVector(dt, this.velocity));
    this.force = [0, 0];
    if(this.position[1] + this.radius > canvas.height - groundLevel) {
      this.position[1] = canvas.height - groundLevel - this.radius;
      this.velocity[0] -= this.velocity[0] * FRICTION;
      this.velocity[1] = -this.velocity[1];
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