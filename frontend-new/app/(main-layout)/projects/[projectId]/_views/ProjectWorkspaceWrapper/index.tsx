import CodeLivePreview from "../CodeLivePreview";
import VisualCodeMimic from "../VisualCodeMimic";
import WorkspaceProvider from "../WorkspaceProvider";

export default function ProjectWorkspaceWrapper() {
  return (
    <WorkspaceProvider>
      <div className="flex gap-1 w-full">
        <div className="flex-2">
          <VisualCodeMimic />
        </div>
        <div className="flex-1">
          <CodeLivePreview />
        </div>
      </div>
    </WorkspaceProvider>
  );
}
