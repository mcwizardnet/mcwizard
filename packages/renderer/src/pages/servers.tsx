import type { Server } from "@/types/domain";
import CollectionLayout from "@/layouts/CollectionLayout";

const mockServers: Server[] = [];

export default function Mods() {
  return <CollectionLayout type="servers" items={mockServers} />;
}
