import CodeLivePreview from "../CodeLivePreview";
import VisualCodeMimic from "../VisualCodeMimic";

export default function ProjectWorkspaceWrapper() {
  return (
    <div className="flex gap-1 w-full">
      <div className="flex-2">
        <VisualCodeMimic />
      </div>
      <div className="flex-1">
        <CodeLivePreview />
      </div>
    </div>
  );
}
