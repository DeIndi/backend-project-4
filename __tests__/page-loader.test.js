import nock from 'nock';
import { writeFile, readFile, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pageLoad from '../src/page-loader.js';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);

const readFileContent = async (fileName) => await readFile(getFixturePath(fileName));

nock.disableNetConnect();

//beforeEach 

test('main test', async () => {
	//hardcode dir name
	//fixture to model dir
	//for each tested to have expected in fixtures
	const expectedHTML = await readFileContent('./expected/www-columbia-edu-~fdc.html');
	const expectedImgs =  [
		await readFileContent('./expected/www-columbia-edu/~fdc/_files/www.columbia.edu/~fdc/fdc2.jpg'),
	];
	//for several - await Promise.all

	//abstraction with data

	const scope = nock('http://www.columbia.edu/~fdc')
	  .persist()
	  .get('/')
	  .reply(200, expectedHTML)
	  .get('/fdc2.jpg')
	  .reply(200, expectedImgs[0])
	  //several get reply
	  //several addresses
	  const expected = [];
	  expected.push(expectedHTML);
	  expected.push(expectedImgs[0]);
	  //add output dir


	  const outputDir = await mkdtemp(`${os.tmpdir()}/page-loader-test`);
	  //const outputDir = "test2";
	  console.log("OUTPUT DIR: ", outputDir);
	  await pageLoad('http://www.columbia.edu/~fdc', outputDir);
	  //const resultHTML = await readFile(`${outputDir}/www-columbia-edu-~fdc.html`);
	  //const resultImg = await readFile(`${outputDir}/_files/www.columbia.edu/~fdc/fdc2.jpg`);
      //expect(resultHTML).toEqual(expectedHTML);
      //expect(resultImg).toEqual(expectedImgs[0]);
      
});
