#!/usr/bin/env node
import { Command } from 'commander';
import pageLoad from '../src/page-loader.js';

const cli = new Command();
cli
  .description('Loads a certain html page, using axios.')
  .helpOption(true)
  .version('1.001')
  .option('-o, --output <dir>', 'output directory', process.cwd())
  .arguments('<url>')
  .action((link, options) => {
    pageLoad(link, options.output).then(() => {
    }).catch((error) => {
      console.error('Error messge:', error.message);
      process.exit(1);
    });
  })
  .parse(process.argv);
// catch exception  ( No exceptions in page loader.js)
