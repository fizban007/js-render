precision mediump float;

varying vec3 worldSpaceCoords;

void main()
{
  worldSpaceCoords = position + vec3(0.5, 0.5, 0.5);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
