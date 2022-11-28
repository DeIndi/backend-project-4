import {writeFile, stat} from 'node:fs/promises';
import {mkdir} from 'node:fs/promises';
import axios from 'axios';
import {load} from 'cheerio';
import {dirname, parse} from 'node:path';
import _ from 'lodash';
import Listr from 'listr';

const slugify = (address) => (
    address
        .replace(/\W+/g, '-')
        .replace(/-$/, '')
        .replace(/^-/, '')
);

const fileExists = path => stat(path).then(() => true, () => false);

const testFunc = (address) => {
    address
        .replace(/\W+/g, '-')
        .replace(/-$/, '')
        .replace(/^-/, '')
        .replace(/\W+/g, '-')
        .replace(/-$/, '')
        .replace(/^-/, '')
}
const testFunc2 = (address) => {
    address
        .replace(/\W+/g, '-')
        .replace(/-$/, '')
        .replace(/^-/, '')
        .replace(/\W+/g, '-')
        .replace(/-$/, '')
        .replace(/^-/, '')
}

const urlToFileName = (url, defaultExt = '.html') => {
    const {hostname, pathname} = new URL(url);
    const {dir, name, ext } = (pathname && pathname!=='/')?parse(`${hostname}${pathname}`):parse(`${hostname}${defaultExt}`);
    const slug = slugify(`${dir}/${name}`);
    return `${slug}${ext || defaultExt}`;
    // const urlChunks = url.split('.');
    // //const dirname = path.dirname(url);
    // const extName  = url.match(extDelim) ? urlChunks[urlChunks.length] : null;
    // const baseName = url.match(extDelim) ? urlChunks.slice(0,urlChunks.length-1).join('.') : url;
    // const fileName = baseName
    //   .replace(protocols, '') // Берётся адрес страницы без протокола
    //   .replace(delim, '-') // Все символы, кроме букв и цифр заменяются на дефис -
    //   .replace(/-$/, '') // Убираем - в конце
    //   ;
    // const dirName = `${fileName}_files`;
    // console.log('dirName: ', dirName);
    // return `${fileName}.${extName ?? 'html'}`;
};

const urlToDirName = (url) => {
    const {hostname, pathname} = new URL(url);
    const {dir, name} = (pathname && pathname!=='/')?parse(`${hostname}${pathname}`):parse(`${hostname}.noext`);
    const slug = slugify(`${dir}/${name}`);
    return `${slug}_files`;
};

const assetSrcToAssetPath = (assetSrc, baseURL) => {
    if (!assetSrc) {
        return;
    }
    if (assetSrc.startsWith('http:')) {
        return assetSrc;
    }
    const tempLink = new URL(assetSrc, new URL(baseURL));
    return `${tempLink.host}${tempLink.pathname}`;
}

const assetTags = {'img': 'src', 'link': 'href', 'script': 'src'};
const tagsAttrsPairs = _.toPairs(assetTags);

const parseHTML = (filesDirPath, htmlText, url) => {
    console.log("ParseHTML func invoked");
    const $ = load(htmlText);
    const assets = [];
    tagsAttrsPairs.forEach(([tagName, attrName]) => {
        $(`${tagName}`).each(async (idx, elem) => {
            console.log("Tagname: ", tagName);
            const elemHref = $(elem).attr(`${attrName}`);
            if (!elemHref) {
                return;
            }
            const assetPath = assetSrcToAssetPath(elemHref, url);
            //remove mkdir, place all files on one level
            console.log("FilesDirPath: ", filesDirPath);
            const filePath = `${filesDirPath}/${assetPath}`.replace('//', '/');
            $(elem).attr(`${attrName}`, filePath);
            const assetUrl= new URL(elemHref, url);
            console.log("FilePath: ", filePath);
            assets.push({filePath, assetUrl: assetUrl.href});
        })
    })
    const htmlParsed = $.html();
    return { assets, htmlParsed };
};

const downloadAsset = async ({filePath, assetUrl}, filesDirPath) => {
    const result = await axios.get(`${assetUrl.toString()}`, {
        responseType: 'arraybuffer',
    });
    const fileChunks = filePath.split('/');
    let fileName = fileChunks[fileChunks.length-1];
    return await writeFile( `${filesDirPath}/${fileName}`, result.data);
}

const downloadResources = async ( assets, filesDirPath) => {
    //several tasks for listr
    const tasks = assets.map(({filePath, assetUrl}) => ({
            title: assetUrl,
            task: () => downloadAsset({filePath, assetUrl}, filesDirPath),
        })
    );
    const listr = new Listr(tasks);
    return listr.run().catch(err => {
        console.error(err);
    });
    //_.noop();
};

const  pageLoad = (url, dir = '.') => {
    console.log("PageLoad started!");
    let htmlPath = '';
    let htmlText = '';
    let filesDirPath = urlToDirName(url);
    return axios.get(url).then((resp) => {
        const protocols = /https?:\/\//;
        htmlPath = urlToFileName(url);
        console.log('DIR: ', dir);
        if (dir !== '.') {
            htmlPath = dir + '/' + htmlPath;
            filesDirPath = dir + '/' + filesDirPath;
        }
        console.log('htmlPath: ' + htmlPath);
        console.log('filesDirPath: ' + filesDirPath);
        htmlText = resp.data;
        return resp;
    }).then( (resp) => {
        return mkdir(filesDirPath, {recursive: true}).then( () => resp );
    }).then( (resp) => {
       const { assets, htmlParsed } = parseHTML(filesDirPath, htmlText, url);
        downloadResources(assets, filesDirPath);
        return resp;
    }).then( () => {
        writeFile(htmlPath, htmlText);
    })
};

export default pageLoad;
