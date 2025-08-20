"use client";

import TopHeader from "@/components/ui/TopHeader";
import {
  ChevronDownIcon,
  GearIcon,
  LockClosedIcon,
  MoonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { Button, Dropdown, MenuProps } from "antd";
import { useParams, useRouter } from "next/navigation";
import ProjectWorkspaceWrapper from "./_views/ProjectWorkspaceWrapper";

interface Props {}
export default function Page({}: Props) {
  const { projectId } = useParams<{
    projectId;
  }>();
  const router = useRouter();

  const integrations: MenuProps["items"] = [
    { key: "vercel", label: "Vercel" },
    { key: "github", label: "GitHub" },
    { type: "divider" },
    { key: "manage", label: "Manage integrations" },
  ];

  const publish: MenuProps["items"] = [
    { key: "preview", label: "Preview draft" },
    { key: "prod", label: "Publish to production" },
  ];

  return (
    <>
      <TopHeader>
        <div className="relative mx-auto flex h-full max-w-full justify-between items-center px-3">
          <div className="absolute left-1/2 -translate-x-1/2">projectname</div>

          {/* right controls */}
          <div className="ml-auto flex items-center gap-2">
            {/* settings (ghost icon) */}
            <Button
              size="small"
              type="text"
              icon={<GearIcon className="h-4 w-4" />}
              className="!px-2 text-neutral-700 hover:!bg-neutral-100 dark:text-neutral-300 dark:hover:!bg-neutral-800/70"
            />

            {/* integrations (ghost button with caret) */}
            <Dropdown menu={{ items: integrations }} trigger={["click"]}>
              <Button
                size="small"
                className="flex items-center gap-1 !rounded-lg !border !border-neutral-300 !bg-white !px-3 !text-neutral-800 hover:!bg-neutral-100 dark:!border-neutral-700 dark:!bg-neutral-900 dark:!text-neutral-100 dark:hover:!bg-neutral-800/70"
              >
                Integrations
                <ChevronDownIcon className="h-4 w-4 opacity-70" />
              </Button>
            </Dropdown>

            {/* publish (primary with caret) */}
            <Dropdown menu={{ items: publish }} trigger={["click"]}>
              <Button type="primary" size="small" className="!rounded-lg !px-3">
                Publish <ChevronDownIcon className="ml-1 h-4 w-4" />
              </Button>
            </Dropdown>
          </div>
        </div>
      </TopHeader>
      <ProjectWorkspaceWrapper />
    </>
  );
}
