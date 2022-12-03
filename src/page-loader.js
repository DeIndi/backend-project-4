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

const urlToFileName = (url, defaultExt = '.html') => {
  const { hostname, pathname } = new URL(url);
  const { dir, name, ext } = (pathname && pathname !== '/') ? parse(`${hostname}${pathname}`) : parse(`${hostname}${defaultExt}`);
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
  if (!assetSrc) {
    return null;
  }
  if (assetSrc.startsWith('http:')) {
    return assetSrc;
  }
  const tempLink = new URL(assetSrc, new URL(baseURL));
  return `${tempLink.host}${tempLink.pathname}`;
};

const assetTags = { img: 'src', link: 'href', script: 'src' };
const tagsAttrsPairs = _.toPairs(assetTags);

const parseHTML = (filesDirPath, htmlText, url) => {
  const $ = load(htmlText);
  const assets = [];
  tagsAttrsPairs.forEach(([tagName, attrName]) => {
    $(`${tagName}`).each(async (idx, elem) => {
      const elemHref = $(elem).attr(`${attrName}`);
      if (!elemHref) {
        return;
      }
      const assetPath = assetSrcToAssetPath(elemHref, url);
      const filePath = `${filesDirPath}/${assetPath}`.replace('//', '/');
      $(elem).attr(`${attrName}`, filePath);
      const assetUrl = new URL(elemHref, url);
      assets.push({ filePath, assetUrl: assetUrl.href });
    });
  });
  const htmlParsed = $.html();
  return { assets, htmlParsed };
};

const downloadAsset = async ({ filePath, assetUrl }, filesDirPath) => {
  const result = await axios.get(`${assetUrl.toString()}`, {
    responseType: 'arraybuffer',
  });
  const fileChunks = filePath.split('/');
  const fileName = fileChunks[fileChunks.length - 1];
  return writeFile(`${filesDirPath}/${fileName}`, result.data);
};

const downloadResources = async (assets, filesDirPath) => {
  const tasks = assets.map(({ filePath, assetUrl }) => ({
    title: assetUrl,
    task: () => downloadAsset({ filePath, assetUrl }, filesDirPath),
  }));
  const listr = new Listr(tasks);
  return listr.run().catch((err) => {
    console.error(err);
  });
};

const pageLoad = (url, dir = '.') => {
  let htmlPath = '';
  let htmlText = '';
  let filesDirPath = urlToDirName(url);
  return axios.get(url).then((resp) => {
    htmlPath = urlToFileName(url);
    if (dir !== '.') {
      htmlPath = `${dir}/${htmlPath}`;
      filesDirPath = `${dir}/${filesDirPath}`;
    }
    htmlText = resp.data;
    return resp;
  }).then((resp) => mkdir(filesDirPath, { recursive: true }).then(() => resp)).then((resp) => {
    const { assets } = parseHTML(filesDirPath, htmlText, url);
    downloadResources(assets, filesDirPath);
    return resp;
  })
    .then(() => {
      writeFile(htmlPath, htmlText);
    });
};

export default pageLoad;
