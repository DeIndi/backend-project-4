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

test('404 / page not found test', async () => {
  scope.get('/test404')
    .reply(404, 'Page not found');
  await expect(pageLoad('https://ru.hexlet.io/test404')).rejects.toThrow('404');
});

test('401 / unauthorized test', async () => {
  scope.get('/test401')
    .reply(401, 'Unauthorized');
  await expect(pageLoad('https://ru.hexlet.io/test401')).rejects.toThrow('401');
  // check if pageLoad result contains error code
});

test('500 / internal server error test', async () => {
  scope.get('/test500')
    .reply(500, 'Unauthorized');
  await expect(pageLoad('https://ru.hexlet.io/test500')).rejects.toThrow('500');
});

test('503 / service unavailable test', async () => {
  scope.get('/test503')
    .reply(503, 'Unauthorized');
  await expect(pageLoad('https://ru.hexlet.io/test503')).rejects.toThrow('503');
});
// move nock before all tests

test('load page: file system errors', async () => {
  const pageUrl = 'http://localhost/';
  const rootDirPath = '/sys';
  await expect(
    pageLoad(pageUrl.toString(), rootDirPath),
  ).rejects.toThrow();
});
