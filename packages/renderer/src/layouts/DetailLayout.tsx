import type { ReactNode } from "react";
import { Box } from "@mui/material";
import Sidebar, { type SidebarSection } from "@/components/sidebar/Sidebar";

interface DetailLayoutProps {
  title: string;
  sections: SidebarSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  children: ReactNode;
}

export default function DetailLayout({
  title,
  sections,
  activeSectionId,
  onSelectSection,
  children,
}: DetailLayoutProps) {
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar
        title={title}
        sections={sections}
        activeSectionId={activeSectionId}
        onSelectSection={onSelectSection}
      />
      <Box sx={{ flex: 1, p: 2 }}>{children}</Box>
    </Box>
  );
}
