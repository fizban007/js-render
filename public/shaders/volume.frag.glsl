#version 300 es
precision highp int;
precision highp float;

// uniform highp sampler3D volume;
uniform highp sampler2D cubeTex;
// WebGL doesn't support 1D textures, so we use a 2D texture for the transfer
// function
uniform highp sampler2D transferTex;
uniform ivec3 volume_dims;
uniform float tile_x;
uniform float tile_y;
uniform vec3 starColor;
uniform float star_radius;
uniform int species;
uniform float alphaCorrection;
uniform float dt_scale;

in vec3 vray_dir;
flat in vec3 transformed_eye;

out vec4 color;

// Acts like a texture3D using Z slices and trilinear filtering.
vec4 sampleAs3DTexture(vec3 p) {
  // vec3 texCoord = p * vec3(volume_dims);
  vec3 texCoord = p;
  vec4 colorSlice1;
  vec4 colorSlice2;
  vec4 color1;
  vec4 color2;
  vec2 texCoordSlice1;
  vec2 texCoordSlice2;

  // The z coordinate determines which Z slice we have to look for.
  // Z slice number goes from 0 to 255.
  float zSliceNumber1 = floor(texCoord.z * (tile_x * tile_y - 1.0));

  // As we use trilinear we go the next Z slice.
  float zSliceNumber2 =
      min(zSliceNumber1 + 1.0, (tile_x * tile_y - 1.0)); // Clamp to 255

  // The Z slices are stored in a matrix of tile_x x tile_y of Z slices.
  // The original UV coordinates have to be rescaled by the tile numbers in each
  // row and column.
  texCoord.x /= tile_x;
  texCoord.y /= tile_y;

  texCoordSlice1 = texCoordSlice2 = texCoord.xy;

  // Add an offset to the original UV coordinates depending on the row and
  // column number.
  texCoordSlice1.x += (mod(zSliceNumber1, tile_x) / tile_x);
  texCoordSlice1.y += floor(zSliceNumber1 / tile_x) / tile_y;

  texCoordSlice2.x += (mod(zSliceNumber2, tile_x) / tile_x);
  texCoordSlice2.y += floor(zSliceNumber2 / tile_x) / tile_y;

  // Get the opacity value from the 2D texture.
  // Bilinear filtering is done at each texture2D by default.
  colorSlice1 = texture2D(cubeTex, texCoordSlice1);
  colorSlice2 = texture2D(cubeTex, texCoordSlice2);

  // TODO: only interpolate the sampled alpha values, then do the transfer
  // lookup

  // Based on the opacity obtained earlier, get the RGB color in the transfer
  // function texture.
  // colorSlice1.rgb = texture2D(transferTex, vec2(colorSlice1.a, 1.0)).rgb;
  // colorSlice2.rgb = texture2D(transferTex, vec2(colorSlice2.a, 1.0)).rgb;
  if (species == 0) {
    color1.rgb = texture2D(transferTex, vec2(colorSlice1.a, 1.0)).rgb;
    color2.rgb = texture2D(transferTex, vec2(colorSlice2.a, 1.0)).rgb;
    color1.a = colorSlice1.a;
    color2.a = colorSlice2.a;
  } else if (species == 1) {
    color1.rgb = texture2D(transferTex, vec2(colorSlice1.r, 1.0)).rgb;
    color2.rgb = texture2D(transferTex, vec2(colorSlice2.r, 1.0)).rgb;
    color1.a = colorSlice1.r;
    color2.a = colorSlice2.r;
  } else if (species == 2) {
    color1.rgb = texture2D(transferTex, vec2(colorSlice1.b, 1.0)).rgb;
    color2.rgb = texture2D(transferTex, vec2(colorSlice2.b, 1.0)).rgb;
    color1.a = colorSlice1.b;
    color2.a = colorSlice2.b;
  } else if (species == 3) {
    color1.rgb = texture2D(transferTex, vec2(colorSlice1.g, 1.0)).rgb;
    color2.rgb = texture2D(transferTex, vec2(colorSlice2.g, 1.0)).rgb;
    color1.a = colorSlice1.g;
    color2.a = colorSlice2.g;
  }
  // colorSlice1.a = 255 - colorSlice1.a;
  // colorSlice2.a = 255 - colorSlice2.a;

  // How distant is zSlice1 to ZSlice2. Used to interpolate between one Z slice
  // and the other.
  float zDifference = mod(texCoord.z * (tile_x * tile_y - 1.0), 1.0);

  // Finally interpolate between the two intermediate colors of each Z slice.
  return mix(color1, color2, zDifference);
  // return mix(colorSlice1, colorSlice2, zDifference);
}

vec2 intersect_box(vec3 orig, vec3 dir) {
  const vec3 box_min = vec3(-0.5);
  const vec3 box_max = vec3(0.5);
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = (box_min - orig) * inv_dir;
  vec3 tmax_tmp = (box_max - orig) * inv_dir;
  vec3 tmin = min(tmin_tmp, tmax_tmp);
  vec3 tmax = max(tmin_tmp, tmax_tmp);
  float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  return vec2(t0, t1);
}

void main(void) {
  // Step 1: Normalize the view ray
  vec3 ray_dir = normalize(vray_dir);

  // Step 2: Intersect the ray with the volume bounds to find the interval
  // along the ray overlapped by the volume.
  vec2 t_hit = intersect_box(transformed_eye, ray_dir);
  if (t_hit.x > t_hit.y) {
    discard;
  }
  // We don't want to sample voxels behind the eye if it's
  // inside the volume, so keep the starting point at or in front
  // of the eye
  t_hit.x = max(t_hit.x, 0.0);

  // Step 3: Compute the step size to march through the volume grid
  vec3 dt_vec = 1.0 / (vec3(volume_dims) * abs(ray_dir));
  float dt = dt_scale * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

  // Step 4: Starting from the entry point, march the ray through the volume
  // and sample it
  vec3 p = transformed_eye + t_hit.x * ray_dir;
  float alphasample;
  for (float t = t_hit.x; t < t_hit.y; t += dt) {
    // Step 4.1: Sample the volume, and color it by the transfer function.
    // Note that here we don't use the opacity from the transfer function,
    // and just use the sample value as the opacity
    // float val = texture(volume, p).r;
    // vec4 val_color = vec4(texture(transfer_fcn, vec2(val, 0.5)).rgb, val);
    vec4 val_color = sampleAs3DTexture(p + 0.5);
    val_color.a = 1.0 - pow(1.0 - val_color.a, dt_scale);

    // Step 4.2: Accumulate the color and opacity using the front-to-back
    // compositing equation
    alphasample = (1.0 - color.a) * val_color.a * alphaCorrection;
    color.rgb += alphasample * val_color.rgb;
    color.a += alphasample;
    // color.rgb = ;
    // color.a = 1.0;
    if (length(p) < star_radius) {
      color.rgb += starColor * (1.0 - color.a);
      color.a = 1.0;
      break;
    }

    // Optimization: break out of the loop when the color is near opaque
    if (color.a >= 0.95) {
      break;
    }
    p += ray_dir * dt;
  }
  // gl_FragColor = color;
}
