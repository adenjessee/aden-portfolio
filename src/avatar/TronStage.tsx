import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useMemo } from "react";
import { AdditiveBlending, Color, ShaderMaterial } from "three";

const CYAN = new Color("#28e1ff");

/**
 * A grid floor drawn in the shader: anti-aliased lines at two scales, fading into the dark with
 * distance, so the avatar stands on the GridSchool grid instead of in a void.
 */
function GridFloor() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: CYAN } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying vec3 vWorld;
          float lines(vec2 p, float scale, float width) {
            vec2 g = abs(fract(p / scale - 0.5) - 0.5) / fwidth(p / scale);
            return 1.0 - min(min(g.x, g.y) / width, 1.0);
          }
          void main() {
            vec2 p = vWorld.xz;
            float fine = lines(p, 0.5, 1.0) * 0.35;
            float major = lines(p, 2.0, 1.4);
            float fade = smoothstep(9.0, 0.6, length(p));
            float glow = max(fine, major) * fade;
            gl_FragColor = vec4(uColor * glow * 1.6, glow);
          }
        `,
      }),
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} material={material}>
      <planeGeometry args={[24, 24]} />
    </mesh>
  );
}

/**
 * Lighting, floor, and post-processing. The bloom threshold sits at 1.0: anime (MToon) shading never
 * exceeds it, so only HDR emissive parts glow, meaning the suit lines (boosted in loadVrm) and the grid.
 */
export function TronStage() {
  return (
    <>
      <color attach="background" args={["#010306"]} />
      <fog attach="fog" args={["#010306", 4, 12]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.0} color="#e8f6ff" />
      {/* Rim light from behind: the cyan edge that separates a dark suit from a dark room. */}
      <directionalLight position={[-1.2, 2.2, -2.5]} intensity={0.9} color="#28e1ff" />
      <directionalLight position={[1.4, 1.6, -2.2]} intensity={0.5} color="#7a5cff" />
      <GridFloor />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.05} intensity={1.1} radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
