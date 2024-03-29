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

const coursesUrl = new URL('https://ru.hexlet.io/courses');
const htmlFileName = 'ru-hexlet-io-courses.html';

const readFixtureFileContent = (fileName, encoding = 'utf-8') => readFile(getFixturePath(fileName), encoding);

nock.disableNetConnect();
const scope = nock(coursesUrl.origin).persist();

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
  let expectedFiles = {};
  beforeAll(async () => {
    expectedHTML = await readFixtureFileContent(`./expected/${htmlFileName}`);
    const htmlToDownload = await readFixtureFileContent(`./${htmlFileName}`);
    const expectedFilePairs = await Promise.all(assets.map(async (asset) => [asset.urlPath,
      await readFixtureFileContent(asset.fixturePath, asset.encoding)]));
    expectedFiles = Object.fromEntries(expectedFilePairs);
    assets.forEach((asset) => {
      scope.get(asset.urlPath).reply(200, expectedFiles[asset.urlPath]);
    });
    scope.get('/courses').reply(200, htmlToDownload);
  });
  describe('negative tests', () => {
    beforeAll(async () => {
      outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
    });
    test.each(serverErrors)('testing code %s', async (error) => {
      scope.get(`/test${error.code}`)
        .reply(error.code, error.desciption);
      await expect(pageLoad(`${coursesUrl.origin}/test${error.code}`)).rejects.toThrow(`${error.code}`);
    });
    it('file system error', async () => {
      const rootDirPath = '/sys';
      await expect(
        pageLoad(coursesUrl.origin, rootDirPath),
      ).rejects.toThrow();
    });
    it('Directory not exists', async () => {
      const rootDirPath = '/notExisting';
      await expect(
        pageLoad(`${coursesUrl.href}`, rootDirPath),
      ).rejects.toThrow('EACCES: permission denied');
    });
    it('Directory not available', async () => {
      const rootDirPath = '/sys';
      await expect(
        pageLoad(`${coursesUrl.href}`, rootDirPath),
      ).rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('positive tests', () => {
    const currentDir = process.cwd();
    beforeEach(async () => {
      outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
    });
    afterEach(async () => {
      process.chdir(currentDir);
    });
    const expectPageDownloaded = async () => {
      const actualHTML = await readFile(`${outputDir}/ru-hexlet-io-courses.html`, 'utf-8');
      let actualFiles = {};
      const actualFilePairs = await Promise.all(assets.map(async (asset) => [asset.urlPath, await readFile(`${outputDir}/${asset.outputPath}`, asset.encoding)]));
      actualFiles = Object.fromEntries(actualFilePairs);
      const expectedFileNames = Object.keys(expectedFiles);
      expectedFileNames.forEach((fileName) => expect(actualFiles[fileName])
        .toEqual(expectedFiles[fileName]));
      expect(actualHTML).toEqual(expectedHTML);
    };
    it('successful page download with output option', async () => {
      await pageLoad(`${coursesUrl.href}`, outputDir);
      await expectPageDownloaded();
    });
    it('successful page download', async () => {
      process.chdir(outputDir);
      await pageLoad(`${coursesUrl.href}`);
      await expectPageDownloaded();
    });
    // fix linter for expect assertion
  });
});
