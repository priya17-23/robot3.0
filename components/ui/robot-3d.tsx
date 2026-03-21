"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Move3D } from "lucide-react";

type Robot3DProps = {
  title?: string;
  subtitle?: string;
  /** When true, head smoothly looks at your cursor */
  followCursor?: boolean;
  /** When true, scene auto-rotates (360°). Disable to keep body constant. */
  autoRotate?: boolean;
  /** When true, user can drag to orbit the whole robot */
  enableControls?: boolean;
  /** Image that defines the Transformer face look */
  headImageSrc?: string;
  /**
   * Limit head yaw in degrees for realism.
   * - Set to a number like 140 for "human/robot neck" limits
   * - Set to null for full 360° yaw
   */
  headYawLimitDeg?: number | null;
  /** Use the image as a decorative face decal (optional) */
  showFaceDecal?: boolean;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function TransformerRobot({
  followCursor,
  headImageSrc,
  headYawLimitDeg,
  showFaceDecal,
}: {
  followCursor: boolean;
  headImageSrc: string;
  headYawLimitDeg: number | null;
  showFaceDecal: boolean;
}) {
  const root = React.useRef<THREE.Group>(null);
  const headPivot = React.useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const texture = useTexture(headImageSrc);
  React.useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  const targetQuat = React.useMemo(() => new THREE.Quaternion(), []);
  const targetEuler = React.useMemo(() => new THREE.Euler(), []);

  useFrame((_, delta) => {
    if (!headPivot.current) return;

    // Cursor mapping: yaw + pitch.
    // pointer.x/y are in [-1, 1]
    const yawLimitRad =
      headYawLimitDeg == null ? Math.PI : THREE.MathUtils.degToRad(headYawLimitDeg);

    const yaw = followCursor ? pointer.x * yawLimitRad : 0;
    const pitch = followCursor
      ? THREE.MathUtils.clamp(-pointer.y * 0.6, -0.7, 0.7) // about [-40°, 40°]
      : 0;

    targetEuler.set(pitch, yaw, 0, "YXZ");
    targetQuat.setFromEuler(targetEuler);

    // Smooth motion (frame-rate independent)
    const t = 1 - Math.pow(0.001, delta); // ~snappy but smooth
    headPivot.current.quaternion.slerp(targetQuat, t);

    // Subtle breathing/idle
    if (root.current) {
      root.current.position.y = Math.sin(performance.now() / 900) * 0.03;
    }
  });

  return (
    <group ref={root} position={[0, -0.1, 0]}>
      {/* Body stays constant (does NOT follow cursor) */}
      <group>
        {/* Torso core */}
        <mesh castShadow receiveShadow position={[0, -1.15, 0]}>
          <boxGeometry args={[1.55, 1.2, 0.9]} />
          <meshStandardMaterial color="#0b1220" metalness={0.65} roughness={0.32} />
        </mesh>

        {/* Chest plate */}
        <mesh castShadow receiveShadow position={[0, -1.05, 0.46]}>
          <boxGeometry args={[1.35, 0.9, 0.12]} />
          <meshStandardMaterial color="#020617" metalness={0.85} roughness={0.18} />
        </mesh>

        {/* Energon core glow */}
        <mesh position={[0, -1.05, 0.55]}>
          <circleGeometry args={[0.18, 48]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={4}
            metalness={0.1}
            roughness={0.2}
          />
        </mesh>

        {/* Shoulder plates */}
        <mesh castShadow receiveShadow position={[-0.95, -0.75, 0]}>
          <boxGeometry args={[0.55, 0.55, 0.8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.95, -0.75, 0]}>
          <boxGeometry args={[0.55, 0.55, 0.8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* Neck base (static) */}
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.3, 0.38, 0.55, 32]} />
          <meshStandardMaterial color="#0b1220" metalness={0.55} roughness={0.35} />
        </mesh>
      </group>

      {/* Head pivot rotates; body remains constant */}
      <group ref={headPivot} position={[0, 0.05, 0]}>
        {/* Head (more "Transformer" angular helmet + face) */}
        <group>
          {/* Side ear modules / comms */}
          <mesh castShadow receiveShadow position={[-0.78, 0.18, 0]} rotation={[0, 0.1, 0]}>
            <boxGeometry args={[0.26, 0.42, 0.46]} />
            <meshStandardMaterial color="#0b1220" metalness={0.9} roughness={0.22} envMapIntensity={1.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.78, 0.18, 0]} rotation={[0, -0.1, 0]}>
            <boxGeometry args={[0.26, 0.42, 0.46]} />
            <meshStandardMaterial color="#0b1220" metalness={0.9} roughness={0.22} envMapIntensity={1.2} />
          </mesh>

          
          {/* Helmet */}
          <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.72, 64, 64]} />
            <meshStandardMaterial
              color="#11324d"
              metalness={0.88}
              roughness={0.14}
              envMapIntensity={1.35}
            />
          </mesh>

          {/* Forehead central plate (command/core unit vibe) */}
          <mesh castShadow receiveShadow position={[0, 0.42, 0.42]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.34, 0.28, 0.12]} />
            <meshStandardMaterial color="#0b2136" metalness={0.95} roughness={0.18} envMapIntensity={1.5} />
          </mesh>
          <mesh position={[0, 0.42, 0.49]} rotation={[-0.35, 0, 0]}>
            <circleGeometry args={[0.06, 24]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={3.2}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>

          {/* Helmet plates (layered armor feel) */}
          <mesh castShadow receiveShadow position={[0, 0.32, 0.38]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.72, 0.26, 0.12]} />
            <meshStandardMaterial color="#0b2136" metalness={0.92} roughness={0.18} envMapIntensity={1.35} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.36, 0.2, 0.42]} rotation={[0.05, 0.25, 0.05]}>
            <boxGeometry args={[0.28, 0.38, 0.12]} />
            <meshStandardMaterial color="#0b2136" metalness={0.92} roughness={0.18} envMapIntensity={1.35} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.36, 0.2, 0.42]} rotation={[0.05, -0.25, -0.05]}>
            <boxGeometry args={[0.28, 0.38, 0.12]} />
            <meshStandardMaterial color="#0b2136" metalness={0.92} roughness={0.18} envMapIntensity={1.35} />
          </mesh>

          {/* Extra layered side plates */}
          <mesh castShadow receiveShadow position={[-0.54, 0.05, 0.22]} rotation={[0.08, 0.45, 0.02]}>
            <boxGeometry args={[0.22, 0.44, 0.12]} />
            <meshStandardMaterial color="#0f2a44" metalness={0.9} roughness={0.2} envMapIntensity={1.25} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.54, 0.05, 0.22]} rotation={[0.08, -0.45, -0.02]}>
            <boxGeometry args={[0.22, 0.44, 0.12]} />
            <meshStandardMaterial color="#0f2a44" metalness={0.9} roughness={0.2} envMapIntensity={1.25} />
          </mesh>

          {/* Battle-worn paint / sparks decals (stylized like the image) */}
          <mesh position={[-0.38, 0.38, 0.63]} rotation={[-0.25, 0.35, 0.1]}>
            <planeGeometry args={[0.42, 0.22]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.22} toneMapped={false} />
          </mesh>
          <mesh position={[0.34, 0.12, 0.64]} rotation={[-0.05, -0.25, -0.1]}>
            <planeGeometry args={[0.36, 0.18]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.18} toneMapped={false} />
          </mesh>
          <mesh position={[0.02, -0.05, 0.66]} rotation={[0.1, 0, 0]}>
            <planeGeometry args={[0.55, 0.22]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.12} toneMapped={false} />
          </mesh>

          {/* Jaw/chin block */}
          <mesh castShadow receiveShadow position={[0, -0.18, 0.22]}>
            <boxGeometry args={[0.62, 0.28, 0.52]} />
            <meshStandardMaterial
              color="#0b1220"
              metalness={0.82}
              roughness={0.2}
              envMapIntensity={1.2}
            />
          </mesh>

          {/* Face plate */}
          <mesh castShadow receiveShadow position={[0, 0.12, 0.5]}>
            <boxGeometry args={[0.78, 0.52, 0.12]} />
            <meshStandardMaterial
              color="#020617"
              metalness={0.95}
              roughness={0.1}
              envMapIntensity={1.6}
            />
          </mesh>

          {/* 3D facial features (eyes, nose, mouth, cheek + brow) */}
          <group position={[0, 0.1, 0.62]}>
            {/* Brow ridge */}
            <mesh castShadow receiveShadow position={[0, 0.22, -0.08]}>
              <boxGeometry args={[0.62, 0.12, 0.18]} />
              <meshStandardMaterial color="#0b1220" metalness={0.85} roughness={0.22} />
            </mesh>

            {/* Cheek plates */}
            <mesh castShadow receiveShadow position={[-0.25, 0.02, -0.1]} rotation={[0, 0.12, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.2} />
            </mesh>
            <mesh castShadow receiveShadow position={[0.25, 0.02, -0.1]} rotation={[0, -0.12, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.2} />
            </mesh>

            
            {/* Eyebrows */}
            <mesh castShadow receiveShadow position={[-0.22, 0.25, 0.08]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.18, 0.06, 0.08]} />
              <meshStandardMaterial
                color="#f8fafc"
                metalness={0.3}
                roughness={0.4}
                envMapIntensity={0.8}
              />
            </mesh>
            <mesh castShadow receiveShadow position={[0.22, 0.25, 0.08]} rotation={[0, 0, -0.1]}>
              <boxGeometry args={[0.18, 0.06, 0.08]} />
              <meshStandardMaterial
                color="#f8fafc"
                metalness={0.3}
                roughness={0.4}
                envMapIntensity={0.8}
              />
            </mesh>
            
            {/* Enhanced Lips and Mouth */}
            {/* Upper lip */}
            <mesh castShadow receiveShadow position={[0, -0.15, 0.08]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.36, 0.08, 0.12]} />
              <meshStandardMaterial
                color="#f8fafc"
                metalness={0.3}
                roughness={0.4}
                envMapIntensity={0.8}
              />
            </mesh>
            
            {/* Lower lip */}
            <mesh castShadow receiveShadow position={[0, -0.22, 0.06]} rotation={[-0.1, 0, 0]}>
              <boxGeometry args={[0.32, 0.06, 0.1]} />
              <meshStandardMaterial
                color="#f1f5f9"
                metalness={0.3}
                roughness={0.4}
                envMapIntensity={0.8}
              />
            </mesh>
            
            {/* Lip separation line */}
            <mesh position={[0, -0.18, 0.08]}>
              <boxGeometry args={[0.28, 0.01, 0.02]} />
              <meshStandardMaterial
                color="#e2e8f0"
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>
            
            {/* Mouth corners (depth) */}
            <mesh position={[-0.18, -0.18, 0.04]}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial
                color="#cbd5e1"
                roughness={0.5}
                metalness={0.2}
              />
            </mesh>
            <mesh position={[0.18, -0.18, 0.04]}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial
                color="#cbd5e1"
                roughness={0.5}
                metalness={0.2}
              />
            </mesh>
            
            {/* Inner mouth glow */}
            <mesh position={[0, -0.18, 0.02]}>
              <circleGeometry args={[0.12, 24]} />
              <meshBasicMaterial 
                color="#ffffff" 
                transparent 
                opacity={0.4} 
                toneMapped={false} 
              />
            </mesh>

            {/* Panel lines (seams) */}
            <mesh position={[0, 0.02, -0.16]}>
              <boxGeometry args={[0.62, 0.01, 0.02]} />
              <meshStandardMaterial color="#020617" metalness={0.2} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.08, -0.16]}>
              <boxGeometry args={[0.48, 0.01, 0.02]} />
              <meshStandardMaterial color="#020617" metalness={0.2} roughness={0.9} />
            </mesh>

            {/* Enhanced Eye sockets with depth */}
            <mesh castShadow receiveShadow position={[-0.22, 0.12, -0.02]}>
              <boxGeometry args={[0.24, 0.16, 0.14]} />
              <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.18} />
            </mesh>
            <mesh castShadow receiveShadow position={[0.22, 0.12, -0.02]}>
              <boxGeometry args={[0.24, 0.16, 0.14]} />
              <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.18} />
            </mesh>

            {/* Enhanced Eyes with iris and pupil */}
            <group position={[-0.22, 0.12, 0.08]}>
              {/* Outer eye white */}
              <mesh>
                <sphereGeometry args={[0.06, 32, 32]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.05} />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.02]}>
                <sphereGeometry args={[0.04, 24, 24]} />
                <meshStandardMaterial color="#1e40af" roughness={0.2} metalness={0.1} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.04]}>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
              </mesh>
              {/* Eye glow */}
              <mesh position={[0, 0, 0.05]}>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ef4444"
                  emissiveIntensity={8}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
            </group>
            
            <group position={[0.22, 0.12, 0.08]}>
              {/* Outer eye white */}
              <mesh>
                <sphereGeometry args={[0.06, 32, 32]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.05} />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.02]}>
                <sphereGeometry args={[0.04, 24, 24]} />
                <meshStandardMaterial color="#1e40af" roughness={0.2} metalness={0.1} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.04]}>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
              </mesh>
              {/* Eye glow */}
              <mesh position={[0, 0, 0.05]}>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ef4444"
                  emissiveIntensity={8}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
            </group>

            {/* Enhanced eye glow halos */}
            <mesh position={[-0.22, 0.12, 0.09]}>
              <circleGeometry args={[0.12, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.18} toneMapped={false} />
            </mesh>
            <mesh position={[0.22, 0.12, 0.09]}>
              <circleGeometry args={[0.12, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.18} toneMapped={false} />
            </mesh>
          </group>

          {/* Optional: your reference image as a subtle decal (front only) */}
          {showFaceDecal ? (
            <mesh position={[0, 0.12, 0.575]}>
              <planeGeometry args={[0.9, 0.72]} />
              <meshBasicMaterial map={texture} transparent opacity={0.25} toneMapped={false} />
            </mesh>
          ) : null}

          
          {/* Eyes */}
          <mesh position={[-0.22, 0.18, 0.58]}>
            <sphereGeometry args={[0.075, 24, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={4}
              roughness={0.2}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0.22, 0.18, 0.58]}>
            <sphereGeometry args={[0.075, 24, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={4}
              roughness={0.2}
              metalness={0.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function Robot3D({
  title = "3D Robot (360° Movement)",
  subtitle = 'Full 360° rotation and movement with cursor control - just like the video.',
  followCursor = true,
  autoRotate = true, // Enable auto-rotate for 360° effect
  enableControls = true, // Enable drag controls for manual 360° rotation
  headImageSrc = "/transformer.png",
  headYawLimitDeg = null, // Allow full 360° head rotation
  showFaceDecal = false,
}: Robot3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [followCursorOn, setFollowCursorOn] = React.useState(followCursor);
  const [autoRotateOn, setAutoRotateOn] = React.useState(autoRotate);
  const [enableControlsOn, setEnableControlsOn] = React.useState(enableControls);

  return (
    <section className="min-h-screen bg-black text-slate-50 px-4 flex items-center justify-center">
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/40">
            <Move3D className="h-3.5 w-3.5" />
            <span>True 3D + full 360° rotation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-xl text-slate-300 text-sm sm:text-base">{subtitle}</p>

          <div className="text-xs text-slate-300/90 space-y-1">
            <div>
              <div className="flex items-center gap-3">
                <span>-</span>
                <span className="font-medium text-slate-100">Auto-rotate</span>
                <button
                  type="button"
                  aria-pressed={autoRotateOn}
                  onClick={() => setAutoRotateOn((v) => !v)}
                  className={[
                    "ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    autoRotateOn
                      ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                      : "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {autoRotateOn ? "ON" : "OFF"}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span>-</span>
                <span className="font-medium text-slate-100">Drag</span>
                <button
                  type="button"
                  aria-pressed={enableControlsOn}
                  onClick={() => setEnableControlsOn((v) => !v)}
                  className={[
                    "ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    enableControlsOn
                      ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                      : "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {enableControlsOn ? "ON" : "OFF"}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span>-</span>
                <span className="font-medium text-slate-100">Move cursor</span>
                <button
                  type="button"
                  aria-pressed={followCursorOn}
                  onClick={() => setFollowCursorOn((v) => !v)}
                  className={[
                    "ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    followCursorOn
                      ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                      : "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {followCursorOn ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-[380px] sm:h-[460px] rounded-3xl border border-slate-700/60 bg-slate-950/40 shadow-2xl shadow-sky-500/20 overflow-hidden">
          <div className="pointer-events-none absolute inset-6 rounded-3xl bg-sky-500/10 blur-3xl" />

          <Canvas
            className="h-full w-full"
            camera={{ position: [0, 0.2, 3.2], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
            shadows
          >
            <color attach="background" args={["#000000"]} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[3, 4, 3]} intensity={1.1} castShadow />
            <pointLight position={[-3, 0.5, 2]} intensity={0.8} color="#38bdf8" />
            {/* rim light + dramatic highlights */}
            <directionalLight position={[-4, 1.5, -2]} intensity={0.65} color="#ffffff" />
            {/* subtle red accent like the reference */}
            <pointLight position={[0, 0.6, 1.6]} intensity={0.55} color="#ef4444" />

            <TransformerRobot
              followCursor={!reducedMotion && followCursorOn}
              headImageSrc={headImageSrc}
              headYawLimitDeg={headYawLimitDeg}
              showFaceDecal={showFaceDecal}
            />

            <OrbitControls
              enabled={enableControlsOn}
              enablePan={false}
              enableZoom={false}
              autoRotate={!reducedMotion && autoRotateOn}
              autoRotateSpeed={0.9}
              rotateSpeed={0.8}
            />
            <Environment preset="city" />
          </Canvas>
        </div>
      </div>
    </section>
  );
}

