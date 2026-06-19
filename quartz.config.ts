import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Pramana Wiki",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "google",
      tagId: "G-9DKZ2SYTQK",
    },
    locale: "en-US",
    baseUrl: "pramana.middlewaymusings.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Sans",
        body: "Noto Sans", // placeholder so only Noto Sans is fetched; --bodyFont is overridden to Georgia in custom.scss
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf6f1", // linen background (Middle Way Musings)
          lightgray: "#e6ddd2",
          gray: "#b8ac9c",
          darkgray: "#33312e", // body text
          dark: "#1a191b", // headings
          secondary: "#1a191b", // links + active — near-black (monochrome)
          tertiary: "#8a8178", // visited / tags / hover
          highlight: "rgba(180, 160, 120, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#1a191b", // background (Middle Way Musings dark)
          lightgray: "#312f31",
          gray: "#6a655f",
          darkgray: "#d8d2c8", // body text
          dark: "#f3efe9", // headings
          secondary: "#f3efe9", // links + active — near-white
          tertiary: "#a89f93",
          highlight: "rgba(180, 160, 120, 0.12)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
