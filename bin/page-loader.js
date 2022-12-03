#!/usr/bin/env node
import { Command } from 'commander';
import pageLoad from '../src/page-loader.js';

const cli = new Command();
cli.description('Loads a certain html page, using axios.');
cli.usage('[options] <url>');
cli.addHelpCommand(false);
cli.helpOption(true);
cli.version('1.001');
cli.option('-o, --output <dir>', 'output directory');
cli.arguments('<url>');
cli.action((link, options) => {
  pageLoad(link, options.output).then(() => {
    console.log('Page loaded!');
  }).catch((error) => {
    console.error('Error messge:', error.message);
    process.exit(1);
  });
});
cli.parse(process.argv);
// catch exception  ( No exceptions in page loader.js)
