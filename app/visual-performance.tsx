"use client";

import { useEffect } from "react";
import { installVisualScheduling } from "@/lib/visual-scheduling";

export function VisualPerformance() {
  useEffect(installVisualScheduling, []);
  return null;
}
