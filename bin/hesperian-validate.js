#!/usr/bin/env node
/*
    Validation for the app.

    * Checks for unused images
*/

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const appConfig = JSON.parse(fs.readFileSync('app-config.json', 'utf8'));
const localizationDirs = appConfig.localizations.map((v) => v.language_code);

// Images that are used in the library need listed directly, since the library is not scanned
const usedImages = {
    "img/star-checked.svg": {
        count: 0
    },
    "img/star-unchecked.svg": {
        count: 0
    },
    "img/home-button_pink.png": {
        count: 0
    },
    "img/CountryInfo-Globe.png": {
        count: 0
    },
};

function addUsedImage(imgPath) {
    if (!usedImages[imgPath]) {
        usedImages[imgPath] = { count: 0 };
    }
    usedImages[imgPath].count++;
}

function processPage(pagePath, pageId) {
    const contents = fs.readFileSync(pagePath, {
        encoding: 'utf8'
    });
    const $ = cheerio.load(contents);

    const imgPath = `./www/img/${pageId}.png`;
    const hasImg = fs.existsSync(imgPath);
    if (hasImg) {
        addUsedImage(imgPath);
    }
    const images = $('img');
    images.each((i, img) => {
        const src = $(img).attr('src');
        if (src) {
            addUsedImage(src);
        }
    });

    // social sharing can share an image, listed under data-file
    const files = $('[data-file]');
    files.each((i, file) => {
        const src = $(file).data('file');
        if (src) {
            addUsedImage(src);
        }
    })
}

function processPages(locale) {
    let ret = {};
    const pages = fs.readdirSync(`www/locales/${locale}`);
    pages.forEach((p) => {
        const m = p.match(/^(.*)\.html$/);
        if (m) {
            const pageId = m[1];
            processPage(`www/locales/${locale}/${p}`, pageId);
        }
    });

    return ret;
}

/*
function processImagesInDir(dir) {
    const images = fs.readdirSync(`./www/${dir}`);
    images.forEach((img) => {
        if (!img.startsWith('.')) {
            const imgPath = `${dir}/${img}`;
            if (!usedImages[imgPath]) {
                process.stdout.write(`Unused image: ${imgPath}\n`);
            }
        }
    });
}
    */

function processImagesInDir(dir) {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            processImagesInDir(itemPath);
        } else if (stat.isFile() && !item.startsWith('.')) {
            const relativePath = path.relative('./www', itemPath);
            if (!usedImages[relativePath]) {
                process.stdout.write(`Unused image: ${relativePath}\n`);
            }
        }
    });
}

localizationDirs.forEach((l) => {
    processPages(l);
});

processImagesInDir('./www/img');

localizationDirs.forEach((l) => {
    processImagesInDir(`./www/locales/${l}/img`);
});
