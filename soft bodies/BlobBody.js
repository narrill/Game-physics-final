class BlobBody extends SoftBody{
  constructor(...args) {
    super();
    this.reset(...args);
  }

  reset(x = 0, y = 0, count = 0, {restLength = 60, k = 10000, damping = 200} = {}) {
    super.reset({restLength, k, damping});
    const initialOffset = [0, restLength];
    const wedgeAngle = 2 * Math.PI / count;

    // Place points radially around (x, y)
    for(let c = 0; c < count; ++c) {
      const [_x, _y] = addVector([x, y], rotateVector(initialOffset, wedgeAngle * c));
      this.nodes.push(new SoftBodyNode(_x, _y, 100));
    }

    // Link all pairs of points
    for(let c = 0; c < this.nodes.length - 1; ++c) {
      for(let i = c + 1; i < this.nodes.length; ++i) {
        this.nodes[c].link(this.nodes[i]);
        this.nodes[i].link(this.nodes[c]);
      }
    }
  }
}