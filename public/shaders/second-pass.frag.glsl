precision mediump float;

varying vec3 worldSpaceCoords;
varying vec4 projectedCoords;

uniform sampler2D tex;
uniform sampler2D cubeTex;
uniform sampler2D transferTex;
uniform vec3 starColor;
uniform float steps;
uniform float alphaCorrection;
uniform float res;
uniform float row;
uniform float star_radius;
uniform int species;

// The maximum distance through our rendering volume is sqrt(3).
// The maximum number of steps we take to travel a distance of 1 is 512.
// ceil( sqrt(3) * 512 ) = 887
// This prevents the back of the image from getting cut off when steps=512 &
// viewing diagonally.
const int MAX_STEPS = 887;

// Acts like a texture3D using Z slices and trilinear filtering.
vec4 sampleAs3DTexture(vec3 texCoord) {
  vec4 colorSlice1;
  vec4 colorSlice2;
  vec4 color1;
  vec4 color2;
  vec2 texCoordSlice1;
  vec2 texCoordSlice2;

  // The z coordinate determines which Z slice we have to look for.
  // Z slice number goes from 0 to 255.
  float zSliceNumber1 = floor(texCoord.z * (res - 1.0));

  // As we use trilinear we go the next Z slice.
  float zSliceNumber2 = min(zSliceNumber1 + 1.0, (res - 1.0)); // Clamp to 255

  float col = res/row;
  // The Z slices are stored in a matrix of 16x16 of Z slices.
  // The original UV coordinates have to be rescaled by the tile numbers in each
  // row and column.
  texCoord.x /= row;
  texCoord.y /= col;

  texCoordSlice1 = texCoordSlice2 = texCoord.xy;

  // Add an offset to the original UV coordinates depending on the row and
  // column number.
  texCoordSlice1.x += (mod(zSliceNumber1, row) / row);
  texCoordSlice1.y += floor(zSliceNumber1 / row) / col;

  texCoordSlice2.x += (mod(zSliceNumber2, row) / row);
  texCoordSlice2.y += floor(zSliceNumber2 / row) / col;

  // Get the opacity value from the 2D texture.
  // Bilinear filtering is done at each texture2D by default.
  colorSlice1 = texture2D(cubeTex, texCoordSlice1);
  colorSlice2 = texture2D(cubeTex, texCoordSlice2);

  // TODO: only interpolate the sampled alpha values, then do the transfer lookup

  // Based on the opacity obtained earlier, get the RGB color in the transfer
  // function texture.
  colorSlice1.rgb = texture2D(transferTex, vec2(colorSlice1.a, 1.0)).rgb;
  colorSlice2.rgb = texture2D(transferTex, vec2(colorSlice2.a, 1.0)).rgb;
  // if (species == 0) {
  //   color1.rgb = texture2D(transferTex, vec2(colorSlice1.a, 1.0)).rgb;
  //   color2.rgb = texture2D(transferTex, vec2(colorSlice2.a, 1.0)).rgb;
  //   color1.a = colorSlice1.a;
  //   color2.a = colorSlice2.a;
  // } else if (species == 1) {
  //   color1.rgb = texture2D(transferTex, vec2(colorSlice1.b, 1.0)).rgb;
  //   color2.rgb = texture2D(transferTex, vec2(colorSlice2.b, 1.0)).rgb;
  //   color1.a = colorSlice1.b;
  //   color2.a = colorSlice2.b;
  // } else if (species == 2) {
  //   color1.rgb = texture2D(transferTex, vec2(colorSlice1.r, 1.0)).rgb;
  //   color2.rgb = texture2D(transferTex, vec2(colorSlice2.r, 1.0)).rgb;
  //   color1.a = colorSlice1.r;
  //   color2.a = colorSlice2.r;
  // } else if (species == 3) {
  //   color1.rgb = texture2D(transferTex, vec2(colorSlice1.g, 1.0)).rgb;
  //   color2.rgb = texture2D(transferTex, vec2(colorSlice2.g, 1.0)).rgb;
  //   color1.a = colorSlice1.g;
  //   color2.a = colorSlice2.g;
  // }
  // colorSlice1.a = 255 - colorSlice1.a;
  // colorSlice2.a = 255 - colorSlice2.a;

  // How distant is zSlice1 to ZSlice2. Used to interpolate between one Z slice
  // and the other.
  float zDifference = mod(texCoord.z * (res - 1.0), 1.0);

  // Finally interpolate between the two intermediate colors of each Z slice.
  // return mix(color1, color2, zDifference);
  return mix(colorSlice1, colorSlice2, zDifference);
}

void main(void) {
  // Transform the coordinates it from [-1;1] to [0;1]
  vec2 texc = vec2(((projectedCoords.x / projectedCoords.w) + 1.0) / 2.0,
                   ((projectedCoords.y / projectedCoords.w) + 1.0) / 2.0);
  // vec2 texc = vec2(projectedCoords.x / projectedCoords.w, projectedCoords.y / projectedCoords.w);

  // The back position is the world space position stored in the texture.
  vec3 backPos = texture2D(tex, texc).xyz;

  // The front position is the world space position of the second render pass.
  vec3 frontPos = worldSpaceCoords;

  // The direction from the front position to back position.
  vec3 dir = backPos - frontPos;
  // vec3 dir = frontPos - backPos;

  float rayLength = length(dir);

  // Calculate how long to increment in each step.
  float delta = 1.0 / steps;

  // The increment in each direction for each step.
  vec3 deltaDirection = normalize(dir) * delta;
  float deltaDirectionLength = length(deltaDirection);

  // Start the ray casting from the front position.
  vec3 currentPosition = frontPos;
  // vec3 currentPosition = backPos;

  // The color accumulator.
  vec4 accumulatedColor = vec4(0.0);

  // The alpha value accumulated so far.
  float accumulatedAlpha = 0.0;

  // How long has the ray travelled so far.
  float accumulatedLength = 0.0;

  // If we have twice as many samples, we only need ~1/2 the alpha per sample.
  // Scaling by 256/10 just happens to give a good value for the alphaCorrection
  // slider.
  float alphaScaleFactor = 25.6 * delta;

  vec4 colorSample;
  float alphaSample;

  // Perform the ray marching iterations
  for (int i = 0; i < MAX_STEPS; i++) {
    // Get the voxel intensity value from the 3D texture.
    colorSample = sampleAs3DTexture(currentPosition);

    // Allow the alpha correction customization.
    alphaSample = colorSample.a * alphaCorrection;
    // colorSample.a = 1.0;

    // Applying this effect to both the color and alpha accumulation results in
    // more realistic transparency.
    alphaSample *= (1.0 - accumulatedAlpha);

    // Scaling alpha by the number of steps makes the final color invariant to
    // the step size.
    alphaSample *= alphaScaleFactor;

    // Perform the composition.
    accumulatedColor += colorSample * alphaSample;

    // Store the alpha accumulated so far.
    accumulatedAlpha += alphaSample;

    // Advance the ray.
    currentPosition += deltaDirection;
    accumulatedLength += deltaDirectionLength;

   if (length(currentPosition - vec3(0.5, 0.5, 0.5)) < star_radius) {
      // gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
      // return;
      accumulatedColor += vec4(starColor, 0.8);
      break;
      // accumulatedAlpha += 0.8;
      // accumulatedColor = vec4(starColor, 0.8);
      // accumulatedAlpha = 0.8;
    }

    // If the length traversed is more than the ray length, or if the alpha
    // accumulated reaches 1.0 then exit.
    if (accumulatedLength >= rayLength || accumulatedAlpha >= 1.0)
      break;
  }
  // accumulatedColor.a = min(accumulatedColor.a, 0.99);
  // gl_FragColor = vec4(accumulatedColor.xyz, 0.8);
  gl_FragColor = accumulatedColor;
  // gl_FragColor = vec4(texture2D(transferTex, vec2(accumulatedColor.a, 1.0)).rgb,
  //                     accumulatedColor.a);
  //   color1.rgb = texture2D(transferTex, vec2(colorSlice1.r, 1.0)).rgb;
}
