import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { LinearProgress, Stack } from "@mui/material";
import DetailLayout from "@/layouts/DetailLayout";
import type { CurseForgeMod } from "@/types/external";
import Overview from "@/components/mods/Overview";
import ModFiles from "@/components/mods/ModFiles";
import Inspector from "@/components/mods/Inspector";

const ModDetail = () => {
  const { modId } = useParams<{ modId: string }>();
  const [active, setActive] = useState("overview");
  const [mod, setMod] = useState<CurseForgeMod | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionHtml, setDescriptionHtml] = useState<string>("");
  const [javaInfo, setJavaInfo] = useState<{
    ok: boolean;
    version?: string;
  } | null>(null);

  const sections = useMemo(() => {
    return [
      { id: "overview", label: "Overview" },
      { id: "files", label: "Files" },
      { id: "inspector", label: "Inspector" },
    ];
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!modId) return;
      try {
        const res = await window.api.getCurseForgeMod(Number(modId));
        const data = (res as any).data as CurseForgeMod;
        if (mounted) setMod(data);
        const desc = await window.api.getCurseForgeModDescription(
          Number(modId),
        );
        if (mounted) setDescriptionHtml((desc as any).data || "");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [modId]);

  // Files logic moved into <ModFiles />

  // Check Java when entering Inspector
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (active !== "inspector") return;
      try {
        const info = await window.api.checkJava();
        if (mounted) setJavaInfo(info);
      } catch {
        if (mounted) setJavaInfo({ ok: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [active]);

  return (
    <DetailLayout
      title={mod?.name || "Mod"}
      sections={sections}
      activeSectionId={active}
      onSelectSection={setActive}>
      {loading && (
        <Stack spacing={2}>
          <LinearProgress />
        </Stack>
      )}
      {!!mod && active === "overview" && (
        <Overview
          name={mod.name}
          logoUrl={mod.logo?.url}
          summary={mod.summary}
          downloads={mod.downloadCount}
          categories={mod.categories?.map((c) => ({ id: c.id, name: c.name }))}
          descriptionHtml={descriptionHtml}
        />
      )}
      {!!mod && active === "files" && <ModFiles modId={Number(modId)} />}
      {active === "inspector" && (
        <Inspector
          onScan={() => window.api.rescanInstalled().catch(console.error)}
          javaInfo={javaInfo}
          modExternalId={Number(modId)}
          modName={mod?.name}
        />
      )}
    </DetailLayout>
  );
};

export default ModDetail;
