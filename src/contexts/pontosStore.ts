import { createContext } from "react";
import type { PontosStore } from "./PontosContext";

// Keep context identity independent of provider edits during live updates.
export const PontosContext = createContext<PontosStore | null>(null);