import { registerRootComponent } from "expo";
import Home from "../app/index";
import RootLayout from "../app/_layout";
import Review from "../app/review";
import Scan from "../app/scan";
import Settings from "../app/settings";
import { setRoutes } from "./router";

// Entry of the claude.ai Artifact build: same screens and layout, with the in-memory router.
setRoutes({ "/": Home, "/scan": Scan, "/review": Review, "/settings": Settings });
registerRootComponent(RootLayout);
