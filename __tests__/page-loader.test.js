import nock from 'nock';
import { readFile, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { expect } from '@jest/globals';
import pageLoad from '../src/page-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);

const pageUrl = 'https://ru.hexlet.io';

const readFixtureFileContent = (fileName, encoding = 'utf-8') => readFile(getFixturePath(fileName), encoding);

nock.disableNetConnect();
const scope = nock(pageUrl).persist();

const serverErrors = [
  {
    code: 404,
    description: 'Page not found',
  },
  {
    code: 401,
    description: 'Unauthorized',
  },
  {
    code: 505,
    description: 'Internal server error',
  },
  {
    code: 503,
    description: 'Service unavailable',
  },
];

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

describe('Page loader', () => {
  let expectedHTML;
  const expectedFiles = {};
  beforeAll(async () => {
    expectedHTML = await readFixtureFileContent('./expected/ru-hexlet-io-courses.html');
    const htmlToDownload = await readFixtureFileContent('./ru-hexlet-io-courses.html');
    await Promise.all(assets.map(async (asset) => {
      expectedFiles[asset.urlPath] = await readFixtureFileContent(
        asset.fixturePath,
        asset.encoding,
      );
      scope.get(asset.urlPath).reply(200, expectedFiles[asset.urlPath]);
    }));
    scope.get('/courses').reply(200, htmlToDownload);
  });
  describe('negative tests', () => {
    beforeAll(async () => {
      outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
    });
    test.each(serverErrors)('testing code %s', async (error) => {
      scope.get(`/test${error.code}`)
        .reply(error.code, error.desciption);
      await expect(pageLoad(`${pageUrl}/test${error.code}`)).rejects.toThrow(`${error.code}`);
    });
    it('file system error', async () => {
      const rootDirPath = '/sys';
      await expect(
        pageLoad(pageUrl.toString(), rootDirPath),
      ).rejects.toThrow();
    });
    it('Directory not exists', async () => {
      const rootDirPath = '/notExisting';
      await expect(
        pageLoad(`${pageUrl}/courses`, rootDirPath),
      ).rejects.toThrow('EACCES: permission denied');
    });
    it('Directory not available', async () => {
      const rootDirPath = '/sys';
      await expect(
        pageLoad(`${pageUrl}/courses`, rootDirPath),
      ).rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('positive tests', () => {
    beforeEach(async () => {
      outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
    });
    it('successful page download with output option', async () => {
      await pageLoad(`${pageUrl}/courses`, outputDir);
      const actualHTML = await readFile(`${outputDir}/ru-hexlet-io-courses.html`, 'utf-8');
      const actualFiles = {};
      await Promise.all(assets.map(async (asset) => {
        actualFiles[asset.urlPath] = await readFile(`${outputDir}/${asset.outputPath}`, asset.encoding);
      }));
      const expectedFileNames = Object.keys(expectedFiles);
      await Promise.all(expectedFileNames.map(async (fileName) => {
        await expect(actualFiles[fileName]).toEqual(expectedFiles[fileName]);
      }));
      await expect(actualHTML).toEqual(expectedHTML);
    });

    it('successful page download', async () => {
      const curDir = process.cwd();
      process.chdir(outputDir);
      await pageLoad(`${pageUrl}/courses`);
      const actualHTML = await readFile(`${outputDir}/ru-hexlet-io-courses.html`, 'utf-8');
      const actualFiles = {};
      await Promise.all(assets.map(async (asset) => {
        actualFiles[asset.urlPath] = await readFile(`${outputDir}/${asset.outputPath}`, asset.encoding);
      }));
      const expectedFileNames = Object.keys(expectedFiles);
      // eslint-disable-next-line max-len
      expectedFileNames.forEach((fileName) => expect(actualFiles[fileName]).toEqual(expectedFiles[fileName]));
      await expect(actualHTML).toEqual(expectedHTML);
      process.chdir(curDir);
    });
  });
});
