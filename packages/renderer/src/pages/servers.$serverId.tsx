import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Box, Stack, Typography } from "@mui/material";
import DetailLayout from "@/layouts/DetailLayout";

const ServerDetail = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const [active, setActive] = useState("overview");

  const sections = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "players", label: "Players" },
      { id: "whitelist", label: "Whitelist" },
      { id: "backups", label: "Backups" },
      { id: "mods", label: "Mods" },
      { id: "settings", label: "Settings" },
      { id: "logs", label: "Logs" },
    ],
    [],
  );

  return (
    <DetailLayout
      title="Server"
      sections={sections}
      activeSectionId={active}
      onSelectSection={setActive}>
      <Stack spacing={1}>
        <Typography variant="h6">Server: {serverId}</Typography>
        <Typography variant="body2" color="text.secondary">
          Section: {active}
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            minHeight: 240,
          }}>
          <Typography variant="body1">
            Placeholder content for {active}
          </Typography>
        </Box>
      </Stack>
    </DetailLayout>
  );
};

export default ServerDetail;
