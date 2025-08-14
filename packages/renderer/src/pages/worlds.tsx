import type { Server } from "@/types/domain";
import CollectionLayout from "@/layouts/CollectionLayout";

const mockWorlds: Server[] = [];

export default function Worlds() {
  return <CollectionLayout type="worlds" items={mockWorlds} />;
}
