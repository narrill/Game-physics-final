class GridBody extends SoftBody {
  constructor(...args) {
    super();
    this.reset(...args);
  }

  reset(x = 0, y = 0, width = 0, height = 0, {restLength = 50, k = 20000, damping = 1000} = {}) {
    super.reset({restLength, k, damping});

    // Place points in a grid around (x, y)
    const offset = [restLength * (width - 1) / 2, restLength * (height - 1) / 2];
    for(let c = 0; c < width; ++c) {
      for(let i = 0; i < height; ++i) {
        this.nodes.push(new SoftBodyNode(x + c * restLength - offset[0], y + i * restLength - offset[1], 100));
      }
    }

    // Connect nodes only to their neighbors
    for(let c = 0; c < this.nodes.length; ++c) {
      const current = this.nodes[c];
      const rowPosition = c % width;

      current.link(this.nodes[c + width]);
      current.link(this.nodes[c - width]);

      if(rowPosition !== width - 1) {
        current.link(this.nodes[c + 1]);
        current.link(this.nodes[c + width + 1]);
        current.link(this.nodes[c - width + 1]);
      }

      if(rowPosition !== 0) {
        current.link(this.nodes[c - 1]);
        current.link(this.nodes[c + width - 1]);
        current.link(this.nodes[c - width - 1]);
      }
    }
  }
}