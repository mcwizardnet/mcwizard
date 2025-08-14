import { Box, Chip, Divider, Stack, Typography } from "@mui/material";

interface OverviewProps {
  name: string;
  logoUrl?: string;
  summary?: string;
  downloads?: number;
  categories?: { id: number; name: string }[];
  descriptionHtml: string;
}

export default function Overview({
  name,
  logoUrl,
  summary,
  downloads,
  categories,
  descriptionHtml,
}: OverviewProps) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={name}
            width={128}
            height={128}
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
        )}
        <Stack
          spacing={1}
          sx={{ minWidth: 0, justifyContent: "space-between" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
            {name}
          </Typography>
          {summary && (
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {typeof downloads === "number" && (
              <Chip
                label={`Downloads: ${downloads.toLocaleString()}`}
                size="small"
              />
            )}
            {categories?.slice(0, 6).map((c) => (
              <Chip key={c.id} label={c.name} size="small" variant="outlined" />
            ))}
          </Box>
        </Stack>
      </Stack>
      <Divider />
      <Box
        sx={{
          overflowX: "hidden",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          maxWidth: "100%",
          "& img, & video, & iframe": { maxWidth: "100%", height: "auto" },
          "& table": { display: "block", maxWidth: "100%", overflowX: "auto" },
          "& pre": { whiteSpace: "pre-wrap", overflowX: "auto" },
        }}
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />
    </Stack>
  );
}
