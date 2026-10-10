import type { AppTheme } from "../types";
import { getReaderStyles } from "./readerStyles";

// This code runs inside the WebView, so its helpers must stay within the script.
const READER_SCRIPT = `
  (function () {
    var ARTICLE_SELECTORS = [
      'article',
      'main',
      '[role="main"]',
      '.article-body',
      '.article-content',
      '.entry-content',
      '.post-content'
    ];

    var EXCLUDED_SELECTORS = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      'aside',
      'form',
      'button',
      'iframe',
      'noscript',
      'amp-ad',
      'amp-embed',
      'ins.adsbygoogle',
      '[data-ad]',
      '[data-ad-slot]',
      '[aria-label*="advert" i]',
      '.advertisement',
      '.advert',
      '.ads',
      '.ad-container',
      '.ad-wrapper',
      '.ad-banner',
      '.sponsored',
      '.sponsor',
      '.promotion',
      '.social',
      '.share',
      '.related',
      '.comments'
    ];

    var AD_MARKER_PATTERN =
      /(^|[ _-])(ad|ads|advert|advertisement|sponsor|sponsored|pr)([ _-]|$)/;
    var PARAGRAPH_SCORE_WEIGHT = 180;
    var EXTRACTION_DELAY_MS = 400;

    function findArticleRoot() {
      var candidates = Array.prototype.slice.call(
        document.querySelectorAll(ARTICLE_SELECTORS.join(', '))
      );

      if (!candidates.length) {
        candidates = Array.prototype.slice.call(
          document.querySelectorAll('section, div')
        );
      }

      var bestCandidate = candidates.reduce(function (best, node) {
        var textLength = (node.innerText || '').trim().length;
        var paragraphCount = node.querySelectorAll('p').length;
        var score = textLength + paragraphCount * PARAGRAPH_SCORE_WEIGHT;

        return score > best.score ? { node: node, score: score } : best;
      }, { node: document.body, score: 0 });

      return bestCandidate.node;
    }

    function removeUnwantedContent(content) {
      content.querySelectorAll(EXCLUDED_SELECTORS.join(', ')).forEach(function (node) {
        node.remove();
      });

      content.querySelectorAll('[id], [class]').forEach(function (node) {
        var className = typeof node.className === 'string' ? node.className : '';
        var marker = ((node.id || '') + ' ' + className).toLowerCase();

        if (AD_MARKER_PATTERN.test(marker)) {
          node.remove();
        }
      });
    }

    function resolveUrls(content, selector, attribute) {
      content.querySelectorAll(selector).forEach(function (node) {
        try {
          node[attribute] = new URL(
            node.getAttribute(attribute),
            location.href
          ).href;
        } catch (_) {
          // Keep the original attribute if the URL cannot be resolved.
        }
      });
    }

    function getArticleTitle() {
      var heading = document.querySelector('h1');
      return heading ? heading.innerText : document.title;
    }

    function escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function renderArticle(content, title) {
      document.documentElement.lang = 'ja';

      var readerStyle = document.createElement('style');
      readerStyle.id = 'rss-reader-style';
      readerStyle.textContent = __READER_STYLES__;

      // Preserve the site's stylesheets and Web fonts for Japanese text.
      document.head.appendChild(readerStyle);
      document.body.innerHTML = [
        '<main id="rss-reader-root">',
        '<h1>', escapeHtml(title), '</h1>',
        content.innerHTML,
        '</main>'
      ].join('');

      window.scrollTo(0, 0);
    }

    function notifyApp(type) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
    }

    function applyReaderMode() {
      try {
        var content = findArticleRoot().cloneNode(true);
        removeUnwantedContent(content);
        resolveUrls(content, '[src]', 'src');
        resolveUrls(content, 'a[href]', 'href');
        renderArticle(content, getArticleTitle());
        notifyApp('reader-ready');
      } catch (error) {
        notifyApp('reader-error');
      }
    }

    setTimeout(applyReaderMode, EXTRACTION_DELAY_MS);
  })();
  true;
`;

export const getReaderScript = (theme: AppTheme) =>
  READER_SCRIPT.replace(
    "__READER_STYLES__",
    () => JSON.stringify(getReaderStyles(theme)),
  );
