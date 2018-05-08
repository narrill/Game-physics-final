class ConfigurationSpaceObject {
  constructor(shape1, shape2) {
    this.shape1 = shape1;
    this.shape2 = shape2;
  }

  supportInfo(direction) {
    const dir1 = this.shape1.worldToModelDir(direction);
    const dir2 = this.shape2.worldToModelDir(direction.clone().negate());

    const support1 = this.shape1.supportFunction(dir1);
    const support2 = this.shape2.supportFunction(dir2);

    const support1W = this.shape1.modelToWorld(support1);
    const support2W = this.shape2.modelToWorld(support2);

    return {
      csoSupport: support1W.clone().sub(support2W),
      support1,
      support2,
      support1W,
      support2W
    };
  }

  // Direction in world space
  supportFunction(direction) {
    const dir1 = this.shape1.worldToModelDir(direction);
    const dir2 = this.shape2.worldToModelDir(direction.clone().negate());

    const support1 = this.shape1.supportFunction(dir1);
    const support2 = this.shape2.supportFunction(dir2);

    const support1W = this.shape1.modelToWorld(support1);
    const support2W = this.shape2.modelToWorld(support2);

    return support1W.clone().sub(support2W);
  }
}