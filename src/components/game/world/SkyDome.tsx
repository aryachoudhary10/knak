"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const fragment = /* glsl */ `
uniform vec3 zenith;
uniform vec3 mid;
uniform vec3 horizon;
uniform vec3 glow;
uniform float glowAmt;
uniform vec3 sunDir;
uniform float sunDisc;
uniform float stars;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float up = max(y, 0.0);
  // Three bands: the horizon, a middle band where sunsets turn pink and violet, and the zenith.
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, up));
  col = mix(col, zenith, smoothstep(0.12, 0.85, up));
  // Below the horizon the haze keeps the horizon colour, a touch darker, behind the rooftops.
  col = mix(col, horizon * 0.8, smoothstep(0.0, -0.15, y));

  // Warm glow on the sun's side of the sky, strongest low down, as at dawn and sunset.
  vec2 ground = normalize(d.xz + 1e-5);
  vec2 sunFlat = normalize(sunDir.xz + 1e-5);
  float side = pow(max(dot(ground, sunFlat), 0.0), 3.0);
  float low = exp(-max(y - min(sunDir.y, 0.0), 0.0) * 5.0);
  col = mix(col, glow, clamp(side * low * glowAmt, 0.0, 1.0) * 0.85);
  // A soft halo around the sun itself, and its disc when it is up.
  float mu = max(dot(d, sunDir), 0.0);
  col += glow * pow(mu, 48.0) * 0.6 * glowAmt;
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99965, 0.9999, mu) * sunDisc;

  // Stars: one random point in each small patch of sky, faint near the horizon where the city glow hides them.
  if (stars > 0.001 && y > 0.0) {
    vec3 cell = floor(d * 220.0);
    float r = hash(cell);
    if (r > 0.994) {
      vec3 f = fract(d * 220.0) - 0.5;
      float s = smoothstep(0.32, 0.0, length(f)) * (0.35 + 0.65 * hash(cell + 7.0));
      col += vec3(0.9, 0.93, 1.0) * s * stars * smoothstep(0.03, 0.3, y) * 1.4;
    }
  }
  // A little noise so the long gradients don't band on 8-bit screens.
  col += (hash(d * 1000.0) - 0.5) * 0.004;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export const skyUniforms = {
  zenith: { value: new THREE.Color() },
  mid: { value: new THREE.Color() },
  horizon: { value: new THREE.Color() },
  glow: { value: new THREE.Color() },
  glowAmt: { value: 0 },
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  sunDisc: { value: 0 },
  stars: { value: 0 },
};

/**
 * The sky over KNAK: a gradient dome painted from the hour (game/atmosphere.ts) instead of a fixed picture,
 * so the windows show dawn, a bright noon, an orange sunset, violet blue hour and a starry night.
 */
export default function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  // The dome travels with the camera, so it always sits at the far distance behind everything else.
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[300, 48, 24]} />
    </mesh>
  );
}
