"use client";

import { useEffect, useMemo } from "react";
import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";

const fragment = /* glsl */ `
uniform float strength;
uniform float warm;
uniform float cool;
uniform float contrast;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Split toning: cool shadows and warm highlights, as on a graded film print. How cool and how warm follows the hour:
  // nearly neutral at noon, amber highlights at golden hour, blue shadows at blue hour.
  vec3 shadows = mix(vec3(1.0), vec3(0.9, 0.97, 1.04), cool);
  vec3 highs = mix(vec3(1.0), vec3(1.05, 1.0, 0.91), warm);
  c *= mix(shadows, highs, smoothstep(0.04, 0.65, l));
  // Gentle S-curve for depth, with blacks lifted to a soft warm velvet instead of digital zero.
  c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
  c = mix(vec3(0.022, 0.016, 0.02), vec3(0.985, 0.97, 0.94), c);
  outputColor = vec4(mix(inputColor.rgb, c, strength), inputColor.a);
}
`;

export class FilmGradeEffect extends Effect {
  constructor(strength: number) {
    super("FilmGrade", fragment, {
      uniforms: new Map([
        ["strength", new Uniform(strength)],
        ["warm", new Uniform(1)],
        ["cool", new Uniform(1)],
        ["contrast", new Uniform(0.35)],
      ]),
    });
  }
}

const exposureFragment = /* glsl */ `
uniform float exposure;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
}
`;

/** Camera exposure in linear light, before the tone curve, so the hour can open or close the lens a little. */
export class ExposureEffect extends Effect {
  constructor() {
    super("Exposure", exposureFragment, { blendFunction: BlendFunction.SET, uniforms: new Map([["exposure", new Uniform(1)]]) });
  }
}

/** The live post effects the time-of-day driver adjusts (exposure, grade, bloom). */
export const postFx = {
  grade: null as FilmGradeEffect | null,
  exposure: null as ExposureEffect | null,
  bloom: null as { intensity: number } | null,
};

/** The colour grade of a film print, applied after tone mapping in the same pass as the vignette. */
export default function FilmGrade({ strength = 1 }: { strength?: number }) {
  const effect = useMemo(() => new FilmGradeEffect(strength), [strength]);
  useEffect(() => {
    postFx.grade = effect;
    return () => {
      if (postFx.grade === effect) postFx.grade = null;
    };
  }, [effect]);
  return <primitive object={effect} dispose={null} />;
}

export function Exposure() {
  const effect = useMemo(() => new ExposureEffect(), []);
  useEffect(() => {
    postFx.exposure = effect;
    return () => {
      if (postFx.exposure === effect) postFx.exposure = null;
    };
  }, [effect]);
  return <primitive object={effect} dispose={null} />;
}
