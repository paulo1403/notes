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
import chartBar from "lucide/dist/esm/icons/chart-bar";
import refreshCw from "lucide/dist/esm/icons/refresh-cw";

// createIcons lookup uses PascalCase keys (toPascalCase("moon") → "Moon")
const icons: Record<string, any> = {
  ArrowLeft: arrowLeft, Folder: folder, Moon: moon, Sun: sun,
  Plus: plus, Menu: menu, X: x, Share: share, Download: download,
  Trash2: trash2, Search: search, ChevronDown: chevronDown, ChevronRight: chevronRight,
  FileText: fileText, Tag: tag, Copy: copy, Lock: lock, Clock: clock,
  Eye: eye, EyeOff: eyeOff, BarChart: chartBar, RefreshCw: refreshCw,
};

export type IconName = keyof typeof icons;

export function icon(name: string, size = 16) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-flex;flex-shrink:0"></i>`;
}

export function renderIcons() {
  createIcons({ icons, attrs: { "stroke-width": "2" } });
}
