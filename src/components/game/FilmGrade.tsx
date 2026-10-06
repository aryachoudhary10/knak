"use client";

import { useMemo } from "react";
import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragment = /* glsl */ `
uniform float strength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Split toning: cool, slightly teal shadows and warm amber highlights, as on a graded film print.
  c *= mix(vec3(0.9, 0.97, 1.04), vec3(1.05, 1.0, 0.91), smoothstep(0.04, 0.65, l));
  // Gentle S-curve for depth, with blacks lifted to a soft warm velvet instead of digital zero.
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
  c = mix(vec3(0.022, 0.016, 0.02), vec3(0.985, 0.97, 0.94), c);
  outputColor = vec4(mix(inputColor.rgb, c, strength), inputColor.a);
}
`;

class FilmGradeEffect extends Effect {
  constructor(strength: number) {
    super("FilmGrade", fragment, { uniforms: new Map([["strength", new Uniform(strength)]]) });
  }
}

/** The colour grade of a film print, applied after tone mapping in the same pass as the vignette. */
export default function FilmGrade({ strength = 1 }: { strength?: number }) {
  const effect = useMemo(() => new FilmGradeEffect(strength), [strength]);
  return <primitive object={effect} dispose={null} />;
}
