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
    return [0, 0];
  return [v[0] / mag, v[1] / mag];
};
const distance = (p1, p2) => magVector(subVector(p1, p2));
const distanceFromLineToPoint = (line, p) => Math.abs(dotVector(normalizeVector(perpendicularVectorCCW(subVector(line[0], line[1]))), p));
const vec2ToVec3 = (v) => [v[0], v[1], 0];