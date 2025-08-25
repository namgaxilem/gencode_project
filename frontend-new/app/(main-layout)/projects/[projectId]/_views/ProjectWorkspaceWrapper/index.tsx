import { useState } from "react";
import CodeLivePreview from "../CodeLivePreview";
import VisualCodeMimic from "../VisualCodeMimic";

export default function ProjectWorkspaceWrapper() {
  // lift preview URL to the wrapper so VisualCodeMimic can update it when dev starts
  const [previewUrl, setPreviewUrl] = useState("http://localhost:5173/");

  return (
    <div className="flex gap-1 w-full">
      <div className="flex-2">
        <VisualCodeMimic onPreviewUrl={() => {}} />
      </div>
      <div className="flex-1">
        <CodeLivePreview url={previewUrl} />
      </div>
    </div>
  );
}
