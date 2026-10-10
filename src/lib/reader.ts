import type { AppTheme } from "../types";

const READER_SCRIPT = `
  setTimeout(function () {
    try {
      var candidates = Array.prototype.slice.call(document.querySelectorAll('article, main, [role="main"], .article-body, .article-content, .entry-content, .post-content'));
      if (!candidates.length) candidates = Array.prototype.slice.call(document.querySelectorAll('section, div'));
      var root = candidates.reduce(function (best, node) {
        var score = (node.innerText || '').trim().length + node.querySelectorAll('p').length * 180;
        return score > best.score ? { node: node, score: score } : best;
      }, { node: document.body, score: 0 }).node;
      var content = root.cloneNode(true);
      content.querySelectorAll('script, style, nav, header, footer, aside, form, button, iframe, noscript, amp-ad, amp-embed, ins.adsbygoogle, [data-ad], [data-ad-slot], [aria-label*="advert" i], .advertisement, .advert, .ads, .ad-container, .ad-wrapper, .ad-banner, .sponsored, .sponsor, .promotion, .social, .share, .related, .comments').forEach(function (node) { node.remove(); });
      content.querySelectorAll('[id], [class]').forEach(function (node) {
        var marker = ((node.id || '') + ' ' + (typeof node.className === 'string' ? node.className : '')).toLowerCase();
        if (/(^|[ _-])(ad|ads|advert|advertisement|sponsor|sponsored|pr)([ _-]|$)/.test(marker)) node.remove();
      });
      content.querySelectorAll('[src]').forEach(function (node) { try { node.src = new URL(node.getAttribute('src'), location.href).href; } catch (_) {} });
      content.querySelectorAll('a[href]').forEach(function (node) { try { node.href = new URL(node.getAttribute('href'), location.href).href; } catch (_) {} });
      var title = document.querySelector('h1') ? document.querySelector('h1').innerText : document.title;
      var style = 'html{background:__READER_BG__!important;color:__READER_TEXT__!important}body{display:block!important;margin:0 auto!important;padding:28px 22px 60px!important;max-width:760px!important;background:__READER_BG__!important;color:__READER_TEXT__!important;font-size:18px!important;line-height:1.9!important}#rss-reader-root{display:block!important;visibility:visible!important;opacity:1!important}#rss-reader-root h1{font-size:30px!important;line-height:1.35!important;margin:0 0 28px!important}#rss-reader-root h2,#rss-reader-root h3{line-height:1.45!important;margin-top:2em!important}#rss-reader-root p{margin:1.2em 0!important}#rss-reader-root img,#rss-reader-root video{max-width:100%!important;height:auto!important;border-radius:8px}#rss-reader-root a{color:__READER_LINK__!important}#rss-reader-root figure{margin:1.8em 0!important}#rss-reader-root figcaption{font-size:13px!important;opacity:.7}#rss-reader-root pre{overflow:auto!important;background:rgba(127,127,127,.14)!important;padding:14px!important;border-radius:8px}';
      document.documentElement.lang = 'ja';
      var readerStyle = document.createElement('style');
      readerStyle.id = 'rss-reader-style';
      readerStyle.textContent = style;
      document.head.appendChild(readerStyle);
      document.body.innerHTML = '<main id="rss-reader-root"><h1>' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h1>' + content.innerHTML + '</main>';
      window.scrollTo(0, 0);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader-ready' }));
    } catch (error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reader-error' }));
    }
  }, 400);
  true;
`;

export const getReaderScript = (theme: AppTheme) =>
  READER_SCRIPT.replaceAll("__READER_BG__", theme.readerBackground)
    .replaceAll("__READER_TEXT__", theme.readerText)
    .replaceAll("__READER_LINK__", theme.readerLink);
