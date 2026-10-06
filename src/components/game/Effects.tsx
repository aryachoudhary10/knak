"use client";

import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { isHighQuality } from "@/game/quality";
import FilmGrade from "./FilmGrade";

/** Film look: ambient occlusion for contact shadows, a soft focus fall-off, glow on flames and bulbs, a graded film tone, vignette and fine grain. */
export default function Effects({ ao = true }: { ao?: boolean }) {
  const hq = isHighQuality();
  if (!hq || !ao) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.45} luminanceThreshold={1.1} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <FilmGrade />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="performance" aoRadius={0.9} distanceFalloff={0.6} intensity={2.6} color="#140b06" />
      {/* Sharp from arm's length to across the room; the far end and the street melt softly, like a fast lens. */}
      <DepthOfField worldFocusDistance={4.5} worldFocusRange={9} bokehScale={2.2} resolutionScale={0.5} />
      <Bloom mipmapBlur intensity={0.5} luminanceThreshold={1.1} luminanceSmoothing={0.25} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <FilmGrade />
      <Vignette offset={0.28} darkness={0.6} />
      <Noise opacity={0.022} premultiply />
      <SMAA />
    </EffectComposer>
  );
}
