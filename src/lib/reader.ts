import type { AppTheme } from "../types";
import { getReaderStyles } from "./readerStyles";

// This script runs in an isolated WebView document. The source page itself is
// parsed as inert HTML and is never loaded or executed by the WebView.
const STATIC_READER_SCRIPT = `
  (function () {
    var SOURCE_HTML = __SOURCE_HTML__;
    var SOURCE_URL = __SOURCE_URL__;
    var READER_STYLES = __READER_STYLES__;
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
      'object',
      'embed',
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

    function findArticleRoot(sourceDocument) {
      var candidates = Array.prototype.slice.call(
        sourceDocument.querySelectorAll(ARTICLE_SELECTORS.join(', '))
      );

      if (!candidates.length) {
        candidates = Array.prototype.slice.call(
          sourceDocument.querySelectorAll('section, div')
        );
      }

      var bestCandidate = candidates.reduce(function (best, node) {
        var textLength = (node.textContent || '').trim().length;
        var paragraphCount = node.querySelectorAll('p').length;
        var score = textLength + paragraphCount * PARAGRAPH_SCORE_WEIGHT;

        return score > best.score ? { node: node, score: score } : best;
      }, { node: sourceDocument.body, score: 0 });

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

    function removeExecutableAttributes(content) {
      content.querySelectorAll('*').forEach(function (node) {
        Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
          var name = attribute.name.toLowerCase();
          var value = attribute.value.trim().toLowerCase();

          if (name.indexOf('on') === 0) {
            node.removeAttribute(attribute.name);
          } else if (name === 'target' || name === 'autoplay') {
            node.removeAttribute(attribute.name);
          } else if (
            (name === 'href' || name === 'src' || name === 'xlink:href') &&
            value.indexOf('javascript:') === 0
          ) {
            node.removeAttribute(attribute.name);
          }
        });
      });
    }

    function resolveUrls(content, selector, attribute) {
      content.querySelectorAll(selector).forEach(function (node) {
        try {
          node.setAttribute(
            attribute,
            new URL(node.getAttribute(attribute), SOURCE_URL).href
          );
        } catch (_) {
          node.removeAttribute(attribute);
        }
      });
    }

    function resolveSrcsets(content) {
      content.querySelectorAll('[srcset]').forEach(function (node) {
        try {
          var resolved = node.getAttribute('srcset').split(',').map(function (item) {
            var parts = item.trim().split(/\\s+/);
            parts[0] = new URL(parts[0], SOURCE_URL).href;
            return parts.join(' ');
          }).join(', ');

          node.setAttribute('srcset', resolved);
        } catch (_) {
          node.removeAttribute('srcset');
        }
      });
    }

    function copyStylesheets(sourceDocument) {
      sourceDocument.head
        .querySelectorAll('style, link[rel~="stylesheet" i]')
        .forEach(function (node) {
          var copy = node.cloneNode(true);

          if (copy.tagName.toLowerCase() === 'link') {
            try {
              copy.href = new URL(copy.getAttribute('href'), SOURCE_URL).href;
            } catch (_) {
              return;
            }
          }

          document.head.appendChild(copy);
        });
    }

    function getArticleTitle(sourceDocument) {
      var heading = sourceDocument.querySelector('h1');
      return heading ? heading.textContent : sourceDocument.title;
    }

    function escapeHtml(value) {
      return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function disableFixedAndAbsolutePositioning() {
      document
        .querySelectorAll('#rss-reader-root, #rss-reader-root *')
        .forEach(function (node) {
          var position = window.getComputedStyle(node).position;

          if (position === 'fixed' || position === 'absolute') {
            node.style.setProperty('position', 'static', 'important');
          }
        });
    }

    function renderArticle(sourceDocument, content) {
      document.documentElement.lang = 'ja';
      copyStylesheets(sourceDocument);

      var readerStyle = document.createElement('style');
      readerStyle.id = 'rss-reader-style';
      readerStyle.textContent = READER_STYLES;
      document.head.appendChild(readerStyle);
      document.body.innerHTML = [
        '<main id="rss-reader-root">',
        '<h1>', escapeHtml(getArticleTitle(sourceDocument)), '</h1>',
        content.innerHTML,
        '</main>'
      ].join('');

      disableFixedAndAbsolutePositioning();
      window.scrollTo(0, 0);
    }

    function notifyApp(type) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
    }

    function applyReaderMode() {
      try {
        var sourceDocument = new DOMParser().parseFromString(
          SOURCE_HTML,
          'text/html'
        );
        var content = findArticleRoot(sourceDocument).cloneNode(true);

        removeUnwantedContent(content);
        removeExecutableAttributes(content);
        resolveUrls(content, '[src]', 'src');
        resolveSrcsets(content);
        resolveUrls(content, 'a[href]', 'href');
        renderArticle(sourceDocument, content);
        notifyApp('reader-ready');
      } catch (error) {
        notifyApp('reader-error');
      }
    }

    applyReaderMode();
  })();
  true;
`;

const serializeForInlineScript = (value: string) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

export const getReaderDocument = (
  sourceHtml: string,
  sourceUrl: string,
  theme: AppTheme,
) => {
  const script = STATIC_READER_SCRIPT.replace(
    "__SOURCE_HTML__",
    () => serializeForInlineScript(sourceHtml),
  )
    .replace("__SOURCE_URL__", () => serializeForInlineScript(sourceUrl))
    .replace(
      "__READER_STYLES__",
      () => serializeForInlineScript(getReaderStyles(theme)),
    );

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <script>${script}</script>
  </body>
</html>`;
};
