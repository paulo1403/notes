import { createIcons } from "lucide";
import arrowLeft from "lucide/dist/esm/icons/arrow-left";
import folder from "lucide/dist/esm/icons/folder";
import moon from "lucide/dist/esm/icons/moon";
import sun from "lucide/dist/esm/icons/sun";
import plus from "lucide/dist/esm/icons/plus";
import menu from "lucide/dist/esm/icons/menu";
import x from "lucide/dist/esm/icons/x";
import share from "lucide/dist/esm/icons/share";
import download from "lucide/dist/esm/icons/download";
import trash2 from "lucide/dist/esm/icons/trash-2";
import search from "lucide/dist/esm/icons/search";
import chevronDown from "lucide/dist/esm/icons/chevron-down";
import chevronRight from "lucide/dist/esm/icons/chevron-right";
import fileText from "lucide/dist/esm/icons/file-text";
import tag from "lucide/dist/esm/icons/tag";
import copy from "lucide/dist/esm/icons/copy";
import lock from "lucide/dist/esm/icons/lock";
import clock from "lucide/dist/esm/icons/clock";
import eye from "lucide/dist/esm/icons/eye";
import eyeOff from "lucide/dist/esm/icons/eye-off";
import barChart from "lucide/dist/esm/icons/bar-chart";
import refreshCw from "lucide/dist/esm/icons/refresh-cw";

const icons = {
  "arrow-left": arrowLeft,
  folder, moon, sun, plus, menu, x, share, download,
  "trash-2": trash2, search, "chevron-down": chevronDown, "chevron-right": chevronRight,
  "file-text": fileText, tag, copy, lock, clock, eye, "eye-off": eyeOff,
  "bar-chart": barChart, "refresh": refreshCw,
} as const;

export type IconName = keyof typeof icons;

export function icon(name: IconName, size = 16) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-flex;flex-shrink:0"></i>`;
}

export function renderIcons() {
  createIcons({ icons: icons as any, attrs: { "stroke-width": "2" } });
}
