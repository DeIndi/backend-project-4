import nock from 'nock';
import { readFile, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import pageLoad from '../src/page-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);

const readFixtureFileContent = (fileName) => readFile(getFixturePath(fileName), 'utf8');

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

describe('error codes tests', () => {
  describe.each(codesToTest)('testing code %s', (code) => {
    scope.get(`/test${code}`)
      .reply(code, errorDescriptions[code]);
    test('404 / page not found test', async () => {
      scope.get(`/test${code}`)
        .reply(404, 'Page not found');
      await expect(pageLoad(`https://ru.hexlet.io/test${code}`)).rejects.toThrow(`${code}`);
    });
  });
});
// beforeEach

test('main test', async () => {
  const expectedHTML = await readFixtureFileContent('./expected/ru-hexlet-io-courses.html');
  const expectedPNG = await readFixtureFileContent('./expected/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
  const htmlToDownload = await readFixtureFileContent('./ru-hexlet-io-courses.html');
  /* const expectedImgs = [
    // eslint-disable-next-line max-len
    await readFixtureFileContent(
    './expected/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png
    '),
  ]; */
  scope.get('/courses').reply(200, htmlToDownload);
  scope.get('/assets/professions/nodejs.png').reply(200, expectedPNG);
  const expected = [];
  expected.push(expectedHTML);
  const outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
  // const outputDir = "test2";
  console.log('OUTPUT DIR: ', outputDir);
  await pageLoad('https://ru.hexlet.io/courses', outputDir);
  console.log('OUTPUT DIR after pageLoad: ', outputDir);
  const actualHTML = await readFile(`${outputDir}/ru-hexlet-io-courses.html`, 'utf8');
  const actualPNG = await readFile(`${outputDir}/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png`, 'utf8');
  console.log('OUTPUT DIR AFTER readFileContent: ', outputDir);
  console.log('actualHTML: ', actualHTML);
  console.log('expectedHTML: ', expectedHTML);
  await expect(actualHTML).toEqual(expectedHTML);
  await expect(actualPNG).toEqual(expectedPNG);
});

test('load page: file system errors', async () => {
  const pageUrl = 'http://localhost/';
  const rootDirPath = '/sys';
  await expect(
    pageLoad(pageUrl.toString(), rootDirPath),
  ).rejects.toThrow();
});
