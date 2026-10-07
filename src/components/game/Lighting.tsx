"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { isHighQuality } from "@/game/quality";
import { currentHour } from "@/game/clock";
import { applyGroups, createAtmosphere, registerGlow, registerLamp, sampleAtmosphere } from "@/game/atmosphere";
import { useMats } from "@/game/materials";
import { luxuryMats } from "@/game/luxury";
import { windowGlass, gardenGlass } from "@/game/glass";
import { streetMaterials } from "./world/street/materials";
import { skyUniforms } from "./world/SkyDome";
import { postFx } from "./FilmGrade";

function DownLight({ z, hq }: { z: number; hq: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, z);
    return o;
  }, [z]);
  // the chandeliers' pools of light, dimmed and raised with the chandeliers themselves
  useLayoutEffect(() => (light.current ? registerLamp("chandeliers", light.current, hq ? 11 : 9) : undefined), [hq]);
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[0, 5.4, z]}
        target={target}
        angle={1.15}
        penumbra={1}
        distance={14}
        decay={1.4}
        color="#ffd2a0"
        castShadow={hq}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
    </>
  );
}

function FacadeWash({ x }: { x: number }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(x * 0.8, 7, 0);
    return o;
  }, [x]);
  useLayoutEffect(() => (light.current ? registerLamp("exterior", light.current, 30) : undefined), []);
  return (
    <>
      <primitive object={target} />
      <spotLight ref={light} position={[x, 0.15, 1.6]} target={target} angle={0.75} penumbra={0.8} distance={14} decay={1.6} color="#ffbf7a" />
    </>
  );
}

/** Where the sun's shadow camera looks: the middle of the building, from the street to the back wing. */
const SUN_TARGET = new THREE.Vector3(0, 0, -11);
const SUN_DISTANCE = 45;

/**
 * The time-of-day driver. Every frame it reads the restaurant's hour (real, or the debug hour), eases toward it so a
 * jump in debug time still glides, and when the hour has moved it re-samples the day curve and sets the sun, sky, fog,
 * ambient light, the six interior light groups, window glass, exposure, grade and bloom. Nothing is re-rendered by React.
 *
 * Nothing that casts a shadow moves (people don't cast them), so shadow maps are only redrawn when the sun has moved.
 */
function TimeOfDay() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const get = useThree((s) => s.get);
  const hq = isHighQuality();
  const m = useMats();
  const ref = useRef({
    atm: createAtmosphere(),
    shown: -1,
    sampled: -1,
    target: 12,
    lastRead: -10,
    bakeFrames: 0,
    bakedDir: new THREE.Vector3(),
  });

  useLayoutEffect(() => {
    const lux = luxuryMats();
    registerGlow("chandeliers", m.chandelierBulb);
    registerGlow("chandeliers", m.glassDim);
    if (!hq) registerGlow("chandeliers", m.crystal as THREE.MeshStandardMaterial);
    registerGlow("sconces", m.bulb);
    registerGlow("sconces", m.sconceShade);
    registerGlow("tableLamps", m.lampShade);
    registerGlow("tableLamps", m.flame);
    registerGlow("bar", m.barShade);
    registerGlow("ambient", lux.cove);
    registerGlow("exterior", m.glassWarm);
    registerGlow("exterior", m.lanternFlame);
    registerGlow("exterior", m.lanternShade);
  }, [m, hq]);

  useLayoutEffect(
    () => () => {
      get().gl.shadowMap.autoUpdate = true;
    },
    [get],
  );

  useFrame(({ gl, clock, scene }, dt) => {
    const state = ref.current;
    const t = clock.elapsedTime;
    // Reading the time zone is not free, so the real clock is checked twice a second.
    if (t - state.lastRead > 0.5 || state.shown < 0) {
      state.target = currentHour();
      state.lastRead = t;
    }
    if (state.shown < 0) state.shown = state.target;
    // Ease along the short way round the clock face (23:00 to 01:00 goes forward through midnight).
    let diff = state.target - state.shown;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    if (Math.abs(diff) < 1e-4) state.shown = state.target;
    else state.shown = (((state.shown + diff * (1 - Math.exp(-Math.min(dt, 0.1) / 0.45))) % 24) + 24) % 24;

    const a = state.atm;
    if (Math.abs(state.shown - state.sampled) > 1e-5) {
      state.sampled = state.shown;
      sampleAtmosphere(state.shown, a);

      const s = sun.current;
      if (s) {
        s.position.copy(SUN_TARGET).addScaledVector(a.dir, SUN_DISTANCE);
        s.target.position.copy(SUN_TARGET);
        s.target.updateMatrixWorld();
        s.intensity = a.sun;
        s.color.copy(a.sunColor);
        s.shadow.radius = a.shadowSoft;
      }
      const h = hemi.current;
      if (h) {
        h.intensity = a.hemi;
        h.color.copy(a.hemiSky);
        h.groundColor.copy(a.hemiGround);
      }
      scene.environmentIntensity = a.env;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(a.fog);
        scene.fog.near = a.fogNear;
        scene.fog.far = a.fogFar;
      }
      if (scene.background instanceof THREE.Color) scene.background.copy(a.horizon);

      skyUniforms.zenith.value.copy(a.zenith);
      skyUniforms.mid.value.copy(a.mid);
      skyUniforms.horizon.value.copy(a.horizon);
      skyUniforms.glow.value.copy(a.glow);
      skyUniforms.glowAmt.value = a.glowAmt;
      skyUniforms.sunDir.value.copy(a.sunDir);
      skyUniforms.sunDisc.value = THREE.MathUtils.smoothstep(a.sunEl, -1, 3) * 3;
      skyUniforms.stars.value = a.stars;

      applyGroups(a);
      windowGlass.opacity = a.glass;
      gardenGlass.opacity = a.glass * 1.2;
      // The neighbours' lit windows, shop glow and facade washes follow the street's own lights.
      const st = streetMaterials();
      (st.lit as THREE.MeshBasicMaterial).color.setScalar(0.35 + 0.65 * a.exterior);
      (st.glow as THREE.MeshBasicMaterial).opacity = a.exterior;
      (st.paint as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + 0.23 * a.exterior;

      const fx = postFx;
      if (fx.exposure) fx.exposure.uniforms.get("exposure")!.value = a.exposure;
      if (fx.grade) {
        fx.grade.uniforms.get("warm")!.value = a.warm;
        fx.grade.uniforms.get("cool")!.value = a.cool;
        fx.grade.uniforms.get("contrast")!.value = a.contrast;
      }
      if (fx.bloom) fx.bloom.intensity = a.bloom * (hq ? 1 : 0.9);

      // Redraw the shadows once the sun has moved about a quarter of a degree (a minute of real time).
      if (state.bakedDir.dot(a.dir) < 0.99999) {
        state.bakedDir.copy(a.dir);
        state.bakeFrames = Math.min(state.bakeFrames, 28);
      }
    }

    if (hq) {
      if (state.bakeFrames < 30) {
        state.bakeFrames++;
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
      }
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow={hq}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={5}
        shadow-camera-far={95}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

/** HDR image lighting for believable reflections, the sun (or moon), and soft shadow-casting lights under the chandeliers. */
export default function Lighting() {
  const hq = isHighQuality();
  return (
    <>
      <TimeOfDay />
      <Environment files="/hdri/lobby.exr" environmentIntensity={0.13} background={false} />
      {/* warm uplights washing the facade, the way grand cafés are lit at night */}
      {[-4.6, 4.6].map((x) => (
        <FacadeWash key={x} x={x} />
      ))}
      {/* chandelier pools of light that throw table and chair shadows on the marble */}
      {[-4.2, -9.2, -14.2].map((z) => (
        <DownLight key={z} z={z} hq={hq} />
      ))}
    </>
  );
}
