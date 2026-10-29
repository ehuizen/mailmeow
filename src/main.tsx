// Browser entry point: mounts the MailMeow app into #root with global styles.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("MailMeow: #root element missing from index.html");

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
