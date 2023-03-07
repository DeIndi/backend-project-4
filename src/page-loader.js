import {
  writeFile, mkdir,
} from 'node:fs/promises';
import axios from 'axios';
import { load } from 'cheerio';
import { parse } from 'node:path';
import _ from 'lodash';
import path from 'path';
import Listr from 'listr';

const slugify = (address) => (
  address
    .replace(/\W+/g, '-')
    .replace(/-$/, '')
    .replace(/^-/, '')
);

const urlToFileName = (hostAndPath, defaultExt = '.html') => {
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

const parseHTML = (filesDirPath, htmlText, baseUrl) => {
  const { origin } = new URL(baseUrl);
  const $ = load(htmlText);
  const assets = [];
  tagsAttrsPairs.forEach(([tagName, attrName]) => {
    $(`${tagName}`).toArray()
      .map((elem) => $(elem))
      .filter(($elem) => $elem.attr(attrName))
      .map(($elem) => ({ $elem, url: new URL($elem.attr(attrName), baseUrl) }))
      .filter(({ url }) => url.origin === origin)
      .forEach(({ $elem, url }) => {
        const assetPath = assetSrcToAssetPath($elem.attr(attrName), baseUrl);
        const filePath = path.join(`${filesDirPath}/${assetPath}`);
        $elem.attr(`${attrName}`, filePath);
        assets.push({ filePath, assetUrl: url.toString() });
      });
  });
  const htmlParsed = $.html();
  return { assets, htmlParsed };
};

const downloadAsset = ({ filePath, assetUrl }, filesDirPath) => axios.get(`${assetUrl.toString()}`, {
  responseType: 'arraybuffer',
}).then((result) => {
  const fileName = path.basename(filePath);
  return writeFile(`${filesDirPath}/${fileName}`, result.data);
});

const downloadResources = (assets, filesDirPath) => {
  const tasks = assets.map(({ filePath, assetUrl }) => ({
    title: assetUrl,
    task: () => downloadAsset({ filePath, assetUrl }, filesDirPath),
  }));
  const listr = new Listr(tasks);
  return listr.run().catch(() => {
  });
};

const pageLoad = (url, dir = '.') => {
  let htmlPath = '';
  let htmlText = '';
  const filesDirPath = urlToDirName(url);
  const fullPath = `${dir}/${filesDirPath}`;
  return axios.get(url)
    .then((resp) => {
      const tempLink = new URL(url);
      htmlPath = urlToFileName(`${tempLink.host}${tempLink.pathname}`);
      htmlText = resp.data;
      return resp;
    })
    .then(() => mkdir(fullPath, { recursive: true }))
    .then(() => {
      const { assets, htmlParsed } = parseHTML(filesDirPath, htmlText, url);
      // without dir
      htmlText = htmlParsed;
      return downloadResources(assets, fullPath);
      // with dir
    })
    .then(() => writeFile(`${dir}/${htmlPath}`, htmlText));
};

export default pageLoad;
