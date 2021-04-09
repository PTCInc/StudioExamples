/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
const fs = require('fs-extra');
const argv = require('yargs').argv;
const path = require('path');
const VESPublish = require('ves-publish');
var appPath = __dirname;
/**
 * This allows command line publish from the project dir (it is not used by studio)
 */

function readProjectSettingsSync(appBaseDir) {
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var config = path.join(appBaseDir, 'appConfig.json');
  var data = fs.readJsonSync(config);
  return data;
}

function publish(config) {
  var vesArgs = {
    baseDir: config.path,
    name: config.settings.name,
    server: config.settings.thingworxServer,
    requestConfig: config.requestConfig,
  };

  // eslint-disable-next-line no-console
  return VESPublish.publishApp(vesArgs, console.log, console.error).then(function () {
    var metadata = {};
    try {
      metadata = fs.readJsonSync(path.join(vesArgs.baseDir, 'dist', 'WEB-INF', 'metadata.json'));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('could not find a metadata.json file.', e);
    }

    return VESPublish.setAccessType(vesArgs, metadata.accessType === 'public');
  });
}
publish({
  path: __dirname,
  settings: readProjectSettingsSync(),
  requestConfig: {
    strictSSL: argv.sslValidate,
    headers: {
      Authorization: argv.token
        ? 'Bearer ' + argv.token
        : 'Basic ' + Buffer.from(argv.user + ':' + argv.password).toString('base64'),
      'x-requested-with': '^HXn4_uG3g@7u1Q-',
    },
  },
});
