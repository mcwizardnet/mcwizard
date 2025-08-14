import { Box, Chip, Skeleton, Button } from "@mui/material";
import { Card, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import type { Mod } from "@/types/domain";
import { Link } from "react-router";
import { useState } from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
// Removed per design: bottom action buttons (Open/Download/Folder)

interface ModCardProps {
  mod: Mod;
  downloadPercent?: number;
}

export default function ModCard({ mod, downloadPercent }: ModCardProps) {
  const image = mod.photoUrl;
  const [loaded, setLoaded] = useState(false);
  const formatCompact = (value: number) =>
    new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  return (
    <Card
      variant={mod.isInstalled ? "elevation" : "outlined"}
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderColor: mod.isInstalled ? "success.main" : undefined,
      }}>
      <Box sx={{ "&:hover .mod-hover-overlay": { opacity: 1 } }}>
        {image ? (
          <Box
            sx={{
              position: "relative",
              textDecoration: "none",
              color: "inherit",
            }}
            component={Link}
            to={`/mods/${mod.id}`}>
            {!loaded && (
              <Skeleton variant="rectangular" height={140} animation="wave" />
            )}
            <CardMedia
              component="img"
              height={140}
              image={image}
              alt={mod.name}
              onLoad={() => setLoaded(true)}
              sx={{ objectFit: "cover", display: loaded ? "block" : "none" }}
            />
            <Box
              className="mod-hover-overlay"
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.55)",
                color: "white",
                opacity: 0,
                transition: "opacity 150ms ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                textAlign: "center",
                gap: 1,
              }}>
              {mod.description && (
                <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                  {mod.description}
                </Typography>
              )}
              <Button size="small" variant="contained">
                Open
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
            }}>
            <ExtensionIcon color="disabled" fontSize="large" />
          </Box>
        )}
      </Box>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            {mod.name}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {!!mod.mcVersions?.length && (
              <Chip size="small" label={`MC ${mod.mcVersions[0]}`} />
            )}
            {!!mod.loaders?.length && (
              <Chip size="small" variant="outlined" label={mod.loaders[0]} />
            )}
            {typeof mod.downloadCount === "number" && (
              <Chip
                size="small"
                label={`${formatCompact(mod.downloadCount)} downloads`}
              />
            )}
            {mod.source === "curseforge" && (
              <Chip size="small" variant="outlined" label="CurseForge" />
            )}
            {mod.source === "local" && (
              <Chip size="small" variant="outlined" label="MCWizard" />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ModCardSkeleton() {
  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", position: "relative", overflow: "hidden" }}>
      <Skeleton variant="rectangular" height={140} animation="wave" />
      <CardContent>
        <Stack spacing={0.5}>
          <Skeleton variant="text" width="70%" />
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
            <Skeleton variant="rounded" width={72} height={24} />
            <Skeleton variant="rounded" width={88} height={24} />
            <Skeleton variant="rounded" width={120} height={24} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
