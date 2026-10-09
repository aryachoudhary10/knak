"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { isHighQuality } from "@/game/quality";

/** Realistic people from the Microsoft Rocketbox library (MIT), converted to compressed GLB in public/models. */
export type Gender = "female" | "male";
export type Clip = "sit_idle" | "sit_idle_2" | "sit_idle_3" | "sit_talk" | "stand_idle" | "talk" | "wave" | "invite_sit" | "walk" | "drink";

export const AVATARS = {
  hostess_amelie: "female",
  cashier_louis: "male",
  waiter_theo: "male",
  barista_nisha: "female",
  guest_f1: "female",
  guest_f2: "female",
  guest_f3: "female",
  guest_f4: "female",
  guest_m1: "male",
  guest_m2: "male",
  guest_m3: "male",
  guest_m4: "male",
} as const satisfies Record<string, Gender>;
export type AvatarId = keyof typeof AVATARS;

export const GUEST_AVATARS: AvatarId[] = ["guest_f1", "guest_m2", "guest_f3", "guest_m1", "guest_f2", "guest_m3", "guest_f4", "guest_m4"];

/** Walk speed of the in-place walk clip, so feet don't slide. */
export const WALK_SPEED: Record<Gender, number> = { female: 1.21, male: 1.01 };

const frustum = new THREE.Frustum();
const view = new THREE.Matrix4();

const avatarUrl = (id: AvatarId) => `/models/people/${id}.glb`;
const animUrl = (g: Gender) => `/models/anims/${g}.glb`;

type HumanProps = {
  avatar: AvatarId;
  /** Called every frame; returns the clip that should be playing. Changes cross-fade. */
  pick: () => Clip;
  /** Spreads idle loops so neighbours don't move in sync. */
  seed?: number;
};

export function Human({ avatar, pick, seed = 0 }: HumanProps) {
  const gender = AVATARS[avatar];
  const { scene } = useGLTF(avatarUrl(avatar), false, true);
  const { animations } = useGLTF(animUrl(gender), false, true);

  const model = useMemo(() => {
    const root = cloneSkinned(scene);
    const hq = isHighQuality();
    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      // Shadows are baked once (see Lighting), so moving people don't cast them.
      mesh.castShadow = false;
      mesh.receiveShadow = hq;
      // Skinned bounds come from the bind pose, so culling is done per person in the frame loop instead.
      mesh.frustumCulled = false;
    });
    return root;
  }, [scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const current = useRef<{ name: Clip; action: THREE.AnimationAction } | null>(null);
  const root = useRef<THREE.Group>(null);
  const pending = useRef(0);
  const bounds = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 1.2), []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __humans?: unknown[] };
    (w.__humans ??= []).push({ avatar, model, mixer, current });
  }, [avatar, model, mixer]);

  useEffect(
    () => () => {
      // Forget the playing clip too, so a remount (e.g. React's dev double-mount) starts it again.
      mixer.stopAllAction();
      current.current = null;
    },
    [mixer],
  );

  useFrame(({ camera }, dt) => {
    const holder = root.current;
    if (!holder) return;
    // People off screen are hidden and not animated; people far away animate at half rate.
    bounds.center.set(0, 0.9, 0);
    holder.localToWorld(bounds.center);
    frustum.setFromProjectionMatrix(view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    holder.visible = frustum.intersectsSphere(bounds);
    pending.current += Math.min(dt, 0.1);
    if (!holder.visible) return;
    const far = bounds.center.distanceToSquared(camera.position) > 12 * 12;
    if (far && pending.current < 1 / 30) return;

    const name = pick();
    if (current.current?.name !== name) {
      const clip = animations.find((a) => a.name === name);
      if (clip) {
        const action = mixer.clipAction(clip);
        const once = name === "wave" || name === "invite_sit";
        action.reset();
        action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = once;
        if (!current.current) action.time = seed * clip.duration;
        action.play();
        if (current.current) action.crossFadeFrom(current.current.action, 0.45, true);
        current.current = { name, action };
      }
    }
    mixer.update(Math.min(pending.current, 0.1));
    pending.current = 0;
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
}

/** Start fetching these people (all of them by default) and both sets of movements. */
export function preloadPeople(ids = Object.keys(AVATARS) as AvatarId[]) {
  (["female", "male"] as Gender[]).forEach((g) => useGLTF.preload(animUrl(g), false, true));
  ids.forEach((id) => useGLTF.preload(avatarUrl(id), false, true));
}
