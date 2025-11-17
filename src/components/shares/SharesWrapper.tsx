import { ShareProvider } from "@/context/ShareContext";
import ShareEditor from "./ShareEditor";
import ShareTimeline from "./ShareTimeline";

export default function SharesWrapper() {
  return (
    <ShareProvider>
      <div className="max-w-2xl mx-auto border border-slate-200 rounded-lg overflow-hidden">
        <ShareEditor />
        <ShareTimeline />
      </div>
    </ShareProvider>
  );
}
