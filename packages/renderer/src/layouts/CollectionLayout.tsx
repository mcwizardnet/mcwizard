import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { Mod, World, Server, AnyItem } from "@/types/domain";
import SearchAndTags from "@/components/common/SearchAndTags";
import EmptyState from "@/components/common/EmptyState";
import { Link } from "react-router";
import PublicIcon from "@mui/icons-material/Public";

interface CollectionLayoutProps<TItem extends AnyItem = AnyItem> {
  type: "mods" | "worlds" | "servers";
  items: TItem[];
  renderItem?: (item: TItem) => ReactNode;
  hideSearch?: boolean;
  header?: ReactNode;
}

export default function CollectionLayout<TItem extends AnyItem = AnyItem>(
  props: CollectionLayoutProps<TItem>,
) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const tags = useMemo(() => {
    const set = new Set<string>();
    props.items.forEach((m) => m.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [props.items]);

  const filtered = useMemo(() => {
    return props.items.filter((m) => {
      const matchesQuery =
        !query ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.description?.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !selectedTag || m.tags?.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [query, selectedTag, props.items]);

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: "auto" }}>
      {!props.hideSearch && (
        <SearchAndTags
          placeholder={`Search ${props.type}…`}
          query={query}
          onQueryChange={setQuery}
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      )}
      {props.header}
      {filtered.length === 0 ? (
        <EmptyState title={`You have no ${props.type}.`} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            alignItems: "stretch",
            gap: 2,
          }}>
          {filtered.map((item) => (
            <Box key={item.id}>
              {props.renderItem ? (
                props.renderItem(item)
              ) : (
                <Card variant="outlined">
                  <CardActionArea
                    component={Link}
                    to={`/${props.type}/${item.id}`}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PublicIcon fontSize="small" />
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                      </Stack>
                      {item.tags && (
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ mt: 1, flexWrap: "wrap" }}>
                          {item.tags.slice(0, 3).map((t) => (
                            <Chip key={t} size="small" label={t} />
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
