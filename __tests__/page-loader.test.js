import nock from 'nock';
import { readFile, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import pageLoad from '../src/page-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);

const readFileContent = (fileName) => readFile(getFixturePath(fileName));

nock.disableNetConnect();

// beforeEach

test('main test', async () => {
  const expectedHTML = await readFileContent('./ru-hexlet-io-courses.html');
  const expectedImgs = [
    await readFileContent('./expected/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png'),
  ];

  const scope = nock(' https://ru.hexlet.io')
    .persist()
    .get('/courses')
    .reply(200, expectedHTML)
    .get('/assets/professions/nodejs.png')
    .reply(200, expectedHTML);
  const expected = [];
  expected.push(expectedHTML);
  const outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
  // const outputDir = "test2";
  console.log('OUTPUT DIR: ', outputDir);
  await pageLoad('https://ru.hexlet.io/courses', outputDir);
});

test('404 / page not found test', async () => {
  const scope = nock(' https://testpage.testdomain')
    .persist()
    .get('/')
    .reply(404, 'Page not found');
  await expect(pageLoad('https://testpage.testdomain')).rejects.toThrow();
});

test('401 / unauthorized test', async () => {
  const scope = nock(' https://testpage.testdomain')
    .persist()
    .get('/')
    .reply(401, 'Unauthorized');
  await expect(pageLoad('https://testpage.testdomain')).rejects.toThrow();
  // check if pageLoad result contains error code
});

test('500 / internal server error test', async () => {
  const scope = nock(' https://testpage.testdomain')
    .persist()
    .get('/')
    .reply(500, 'Internal server error');
  await expect(pageLoad('https://testpage.testdomain')).rejects.toThrow();
});

test('503 / service unavailable test', async () => {
  const scope = nock(' https://testpage.testdomain')
    .persist()
    .get('/')
    .reply(503, 'Service unavailable');
  await expect(pageLoad('https://testpage.testdomain')).rejects.toThrow();
});
// move nock before all tests

test.only('load page: file system errors', async () => {
  const pageUrl = 'http://localhost/';
  const rootDirPath = '/sys';
  await expect(
    pageLoad(pageUrl.toString(), rootDirPath),
  ).rejects.toThrow();
});
