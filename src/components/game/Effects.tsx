"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { isHighQuality } from "@/game/quality";

/** Film look: ambient occlusion for contact shadows, glow on flames and bulbs, filmic tone and vignette. */
export default function Effects({ ao = true }: { ao?: boolean }) {
  const hq = isHighQuality();
  if (!hq || !ao) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.45} luminanceThreshold={1.1} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="performance" aoRadius={0.9} distanceFalloff={0.6} intensity={2.6} color="#140b06" />
      <Bloom mipmapBlur intensity={0.5} luminanceThreshold={1.1} luminanceSmoothing={0.25} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.6} />
      <SMAA />
    </EffectComposer>
  );
}
