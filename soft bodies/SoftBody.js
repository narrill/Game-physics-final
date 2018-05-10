class SoftBody {
  reset(spring = {}) {
    this.nodes = [];
    this.resetSpring(spring);
  }

  // Changes the spring parameters
  resetSpring({restLength, k, damping}) {
    this.restLength = restLength;
    this.k = k;
    this.damping = damping;
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
    // Calculate all spring forces in the body before integrating any positions
    // Helps with numerical stability, probably
    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].updateSpringForce(this.restLength, this.k, this.damping);

    for(let c = 0; c < this.nodes.length; ++c)
      this.nodes[c].update(dt);
  }
}