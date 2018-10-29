precision mediump float;

varying vec3 worldSpaceCoords;
varying vec4 projectedCoords;

void main() {
  worldSpaceCoords = (modelMatrix * vec4(position + vec3(0.5, 0.5, 0.5), 1.0)).xyz;
  projectedCoords = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectedCoords;
}
