"use client";

import { useEffect } from "react";
import { loadModels } from "@/lib/face-api";

export function ModelLoader() {
  useEffect(() => {
    loadModels();
  }, []);

  return null;
}
