import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@arco-design/web-react/dist/css/arco.css";
import '@arco-design/web-react/es/_util/react-19-adapter';
import "./styles/globals.css";
import App from "./App.tsx";
import { createCanvasContainer } from "./canvas/di/container";

// 在应用入口处创建画布容器，并注入给 App
const canvasContainer = createCanvasContainer();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App canvasContainer={canvasContainer} />
  </StrictMode>,
);
