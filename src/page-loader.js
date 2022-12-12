import { writeFile, mkdir } from 'node:fs/promises';
import axios from 'axios';
import { load } from 'cheerio';
import { parse } from 'node:path';
import _ from 'lodash';
import Listr from 'listr';

const slugify = (address) => (
  address
    .replace(/\W+/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '')
);

const urlToFileName = (hostAndPath, defaultExt = '.html') => {
  console.log('hostAndPath: ', hostAndPath);
  const { dir, name, ext } = parse(hostAndPath.replace(/\/$/, defaultExt));
  const slug = slugify(`${dir}/${name}`);
  return `${slug}${ext || defaultExt}`;
};

const urlToDirName = (url) => {
  const { hostname, pathname } = new URL(url);
  const { dir, name } = (pathname && pathname !== '/') ? parse(`${hostname}${pathname}`) : parse(`${hostname}.noext`);
  const slug = slugify(`${dir}/${name}`);
  return `${slug}_files`;
};

const assetSrcToAssetPath = (assetSrc, baseURL) => {
  // url address to local file system address
  if (!assetSrc) {
    return null;
  }
  const tempLink = new URL(assetSrc, baseURL);
  return urlToFileName(`${tempLink.host}${tempLink.pathname}`);
};

const assetTags = { img: 'src', link: 'href', script: 'src' };
const tagsAttrsPairs = _.toPairs(assetTags);

const parseHTML = (filesDirPath, htmlText, url) => {
  const $ = load(htmlText);
  const assets = [];
  tagsAttrsPairs.forEach(([tagName, attrName]) => {
    $(`${tagName}`).each((idx, elem) => {
      // Это href <link href="http://yandex.ru/some.html" />
      // elemHref -- это строка "http://yandex.ru/some.html"
      const elemHref = $(elem).attr(`${attrName}`);
      if (!elemHref) {
        return;
      }
      // url -- это URL страницы на которой asset
      if (new URL(elemHref, url).origin !== new URL(url).origin) {
        return;
      }
      // assetPath -- адрес файла в файловой системе
      const assetPath = assetSrcToAssetPath(elemHref, url);
      // filePath -- тоже (тот же) адрес в файловой системе, из которого вычистили двойные слэши
      const filePath = `${assetPath}`.replace('//', '/');
      $(elem).attr(`${attrName}`, filePath);
      // filepath - in file system
      // assetUrl - url
      assets.push({ filePath, assetUrl: elemHref }); // Чему равен assetUrl ?
    });
  });
  const htmlParsed = $.html();
  console.log('assets from ParseHTML: ', assets);
  return { assets, htmlParsed };
};

const downloadAsset = ({ filePath, assetUrl }, filesDirPath) => axios.get(`${assetUrl.toString()}`, {
  responseType: 'arraybuffer',
}).then((result) => {
  const fileChunks = filePath.split('/');
  const fileName = fileChunks[fileChunks.length - 1];
  return writeFile(`${filesDirPath}/${fileName}`, result.data);
});

const downloadResources = (assets, filesDirPath) => {
  console.log('assets: ', assets);
  const tasks = assets.map(({ filePath, assetUrl }) => ({
    title: assetUrl,
    task: () => downloadAsset({ filePath, assetUrl }, filesDirPath),
  }));
  const listr = new Listr(tasks);
  return listr.run().catch((err) => {
  });
};

const pageLoad = (url, dir = '.') => {
  let htmlPath = '';
  let htmlText = '';
  const filesDirPath = urlToDirName(url);
  const fullPath = `${dir}/${filesDirPath}`;
  return axios.get(url).then((resp) => {
    const tempLink = new URL(url);
    htmlPath = urlToFileName(`${tempLink.host}${tempLink.pathname}`);
    htmlText = resp.data;
    return resp;
  }).then((resp) => mkdir(filesDirPath, { recursive: true }).then(() => resp)).then((resp) => {
    const { assets, htmlParsed } = parseHTML(filesDirPath, htmlText, url);
    // without dir
    htmlText = htmlParsed;
    downloadResources(assets, fullPath);
    // with dir
    return resp;
  })
    .then(() => {
      writeFile(htmlPath, htmlText);
    });
};

export default pageLoad;
