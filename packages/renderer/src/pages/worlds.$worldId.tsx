import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Box, Stack, Typography } from "@mui/material";
import DetailLayout from "@/layouts/DetailLayout";

const WorldDetail = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const [active, setActive] = useState("overview");
  const sections = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "dimensions", label: "Dimensions" },
      { id: "structures", label: "Structures" },
      { id: "players", label: "Players" },
      { id: "backups", label: "Backups" },
      { id: "settings", label: "Settings" },
    ],
    [],
  );
  return (
    <DetailLayout
      title="World"
      sections={sections}
      activeSectionId={active}
      onSelectSection={setActive}>
      <Stack spacing={1}>
        <Typography variant="h6">World: {worldId}</Typography>
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

export default WorldDetail;
