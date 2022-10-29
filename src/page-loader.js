import { writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import axios from 'axios';
import { load } from 'cheerio';
import { dirname } from 'node:path';
import  _  from 'lodash';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = dirname(__filename);
const assetSrcToAssetPath = (assetSrc, baseURL) => {
	if (!assetSrc) {
		return;
	}
  if (assetSrc.startsWith('http:')) {
    return assetSrc;
  }
   const tempLink = new URL(assetSrc, new URL (baseURL));
   return `${tempLink.host}${tempLink.pathname}`;
  }

const assetTags = {'img': 'src', 'link': 'href', 'script': 'src'};

const pageLoad = (url, dir = '.') => {
  //console.log('link: ', url, 'dir: ', dir);
  axios.get(url).then(async (resp) => {
    const protocols = /https?:\/\//;
    const basePath = `${url.replace(protocols, '').split('.').join('-')}`;
    //remove extension
    //use URL
    //fileName, dirName move to functions
    const htmlPath  = `${dir}/${basePath.split('/').join('-').slice(0,-1)}.html`;
    const filesDirPath = `${dir}/${basePath}_files`;
    //console.log('base url: ', url);
    console.log('basePath: ' + basePath);
    console.log('htmlPath: ' + htmlPath);
    //console.log('filesDirPath: ' + filesDirPath);
      await mkdir(filesDirPath, {recursive:true});
      const $ = load(resp.data);
      _.toPairs(assetTags).forEach (([tagName, attrName]) => {
      	  $(`${tagName}`).each ( async (idx, elem) => {
	        const elemHref = $(elem).attr(`${attrName}`);
	        if (!elemHref) {
	        	return;
	        }
	        const assetPath = assetSrcToAssetPath(elemHref, url);
	        await mkdir(dirname(`${filesDirPath}/${assetPath}`.replace('//', '/')), {recursive:true});
	        const finalURL = new URL (elemHref, url);
	        if (finalURL.origin === new URL (url).origin) {
	        	//console.log('assetPath: ' + assetPath);
	        	//console.log(`finalURL: ${finalURL.toString()}`);
		        const result = await axios.get(`${finalURL.toString()}`, {
		            responseType: 'arraybuffer',
		        });
		   await writeFile(`${filesDirPath}/${assetPath}`, result.data);
    		}

      	});
      })

    	await writeFile(`${htmlPath}`, resp.data);
  });
};

export default pageLoad;
