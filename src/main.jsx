import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@mantine/core/styles.css";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";

import { MantineProvider } from "@mantine/core";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider
      theme={{
        defaultRadius: "md", // 👈 THIS increases global rounding
      }}
      withGlobalStyles
      withNormalizeCSS
    >
      <ModalsProvider>
        <Notifications />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>,
);
