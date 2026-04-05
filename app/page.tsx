import { ProductOverview } from "@/components/product-overview";
import { Robot3D } from "@/components/ui/robot-3d";

export default function Home() {
  return (
    <div>
      <Robot3D />
      <ProductOverview />
      {/* Avatar motion demo — full-bleed background, loops continuously */}
      <section className="relative min-h-screen overflow-hidden border-t border-slate-800/80">
        <video
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src="/3D_Model_Generation_G06i30eV.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/88 via-slate-900/78 to-slate-950/92"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-20 text-slate-50">
          <div className="max-w-4xl mx-auto space-y-8 w-full">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight drop-shadow-md">
                Avatar motion demo
              </h2>
              <p className="text-slate-200 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed drop-shadow">
                Full 360° movement and cursor tracking—useful for a lifelike on-screen interviewer presence. Video
                runs continuously in the background.
              </p>
            </div>
            <div className="text-center text-xs text-slate-200/95 space-y-1 drop-shadow-sm">
              <div>• Full 360° rotation demonstration</div>
              <div>• Cursor tracking and head movement</div>
              <div>• Interactive 3D robot model</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
