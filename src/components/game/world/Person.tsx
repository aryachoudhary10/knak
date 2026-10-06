"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Character } from "@/lib/character";

const matCache = new Map<string, THREE.Material>();
export function mat(color: string, roughness = 0.8, sheen = false) {
  const key = `${color}-${roughness}-${sheen}`;
  let m = matCache.get(key);
  if (!m) {
    m = sheen
      ? new THREE.MeshPhysicalMaterial({ color, roughness, sheen: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.4) })
      : new THREE.MeshStandardMaterial({ color, roughness });
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Torso from hips to shoulders, narrower at the waist. Height 0.56. */
const torsoGeo = (female: boolean) =>
  geo(`torso${female}`, () => {
    const g = new THREE.LatheGeometry(
      female
        ? [v2(0, 0), v2(0.15, 0), v2(0.165, 0.06), v2(0.13, 0.2), v2(0.15, 0.33), v2(0.155, 0.42), v2(0.16, 0.5), v2(0.1, 0.56), v2(0, 0.57)]
        : [v2(0, 0), v2(0.145, 0), v2(0.15, 0.08), v2(0.145, 0.22), v2(0.165, 0.36), v2(0.18, 0.47), v2(0.165, 0.53), v2(0.09, 0.57), v2(0, 0.58)],
      24,
    );
    g.scale(1, 1, 0.68);
    return g;
  });
const limbGeo = (len: number, r0: number, r1: number) => geo(`limb${len}-${r0}-${r1}`, () => new THREE.CylinderGeometry(r1, r0, len, 12).translate(0, -len / 2, 0));
const skirtGeo = () => geo("skirt", () => new THREE.CylinderGeometry(0.16, 0.27, 0.62, 24, 1, true).translate(0, -0.31, 0));
const shoeGeo = () => geo("shoe", () => new THREE.SphereGeometry(0.06, 12, 8).scale(0.8, 0.5, 1.9));

export type Outfit = "casual" | "dress" | "waiter" | "host" | "barista";

type PersonProps = {
  c: Character;
  pose: "sit" | "stand";
  seed?: number;
  walking?: boolean;
  tray?: boolean;
  outfit?: Outfit;
  /** Returns 0..1 how much the right arm should be raised in a wave. */
  wave?: () => number;
  /** Returns 0..1 how much the person is talking (head and hand movement). */
  talk?: () => number;
};

/** Stylised-realistic person made of smooth primitives, with simple jointed animation. */
export function Person({ c, pose, seed = 0, walking = false, tray = false, outfit = "casual", wave, talk }: PersonProps) {
  const female = c.hairStyle === "long" || c.hairStyle === "bun";
  const skin = mat(c.skin, 0.6);
  const top = mat(c.top, 0.85, true);
  const bottom = mat(c.bottom, 0.8, true);
  const shoes = mat("#141210", 0.35);
  const hairM = mat(c.hair, 0.55);
  const white = mat("#f4f1ea", 0.7, true);
  const black = mat("#141416", 0.7, true);

  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  const sit = pose === "sit";
  const hipY = sit ? 0.5 : 0.92;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 20;
    const w = wave ? wave() : 0;
    const k = talk ? talk() : 0;
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.5) * 0.008;
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.33) * 0.4 + Math.sin(t * 1.3) * 0.05;
      head.current.rotation.x = (sit ? 0.1 : 0) + Math.sin(t * 0.5) * 0.05 + k * Math.sin(t * 9) * 0.04;
      if (w > 0 || k > 0) head.current.rotation.y *= 1 - Math.max(w, k);
    }
    if (armR.current && foreR.current) {
      if (w > 0) {
        armR.current.rotation.set(0, 0, -2.5 * w);
        foreR.current.rotation.set(0, 0, -0.6 * w + Math.sin(t * 9) * 0.35 * w);
      } else if (sit) {
        const sip = Math.max(0, Math.sin(t * 0.45)) ** 6;
        armR.current.rotation.set(-0.5 - sip * 0.6, 0, -0.12);
        foreR.current.rotation.set(-1.0 - sip * 0.9, 0, 0);
      } else if (tray) {
        armR.current.rotation.set(-0.15, 0, -0.1);
        foreR.current.rotation.set(-1.45, 0, 0);
      } else {
        armR.current.rotation.set(walking ? -Math.sin(t * 6.5) * 0.35 : k * Math.sin(t * 2.3) * 0.15, 0, -0.08);
        foreR.current.rotation.set(-0.15 - k * (0.6 + Math.sin(t * 3.1) * 0.3), 0, 0);
      }
    }
    if (armL.current) {
      armL.current.rotation.x = sit ? -0.55 : walking ? Math.sin(t * 6.5) * 0.35 : 0;
    }
    if (walking && legL.current && legR.current) {
      const s = Math.sin(t * 6.5) * 0.42;
      legL.current.rotation.x = s;
      legR.current.rotation.x = -s;
    }
  });

  const legTopR = 0.075;
  const shirt = outfit === "waiter" || outfit === "barista" ? white : outfit === "host" ? black : top;
  const pants = outfit === "waiter" || outfit === "barista" || outfit === "host" ? black : bottom;

  return (
    <group>
      {/* legs */}
      {[-1, 1].map((s) => (
        <group key={s} ref={s < 0 ? legL : legR} position={[s * 0.09, hipY, 0]}>
          {sit ? (
            <>
              <group rotation={[-Math.PI / 2, 0, 0]}>
                <mesh geometry={limbGeo(0.44, legTopR, 0.06)} material={pants} />
              </group>
              <group position={[0, 0, 0.42]}>
                <mesh geometry={limbGeo(0.44, 0.058, 0.045)} material={pants} />
                <mesh position={[0, -0.46, 0.06]} geometry={shoeGeo()} material={shoes} />
              </group>
            </>
          ) : (
            <>
              <mesh geometry={limbGeo(0.46, legTopR, 0.058)} material={pants} castShadow />
              <group position={[0, -0.46, 0]}>
                <mesh geometry={limbGeo(0.42, 0.056, 0.042)} material={pants} />
                <mesh position={[0, -0.43, 0.05]} geometry={shoeGeo()} material={shoes} />
              </group>
            </>
          )}
        </group>
      ))}

      {/* skirt for dresses */}
      {(outfit === "dress" || (outfit === "host" && female)) && !sit && (
        <mesh position={[0, hipY + 0.05, 0]} geometry={skirtGeo()} material={outfit === "host" ? black : top} castShadow />
      )}

      {/* torso */}
      <group ref={torso} position={[0, hipY - 0.03, 0]}>
        <mesh geometry={torsoGeo(female)} material={shirt} castShadow />
        {outfit === "waiter" && (
          <>
            {/* black waistcoat and long white apron */}
            <mesh position={[0, 0.3, 0.02]} scale={[1.03, 1, 1.05]} geometry={torsoGeo(false)} material={black} />
            <mesh position={[0, -0.2, 0.11]} material={white}>
              <boxGeometry args={[0.36, 0.7, 0.02]} />
            </mesh>
          </>
        )}
        {outfit === "barista" && (
          <mesh position={[0, 0.05, 0.11]} material={mat("#3a2418", 0.8)}>
            <boxGeometry args={[0.32, 0.55, 0.02]} />
          </mesh>
        )}
        {(outfit === "waiter" || outfit === "barista") && (
          <mesh position={[0, 0.52, 0.1]} material={black} scale={[1.6, 0.8, 0.6]}>
            <octahedronGeometry args={[0.03, 0]} />
          </mesh>
        )}
      </group>

      {/* arms: shoulder joint, upper arm, elbow joint, forearm, hand */}
      {[-1, 1].map((s) => (
        <group key={s} ref={s < 0 ? armL : armR} position={[s * (female ? 0.18 : 0.2), hipY + 0.5, 0]}>
          <mesh material={shirt}>
            <sphereGeometry args={[0.065, 12, 10]} />
          </mesh>
          <mesh geometry={limbGeo(0.29, 0.058, 0.045)} material={shirt} castShadow />
          <group ref={s > 0 ? foreR : undefined} position={[0, -0.29, 0]} rotation={sit && s < 0 ? [-1.0, 0, 0] : [0, 0, 0]}>
            <mesh geometry={limbGeo(0.25, 0.045, 0.036)} material={outfit === "waiter" || outfit === "barista" ? white : shirt} />
            <mesh position={[0, -0.29, 0]} material={skin} scale={[0.8, 1.2, 0.5]}>
              <sphereGeometry args={[0.045, 10, 8]} />
            </mesh>
            {s > 0 && tray && (
              <group position={[0, -0.3, 0.05]} rotation={[1.45, 0, 0]}>
                <mesh material={mat("#c9cdd0", 0.25)}>
                  <cylinderGeometry args={[0.2, 0.2, 0.012, 32]} />
                </mesh>
                <mesh position={[0.05, 0.06, 0]}>
                  <cylinderGeometry args={[0.03, 0.022, 0.11, 12]} />
                  <meshPhysicalMaterial color="#6b1020" transparent opacity={0.85} roughness={0.05} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      ))}

      {/* neck and head */}
      <mesh position={[0, hipY + 0.6, 0]} material={skin}>
        <cylinderGeometry args={[0.045, 0.052, 0.1, 12]} />
      </mesh>
      <group ref={head} position={[0, hipY + 0.76, 0]}>
        <mesh material={skin} scale={[0.86, 1.08, 0.95]} castShadow>
          <sphereGeometry args={[0.11, 24, 18]} />
        </mesh>
        {/* jaw */}
        <mesh position={[0, -0.05, 0.02]} material={skin} scale={[0.75, 0.6, 0.85]}>
          <sphereGeometry args={[0.1, 16, 12]} />
        </mesh>
        {/* nose */}
        <mesh position={[0, -0.005, 0.105]} rotation={[0.3, 0, 0]} material={skin}>
          <coneGeometry args={[0.014, 0.04, 8]} />
        </mesh>
        {/* eyes, brows, lips, ears */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.036, 0.022, 0.092]} material={mat("#f6f2ea", 0.3)} scale={[1.2, 0.8, 0.6]}>
              <sphereGeometry args={[0.013, 10, 8]} />
            </mesh>
            <mesh position={[s * 0.036, 0.022, 0.1]} material={mat("#2a1a10", 0.2)}>
              <sphereGeometry args={[0.0075, 8, 6]} />
            </mesh>
            <mesh position={[s * 0.037, 0.045, 0.096]} rotation={[0, 0, s * -0.12]} material={hairM}>
              <boxGeometry args={[0.03, 0.006, 0.008]} />
            </mesh>
            <mesh position={[s * 0.095, 0.0, 0]} material={skin} scale={[0.4, 1, 0.7]}>
              <sphereGeometry args={[0.025, 8, 8]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.05, 0.088]} material={mat(female ? "#a5474a" : "#9a5a50", 0.5)} scale={[1.6, 0.45, 0.6]}>
          <sphereGeometry args={[0.014, 10, 8]} />
        </mesh>
        <Hair c={c} m={hairM} />
      </group>
    </group>
  );
}

function Hair({ c, m }: { c: Character; m: THREE.Material }) {
  if (c.hairStyle === "none") return null;
  return (
    <group>
      <mesh position={[0, 0.03, -0.012]} material={m} scale={[0.92, 1.0, 1.02]}>
        <sphereGeometry args={[0.118, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.75]} />
      </mesh>
      {c.hairStyle === "short" && (
        <mesh position={[0, -0.02, -0.05]} material={m} scale={[0.9, 0.8, 0.7]}>
          <sphereGeometry args={[0.11, 16, 10]} />
        </mesh>
      )}
      {c.hairStyle === "long" && (
        <mesh position={[0, -0.13, -0.05]} material={m} scale={[1, 1, 0.55]}>
          <capsuleGeometry args={[0.1, 0.22, 6, 16]} />
        </mesh>
      )}
      {c.hairStyle === "bun" && (
        <mesh position={[0, 0.06, -0.12]} material={m}>
          <sphereGeometry args={[0.055, 14, 12]} />
        </mesh>
      )}
    </group>
  );
}
