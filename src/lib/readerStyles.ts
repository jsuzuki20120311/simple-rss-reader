import type { AppTheme } from "../types";

// Leave font-family to the original page, including its Web fonts.
export const getReaderStyles = (theme: AppTheme) => `
  html {
    background: ${theme.readerBackground} !important;
    color: ${theme.readerText} !important;
    overflow: auto !important;
  }

  body {
    display: block !important;
    margin: 0 auto !important;
    padding: 28px 22px 60px !important;
    max-width: 760px !important;
    background: ${theme.readerBackground} !important;
    color: ${theme.readerText} !important;
    font-size: 18px !important;
    line-height: 1.9 !important;
    overflow: auto !important;
  }

  #rss-reader-root {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  #rss-reader-root h1 {
    font-size: 30px !important;
    line-height: 1.35 !important;
    margin: 0 0 28px !important;
  }

  #rss-reader-root h2,
  #rss-reader-root h3 {
    line-height: 1.45 !important;
    margin-top: 2em !important;
  }

  #rss-reader-root p {
    margin: 1.2em 0 !important;
  }

  #rss-reader-root img,
  #rss-reader-root video {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 8px;
  }

  #rss-reader-root a {
    color: ${theme.readerLink} !important;
  }

  #rss-reader-root figure {
    margin: 1.8em 0 !important;
  }

  #rss-reader-root figcaption {
    font-size: 13px !important;
    opacity: .7;
  }

  #rss-reader-root pre {
    overflow: auto !important;
    background: rgba(127, 127, 127, .14) !important;
    padding: 14px !important;
    border-radius: 8px;
  }
`;
