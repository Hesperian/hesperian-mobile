/*
 *  webpack.preprocess.js
 *  Scan the HTML source, and extract JSON for injection into the app at compile time
 *
 */
const fs = require('fs');
const cheerio = require('cheerio');
const util = require('../lib/util/util');

// One keyword will have stuff like "foo (bar)"
function keywordStringToArray(keywordString) {
  const newStr = util.searchNormalForm(keywordString);
  
  return newStr.split(/[^\w]+/).filter(k => !!k);

}

function keywordsStringToArray(keywordsString) {
  let keywords = [];

  if( keywordsString) {
    const rawKeywords = keywordsString.split(/\s*,\s*/);
    rawKeywords.forEach(k => {
      keywords.push(...keywordStringToArray(k));
    });
  }

  // sort and de-dupe
  keywords = keywords.sort().filter((k, index) => {
    return (index === 0) || (k !== keywords[index - 1]);
  })

  return keywords;
}

function processPage(pagePath, pageId) {
  let ret = {};
  const contents = fs.readFileSync(pagePath, {
    encoding: 'utf8'
  });
  const $ = cheerio.load(contents);
  const page = $('.page');
  const pageHeader = page.data('title') || $('.header-title-value').text() || '';
  const pageKeywords = page.data('keywords') || '';
  const imgPath = `./www/img/${pageId}.png`;
  const hasImg = fs.existsSync(imgPath);
  const titleKeyword = page.data('no-title-keywords') ? '' : pageHeader;

  ret.keywords = keywordsStringToArray([titleKeyword, pageKeywords].join(','));
  ret.route = `/pages/${pageId}`;

  if (pageHeader) {
    ret.title = pageHeader;
    if (hasImg) {
      ret.imgsrc = `img/${pageId}.png`;
    }
  }

  ret.sections = [];

  const sections$ = $('[data-section]').each(function() {
    const section$ = $(this);
    const sectionId = section$.data('section');
    const title = section$.data('title');
    const keywordsString = section$.data('keywords');

    ret.sections.push({
      'route': `/pages/${pageId}/${sectionId}`,
      sectionId,
      'title': title,
      'titleKeywords': keywordsStringToArray(title),
      'keywords': keywordsStringToArray(keywordsString)
    });
  });

  return ret;
}

function processPages(locale) {
  let ret = {};
  const pages = fs.readdirSync(`www/locales/${locale}`);
  pages.forEach((p) => {
    const m = p.match(/^(.*)\.html$/);
    if (m) {
      const pageId = m[1];
      ret[pageId] = processPage(`www/locales/${locale}/${p}`, pageId);
    }
  });

  return ret;
}

function getPageInfo(locales) {
  let ret = {};

  locales.forEach((l) => {
      ret[l] = processPages(l);
  });

  return ret;
}

module.exports = getPageInfo;