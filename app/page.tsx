import { Robot3D } from "@/components/ui/robot-3d";

export default function Home() {
  return (
    <div>
      <Robot3D />
      {/* Video Section */}
      <section className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Robot in Action</h2>
            <p className="text-slate-300 text-sm sm:text-base">See the 360° movement and cursor tracking in action</p>
          </div>
          
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/40 shadow-2xl shadow-sky-500/20">
            <video
              className="w-full h-full object-cover"
              controls
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/3D_Model_Generation_G06i30eV.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="text-center text-xs text-slate-300/90 space-y-1">
            <div>• Full 360° rotation demonstration</div>
            <div>• Cursor tracking and head movement</div>
            <div>• Interactive 3D robot model</div>
          </div>
        </div>
      </section>
    </div>
  );
}
