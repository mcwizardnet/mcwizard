import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  layout("layouts/default.tsx", [
    index("pages/splash.tsx"),
    route("/servers", "pages/servers.tsx"),
    route("/servers/:serverId", "pages/servers.$serverId.tsx"),
    route("/mods", "pages/mods.tsx"),
    route("/mods/:modId", "pages/mods.$modId.tsx"),
    route("/worlds", "pages/worlds.tsx"),
    route("/worlds/:worldId", "pages/worlds.$worldId.tsx"),
    route("/settings", "pages/settings.tsx"),
  ]),
] satisfies RouteConfig;
