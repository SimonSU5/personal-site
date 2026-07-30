/**
 * 全站配色单一数据源（"宏"）。
 * 改这里 → 跑 `npm run gen:themes` → 生成 app/themes.generated.css → 全站生效。
 *
 * 切勿直接编辑 app/themes.generated.css（由 scripts/gen-theme-css.ts 生成、入库如 lockfile）。
 */

export type ColorMode = "dark" | "light";

export type ThemeId =
  | "gold-dark"
  | "champagne-light"
  | "steel-blue"
  | "copper"
  | "teal"
  | "cobalt"
  | "mist-purple"
  | "moss"
  | "wine";

/**
 * 单套主题的全部颜色。生成器据此输出 raw 原语 + 语义层 + 渐变。
 * 中性边框/分隔/底色按页面底色冷暖分组给定；语义色给 fg + subtle-bg 双形态。
 */
export interface ThemeColors {
  /* 底色层 */
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgElevated: string;
  /* 文字三级 + 反色（反色=落在强调色背景上的文字，恒为深色） */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  /* 强调色（主/次/亮/暗，渐变用亮→暗） */
  accentPrimary: string;
  accentSecondary: string;
  accentLight: string;
  accentDark: string;
  /* 中性边框/分隔 */
  borderColor: string;
  borderLight: string;
  dividerColor: string;
  /* 语义色 */
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  /* 结构色（navbar/滚动条/弹窗遮罩/代码块底/危险按钮文字） */
  navbarBg: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrim: string;
  bgCode: string;
  textOnDanger: string;
}

export interface Theme {
  id: ThemeId;
  /** UI 标签 */
  name: string;
  mode: ColorMode;
  /** 圆点切换器里该主题的展示色（CSS background 值） */
  swatch: string;
  colors: ThemeColors;
}

/* 跨主题固定值（图片上的标签盖层，盖在照片上，不随主题变） */
export const ON_IMAGE_BG = "rgba(18, 18, 23, 0.85)";
export const ON_IMAGE_FG = "rgba(255, 255, 255, 0.85)";

const grad = (light: string, dark: string) =>
  `linear-gradient(135deg, ${light}, ${dark})`;

export const THEMES: Theme[] = [
  {
    id: "gold-dark",
    name: "香槟金 · 暗色",
    mode: "dark",
    swatch: "linear-gradient(135deg, #E0C88C, #141416)",
    colors: {
      bgPrimary: "#141416",
      bgSecondary: "#1C1C1E",
      bgCard: "#1C1C1E",
      bgElevated: "#242427",
      textPrimary: "#E8E8EB",
      textSecondary: "#A9A9B2",
      textMuted: "#8C8C92",
      textInverse: "#141416",
      accentPrimary: "#D4B470",
      accentSecondary: "#B99958",
      accentLight: "#E0C88C",
      accentDark: "#B99958",
      borderColor: "#2A2A2E",
      borderLight: "#242427",
      dividerColor: "#2A2A2E",
      danger: "#E5484D",
      dangerBg: "rgba(229, 72, 77, 0.16)",
      success: "#46A758",
      successBg: "rgba(70, 167, 88, 0.16)",
      warning: "#FFAB1A",
      warningBg: "rgba(255, 171, 26, 0.16)",
      navbarBg: "rgba(28, 28, 30, 0.75)",
      scrollbarThumb: "rgba(232, 232, 235, 0.10)",
      scrollbarThumbHover: "rgba(232, 232, 235, 0.15)",
      scrim: "rgba(0, 0, 0, 0.7)",
      bgCode: "#1E1E1E",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "champagne-light",
    name: "暖米白香槟金",
    mode: "light",
    swatch: grad("#D9BB7E", "#B28F54"),
    colors: {
      bgPrimary: "#F8F7F2",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F3F1EC",
      textPrimary: "#1C1B19",
      textSecondary: "#484642",
      textMuted: "#6F6C65",
      textInverse: "#1C1B19",
      accentPrimary: "#C8A868",
      accentSecondary: "#B28F54",
      accentLight: "#D9BB7E",
      accentDark: "#B28F54",
      borderColor: "#E6E2DA",
      borderLight: "#EFEBE4",
      dividerColor: "#E6E2DA",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "steel-blue",
    name: "冷钢蓝",
    mode: "light",
    swatch: grad("#728FA8", "#486380"),
    colors: {
      bgPrimary: "#F5F6F9",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F2F4F7",
      textPrimary: "#18191E",
      textSecondary: "#40424A",
      textMuted: "#707380",
      textInverse: "#18191E",
      accentPrimary: "#5A7896",
      accentSecondary: "#486380",
      accentLight: "#728FA8",
      accentDark: "#486380",
      borderColor: "#E2E5EB",
      borderLight: "#EBEDF2",
      dividerColor: "#E2E5EB",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "copper",
    name: "哑光古铜橙",
    mode: "light",
    swatch: grad("#D09668", "#9E673C"),
    colors: {
      bgPrimary: "#F8F5F2",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F3EFEB",
      textPrimary: "#1C1B19",
      textSecondary: "#484642",
      textMuted: "#6F6C65",
      textInverse: "#1C1B19",
      accentPrimary: "#B97C4E",
      accentSecondary: "#9E673C",
      accentLight: "#D09668",
      accentDark: "#9E673C",
      borderColor: "#E6E0D9",
      borderLight: "#EFEAE3",
      dividerColor: "#E6E0D9",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "teal",
    name: "哑光青金",
    mode: "light",
    swatch: grad("#67ADB3", "#3C7A7F"),
    colors: {
      bgPrimary: "#F5F8F9",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#EEF3F4",
      textPrimary: "#171A1C",
      textSecondary: "#3F474A",
      textMuted: "#6E787C",
      textInverse: "#171A1C",
      accentPrimary: "#4F9499",
      accentSecondary: "#3C7A7F",
      accentLight: "#67ADB3",
      accentDark: "#3C7A7F",
      borderColor: "#E2E8E8",
      borderLight: "#EBEFEF",
      dividerColor: "#E2E8E8",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "cobalt",
    name: "深空钴蓝",
    mode: "light",
    swatch: grad("#547CB8", "#2F4E7A"),
    colors: {
      bgPrimary: "#F5F6F9",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F2F4F7",
      textPrimary: "#18191E",
      textSecondary: "#40424A",
      textMuted: "#707380",
      textInverse: "#18191E",
      accentPrimary: "#3E6499",
      accentSecondary: "#2F4E7A",
      accentLight: "#547CB8",
      accentDark: "#2F4E7A",
      borderColor: "#E2E5EB",
      borderLight: "#EBEDF2",
      dividerColor: "#E2E5EB",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "mist-purple",
    name: "雾感灰紫",
    mode: "light",
    swatch: grad("#8D80BF", "#5E5287"),
    colors: {
      bgPrimary: "#F6F5FA",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F1EFF6",
      textPrimary: "#1A191E",
      textSecondary: "#43404A",
      textMuted: "#726F80",
      textInverse: "#1A191E",
      accentPrimary: "#7468A3",
      accentSecondary: "#5E5287",
      accentLight: "#8D80BF",
      accentDark: "#5E5287",
      borderColor: "#E5E2EC",
      borderLight: "#EEECF4",
      dividerColor: "#E5E2EC",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "moss",
    name: "哑光苔绿",
    mode: "light",
    swatch: grad("#82A87A", "#54754E"),
    colors: {
      bgPrimary: "#F8F7F2",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F3F1EC",
      textPrimary: "#1C1B19",
      textSecondary: "#484642",
      textMuted: "#6F6C65",
      textInverse: "#1C1B19",
      accentPrimary: "#6A8F62",
      accentSecondary: "#54754E",
      accentLight: "#82A87A",
      accentDark: "#54754E",
      borderColor: "#E6E2DA",
      borderLight: "#EFEBE4",
      dividerColor: "#E6E2DA",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
  {
    id: "wine",
    name: "低饱和酒红",
    mode: "light",
    swatch: grad("#B36E6E", "#7D4444"),
    colors: {
      bgPrimary: "#F8F5F5",
      bgSecondary: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgElevated: "#F4EEED",
      textPrimary: "#1E1A1A",
      textSecondary: "#4A4040",
      textMuted: "#807070",
      textInverse: "#1E1A1A",
      accentPrimary: "#995656",
      accentSecondary: "#7D4444",
      accentLight: "#B36E6E",
      accentDark: "#7D4444",
      borderColor: "#ECE2E2",
      borderLight: "#F2ECEC",
      dividerColor: "#ECE2E2",
      danger: "#D63B3B",
      dangerBg: "rgba(214, 59, 59, 0.12)",
      success: "#2E9E4B",
      successBg: "rgba(46, 158, 75, 0.12)",
      warning: "#C77700",
      warningBg: "rgba(199, 119, 0, 0.12)",
      navbarBg: "rgba(255, 255, 255, 0.75)",
      scrollbarThumb: "rgba(0, 0, 0, 0.15)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.25)",
      scrim: "rgba(0, 0, 0, 0.5)",
      bgCode: "#F6F8FA",
      textOnDanger: "#FFFFFF",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "gold-dark";

export const THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function getThemeMode(id: ThemeId): ColorMode {
  return getTheme(id).mode;
}
