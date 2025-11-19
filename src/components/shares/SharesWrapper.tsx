import { ShareProvider } from "@/context/ShareContext";
import ShareEditor from "./ShareEditor";
import ShareTimeline from "./ShareTimeline";

export default function SharesWrapper() {
  return (
    <ShareProvider>
      <div className="max-w-3xl mx-auto border border-slate-100 rounded-lg overflow-hidden h-screen flex flex-col">
        <ShareEditor />
        <div className="flex-1 overflow-hidden">
          <ShareTimeline />
        </div>
      </div>
    </ShareProvider>
  );
}
