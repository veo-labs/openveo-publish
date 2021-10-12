#!/usr/bin/env node

/**
 * Builds back office and front client files.
 *
 * It needs to be run from project root directory.
 *
 * Usage:
 *
 * # Build back office and front office clients for development
 * $ build
 *
 * # Build back office and front office clients for production
 * $ build -p
 *
 * # Build only back office client for development
 * $ build -b
 *
 * # Build only back office client for production
 * $ build -b -p
 *
 * # Build only front office client for development
 * $ build -f
 *
 * # Build only front office client for production
 * $ build -f -p
 */

'use strict';

const {exec} = require('child_process');
const path = require('path');

const applicationConf = require('../conf.js');

/**
 * Logs given message to stdout with a prefix.
 *
 * @param {String} message the message to log
 */
function log(message) {
  console.log(`build > ${message}`);
}

/**
 * Parses command line arguments.
 *
 * @return {Object} args The list of parsed arguments
 */
function getArguments() {
  const args = {
    production: false,
    front: true,
    back: true
  };

  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case '-p':
        args.production = true;
        break;
      case '-f':
        args.front = true;
        args.back = false;
        break;
      case '-b':
        args.front = false;
        args.back = true;
        break;
      default:
        console.log(`unexpected option ${process.argv[i]}`);
        break;
    }
  }

  return args;
}

/**
 * Compiles and concat JavaScript files.
 *
 * @param {Array} filesPaths The list of files paths to compile and concat
 * @param {String} outputPath The file output path
 * @return {Promise} Promise resolving when JavaScript files have been compiled
 */
async function compileJavaScriptFiles(filesPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `npx uglifyjs -c -m -o ${outputPath} -- ${filesPaths.join(' ')}`;
    log(`${process.cwd()} > ${command}`);
    exec(command, {cwd: process.cwd()}, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });
}

/**
 * Compiles back office client SCSS files.
 *
 * @param {String} scssDirectoryPath The path where to find SCSS files
 * @param {String} outputPath The destination directory path
 * @param {Boolean} [production] true to build for production, false otherwise
 * @return {Promise} Promise resolving when SCSS files have been compiled
 */
async function compileScssFiles(scssDirectoryPath, outputPath, production) {
  return new Promise((resolve, reject) => {
    const command = `compass compile -c ./compass.rb \
--force \
--sass-dir ${scssDirectoryPath} \
--css-dir ${outputPath} \
${production ? '-e production -s compressed --no-sourcemap' : ''}
`;
    log(`${process.cwd()} > ${command}`);
    exec(command, {cwd: process.cwd()}, (error, stdout, stderr) => {
      if (error) return reject(error);
      console.log(stdout);
      return resolve();
    });
  });
}

/**
 * Resolves given files paths with the given prefix.
 *
 * @param {Array} filesPaths The list of files paths to resolve
 * @return {Array} The list of resolved files paths
 */
function resolveFilesPaths(filesPaths, prefix) {
  return filesPaths.map((filePath) => {
    return path.join(prefix, filePath);
  });
}

/**
 * Builds back office client and front office client.
 */
async function main() {
  const args = getArguments();
  const assetsPath = './assets';
  const clientPath = './app/client';

  if (args.back) {
    const backOfficeClientScssPath = path.join(clientPath, 'admin/compass/sass');
    const backOfficeClientCssPath = path.join(assetsPath, 'be/css');

    log(`Compile back office client SCSS files into ${backOfficeClientCssPath}`);
    await compileScssFiles(backOfficeClientScssPath, backOfficeClientCssPath, args.production);
  }

  if (args.production) {
    if (args.back) {
      const backOfficeClientJavaScriptPath = path.join(clientPath, 'admin/js');
      const backOfficeClientLibraryDistPath = path.join(assetsPath, applicationConf.backOffice.scriptLibFiles.prod[0]);
      const backOfficeClientDistPath = path.join(assetsPath, applicationConf.backOffice.scriptFiles.prod[0]);

      log(`Compile back office client library to ${backOfficeClientLibraryDistPath}`);
      await compileJavaScriptFiles(
        resolveFilesPaths(applicationConf.backOffice.scriptLibFiles.dev, backOfficeClientJavaScriptPath),
        backOfficeClientLibraryDistPath
      );

      log(`Compile back office client to ${backOfficeClientDistPath}`);
      await compileJavaScriptFiles(
        resolveFilesPaths(applicationConf.backOffice.scriptFiles.dev, backOfficeClientJavaScriptPath),
        backOfficeClientDistPath
      );
    }

    if (args.front) {
      const frontOfficeClientJavaScriptPath = path.join(clientPath, 'front/js');
      const frontOfficeClientDistPath = path.join(assetsPath, applicationConf.custom.scriptFiles.publishPlayer.prod[0]);

      log(`Compile front office client to ${frontOfficeClientDistPath}`);
      await compileJavaScriptFiles(
        resolveFilesPaths(applicationConf.custom.scriptFiles.publishPlayer.dev, frontOfficeClientJavaScriptPath),
        frontOfficeClientDistPath
      );
    }
  }
}

main();
