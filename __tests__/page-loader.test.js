import nock from 'nock';
import { readFile, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import pageLoad from '../src/page-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);

const readFixtureFileContent = (fileName, encoding = 'utf-8') => readFile(getFixturePath(fileName), encoding);

nock.disableNetConnect();
const scope = nock('https://ru.hexlet.io').persist();

const codesToTest = [
  404,
  401,
  505,
  503,
];

const errorDescriptions = {
  404: 'Page not found',
  401: 'Unauthorized',
  505: 'Internal server error',
  503: 'Service unavailable',
};

let outputDir = null;

const assets = [
  {
    urlPath: '/assets/professions/nodejs.png',
    fixturePath: './expected/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png',
    outputPath: 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png',
    encoding: null,
  },
  {
    urlPath: '/assets/professions/test.css',
    fixturePath: './expected/ru-hexlet-io-courses_files/test.css',
    outputPath: 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-test.css',
    encoding: 'utf-8',
  },
  {
    urlPath: '/assets/professions/test.js',
    fixturePath: './expected/ru-hexlet-io-courses_files/test.js',
    outputPath: 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-test.js',
    encoding: 'utf-8',
  },
];
beforeAll(async () => {
  outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
});

describe('Page loader', () => {
  describe('error codes tests', () => {
    test.each(codesToTest)('testing code %s', async (code) => {
      scope.get(`/test${code}`)
        .reply(code, errorDescriptions[code]);
      scope.get(`/test${code}`)
        .reply(code, errorDescriptions[code]);
      await expect(pageLoad(`https://ru.hexlet.io/test${code}`)).rejects.toThrow(`${code}`);
    });
  });

  it('main test', async () => {
    const expectedHTML = await readFixtureFileContent('./expected/ru-hexlet-io-courses.html');
    const htmlToDownload = await readFixtureFileContent('./ru-hexlet-io-courses.html');
    const expectedFiles = {};
    await Promise.all(assets.map(async (asset) => {
      expectedFiles[asset.urlPath] = await readFixtureFileContent(
        asset.fixturePath,
        asset.encoding,
      );
      scope.get(asset.urlPath).reply(200, expectedFiles[asset.urlPath]);
    }));
    scope.get('/courses').reply(200, htmlToDownload);
    // scope.get('/assets/professions/nodejs.png').reply(200, expectedPNG);

    await pageLoad('https://ru.hexlet.io/courses', outputDir);
    const actualHTML = await readFile(`${outputDir}/ru-hexlet-io-courses.html`, 'utf-8');
    const actualFiles = {};
    await Promise.all(assets.map(async (asset) => {
      actualFiles[asset.urlPath] = await readFile(`${outputDir}/${asset.outputPath}`, asset.encoding);
      // const file = await readFixtureFileContent(`${fileName}`);
    }));
    /* await readdir((`${outputDir}/ru-hexlet-io-courses_files`), (err, filenames) => {
      filenames.forEach(async (filename) => {
        const file = await readFile(`${outputDir}/${filename}`, 'utf-8');
        actualFiles[filename] = file;
        console.log('path to file: ', `/assets/professions/${filename}`);
        // await expect(actualFiles[filename]).toEqual(expectedFiles[filename]);
      });
    }); */
    // console.log('Expected Files: ', expectedFiles);
    const expectedFileNames = Object.keys(expectedFiles);
    await Promise.all(expectedFileNames.map(async (fileName) => {
      await expect(actualFiles[fileName]).toEqual(expectedFiles[fileName]);
    }));
    await expect(actualHTML).toEqual(expectedHTML);
    // await expect(actualPNG).toEqual(expectedPNG);
  });

  it('load page: file system errors', async () => {
    const pageUrl = 'http://localhost/';
    const rootDirPath = '/sys';
    await expect(
      pageLoad(pageUrl.toString(), rootDirPath),
    ).rejects.toThrow();
  });
});
