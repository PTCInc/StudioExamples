/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
var gulp = require('gulp');
var fs = require('fs-extra');
// eslint-disable-next-line no-unused-vars
var gulpDebug = require('gulp-debug');
var path = require('path');
var del = require('del');
var argv = require('yargs').argv;
var _ = require('lodash');
var $ = require('cheerio');
var swig = require('swig');
var Q = require('q');
var sanitize = require('sanitize-filename');
var xmlescape = require('xml-escape');

const log = require('studio-log').getLogger('ar-extension:gulp-shared');
const zipHelper = require('./zipHelper.js');
const ves_extension = require('ves-ar-extension');
const { isEmpty } = require('lodash');
const preservetime = ves_extension.preservetime;
const DEFAULT_VIEW_NAME = 'Home';

swig.setDefaults({
  autoescape: false,
  cache: false,
  varControls: ['<%=', '=%>'],
});

var appPath = __dirname;

function getScaffoldDir(params) {
  var scaffoldDir;
  if (params.settings && params.settings.scaffoldDirectory) {
    scaffoldDir = params.settings.scaffoldDirectory;
  } else {
    scaffoldDir = ves_extension.scaffoldDirectory;
    if (!scaffoldDir && params.NODE_MODULE_DIR) {
      scaffoldDir = path.join(params.NODE_MODULE_DIR, 'ves-ar-extension', 'src', 'src-scaffold');
    } else if (!scaffoldDir) {
      scaffoldDir = path.join(appPath, 'src-scaffold');
    }
  }
  return scaffoldDir;
}

/**
 * @param {string} appBaseDir - the path to the project, if omitted it will default to the current dir of this file
 * @returns {string} the path to the project's dist dir, where the runtime artifacts for the project are built/copied
 */
function getDistDir(appBaseDir) {
  let projectDir = appBaseDir || appPath;
  return path.join(projectDir, 'dist');
}

const APP_CONFIG_PROPERTIES_TO_COPY = ['projectType', 'viewType', 'version'];
function copySrc(cb, appBaseDir, scaffoldDir, params) {
  log.debug('copySrc');
  if (!appBaseDir) {
    appBaseDir = appPath;
  }

  const settings = params ? params.settings : fs.readJsonSync('appConfig.json');
  const distDir = getDistDir(appBaseDir);
  fs.ensureDirSync(distDir);
  fs.writeJsonSync(path.join(distDir, 'appConfig.json'), _.pick(settings, APP_CONFIG_PROPERTIES_TO_COPY), {
    spaces: 2,
  });

  if (!params) {
    params = {};
    if (!params.NODE_MODULE_DIR && fs.existsSync(path.join('..', 'node_modules'))) {
      params.NODE_MODULE_DIR = path.join('..', 'node_modules');
    }
  }
  if (!params.settings) {
    params.settings = settings;
  }
  scaffoldDir = getScaffoldDir(params);
  if (settings.thumbnail) {
    // copy thumbnail to public dir DT-6919
    fs.copySync(appBaseDir + '/src/phone/resources/' + settings.thumbnail, distDir + '/public/' + settings.thumbnail, {
      clobber: true,
      overwrite: true,
    });
  }
  // if view template has a resources folder - copy it
  if (settings.viewTemplatePath) {
    var viewTemplateResorcesPath = path.join(path.dirname(settings.viewTemplatePath), 'resources');
    if (fs.existsSync(viewTemplateResorcesPath)) {
      fs.copySync(viewTemplateResorcesPath, appBaseDir + '/src/phone/resources', { clobber: true, overwrite: true });
    }
  }

  var srcDeferred = Q.defer();
  var sharedDeferred = Q.defer();
  var metadataJsonDeferred = Q.defer();
  var cssDeferred = Q.defer();
  var scaffoldDeferred = Q.defer();

  gulp
    .src([appBaseDir + '/src/phone/**/*'], { nodir: true })
    //.pipe(gulpDebug({title: 'copy-src-components'}))
    .pipe(gulp.dest(distDir + '/app'))
    .pipe(preservetime())
    .on('end', srcDeferred.resolve)
    .on('error', srcDeferred.reject);

  gulp
    .src(
      [
        appBaseDir + '/src/shared/**/*',
        '!' + appBaseDir + '/src/shared/styles/**',
        '!' + appBaseDir + '/src/shared/components/metadata.json',
      ],
      { nodir: true }
    )
    //.pipe(gulpDebug({title: 'copy-src-shared'}))
    .pipe(preservetime())
    .pipe(gulp.dest(distDir + '/app/shared'))
    .on('end', sharedDeferred.resolve)
    .on('error', sharedDeferred.reject);

  gulp
    .src(appBaseDir + '/src/shared/components/metadata.json')
    //.pipe(gulpDebug({title: 'JSON'}))
    .pipe(gulp.dest(distDir + '/WEB-INF'))
    .pipe(preservetime())
    .on('end', metadataJsonDeferred.resolve)
    .on('error', metadataJsonDeferred.reject);

  // exclude the design time css files, those are not needed in the runtime
  gulp
    .src([appBaseDir + '/css/*.css', '!' + appBaseDir + '/css/*-designtime.css'])
    .pipe(gulp.dest(distDir + '/css'))
    .on('end', cssDeferred.resolve)
    .on('error', cssDeferred.reject);

  gulp
    .src([scaffoldDir + '/phone/**/*', '!' + scaffoldDir + '/phone/lib/js/ptc/thingview/libthingview.js'], {
      nodir: true,
    })
    //.pipe(gulpDebug({title: 'cp-src-scaffold'}))
    .pipe(gulp.dest(distDir))
    .pipe(preservetime())
    .on('end', scaffoldDeferred.resolve)
    .on('error', scaffoldDeferred.reject);

  return Q.all([
    srcDeferred.promise,
    sharedDeferred.promise,
    metadataJsonDeferred.promise,
    cssDeferred.promise,
    scaffoldDeferred.promise,
  ]);
}

function clean(cb, appBaseDir) {
  log.debug('clean');
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var distPath = getDistDir(appBaseDir);
  var syncResult = del.sync([distPath], { force: true });
  if (cb && typeof cb === 'function') {
    cb();
  }
  return syncResult;
}

/**
 * Return localized view name or false if there is no localization
 * @param translate
 * @private
 */
function _getLocalizedViewName(translate) {
  return _.isFunction(translate) && translate('default-view-name');
}

/**
 * Translate default Home view name
 * @param {string} appPath - path to the project that's being initialized
 * @param {Object} settings - the initial settings of the project
 * @param {Function} translate - function to lookup the translated text for the initial view
 * @private
 */
function _localizeDefaultView(appPath, settings, translate) {
  const localizedViewName = _getLocalizedViewName(translate);
  if (!localizedViewName || localizedViewName === DEFAULT_VIEW_NAME) {
    return;
  }

  const projectDeviceName = _getProjectDeviceName(settings);
  let defaultViewConfig = _.find(settings.targets[projectDeviceName].components, { name: DEFAULT_VIEW_NAME });
  if (defaultViewConfig) {
    let currentViewName = defaultViewConfig.name;

    // change the name of the default view name in the "targets" object in the appConfig.json
    defaultViewConfig.name = localizedViewName;
    defaultViewConfig.fileName = sanitize(localizedViewName);
    defaultViewConfig.title = localizedViewName;
    fs.writeJsonSync(path.join(appPath, 'appConfig.json'), settings, { spaces: 2 });

    // rename the default view files (Home.json and Home.js) to match the targets in the appConfig.json file
    fs.renameSync(
      path.join(appPath, `src/phone/components/${currentViewName}.json`),
      path.join(appPath, `src/phone/components/${defaultViewConfig.fileName}.json`)
    );
    fs.renameSync(
      path.join(appPath, `src/phone/components/${currentViewName}.js`),
      path.join(appPath, `src/phone/components/${defaultViewConfig.fileName}.js`)
    );
  }
}

/**
 * Set the default experience title and set experience localized viewName in the metadata.json file
 * @param {String} appPath
 * @param {String} title
 * @param {Function} translate
 */
function initializeExperience(appPath, title, translate) {
  //Initialize the title in the first experience
  var sharedMetadataJsonPath = path.join(appPath, 'src', 'shared', 'components', 'metadata.json');
  var metadata = fs.readJsonSync(sharedMetadataJsonPath);
  if (metadata && metadata.experiences) {
    if (!metadata.experiences[0].title.en) {
      metadata.experiences[0].title.en = title;
    }

    const localizedViewName = _getLocalizedViewName(translate);
    if (localizedViewName && localizedViewName !== DEFAULT_VIEW_NAME) {
      metadata.experiences[0].viewName = localizedViewName;
    }

    fs.writeJsonSync(sharedMetadataJsonPath, metadata, { spaces: 2 });
  }
}

/**
 * Return project device name if exists or return default device name
 * @param settings
 */
function _getProjectDeviceName(settings) {
  let deviceName = settings.device.name;
  return settings.targets[deviceName] ? deviceName : 'phone';
}

/**
 * Return component from 'targets/components' for which we want to create .json and .js files during view initialization
 * @param settings
 */
function _getInitViewComponent(settings) {
  const projectDeviceName = _getProjectDeviceName(settings);
  const targetsComponents = settings.targets[projectDeviceName].components;
  let component = _.find(targetsComponents, { viewType: settings.viewType });

  if (_.isUndefined(component)) {
    component = _.find(targetsComponents, { viewType: 'ar' });
  }

  return component;
}

function init(templatesPath, params) {
  try {
    let settings = params.settings;
    _localizeDefaultView(appPath, settings, params.translate);
    initializeExperience(appPath, settings.name, params.translate);
  } catch (err) {
    log.error(err);
  }
}

/**
 * Retrieves the app params from the Data.json file
 * @param data Contents of the Data.json file as a JSON object
 * @return {{}} JSON Object where the key is the param id and the value is the app param attributes
 */
function getAppParams(data) {
  let params = {};
  let appParams = _.filter(data.children, { name: 'twx-app-param' });
  _.each(appParams, function (appParam) {
    params[appParam.attributes.id] = appParam.attributes;
  });

  return params;
}

/**
 * Iterates on the views and determines whether the default route is found,
 *  and whether the angular debug info is needed.
 * @param templateLocals  Object with computed values for the template compile
 * @param defaultRoute  String name of the default View
 * @param appBaseDir String base directory path to the app
 * @param target String name of the target directory
 * @returns {boolean}
 * @private
 */
function _processViews(templateLocals, defaultRoute, appBaseDir, target) {
  var defaultRouteFound = false;
  _.each(templateLocals.views, function (view) {
    if (view.fileName === defaultRoute) {
      defaultRouteFound = true;
    }
    var scriptFile = path.join(appBaseDir, 'src', target, 'components', view.fileName + '.js');
    if (fs.existsSync(scriptFile)) {
      view.script = fs.readFileSync(scriptFile);
      if (view.script && view.script.indexOf('scope()') > 0) {
        //backwards compatibility for custom JS
        templateLocals.angularDebugEnabled = true;
      }
    } else {
      log.info('no script for ' + view.fileName);
    }
  });
  return defaultRouteFound;
}

/**
 * Saves the metadata content into the 2 metadata file locations [sync]
 * @param {Object} metadata
 * @param {Object} saveConfig
 */
function saveNewMetaDataContent(metadata, saveConfig) {
  fs.writeJsonSync(path.join(saveConfig.srcSharedRoot, 'components', 'metadata.json'), metadata, { spaces: 2 });
  fs.writeJsonSync(path.join(saveConfig.destTargetRoot, 'WEB-INF', 'metadata.json'), metadata, { spaces: 2 });
}

/**
 * Updates both src/ and dist/ copies of the metadata.json file with the extra requires: 'spatial-tracking' if
 *  the spatial target was found in a view.
 * @param {object} metadata Metadata.json file contents
 * @param {booelan} requiresSpatialTracking
 * @param {object} saveConfig
 */
function updateMetadataWithSpatialRequires(metadata, requiresSpatialTracking, saveConfig) {
  var modifiedMetadata = false;
  if (requiresSpatialTracking && metadata.requires && metadata.requires.indexOf('spatial-tracking') === -1) {
    metadata.requires.push('spatial-tracking');
    modifiedMetadata = true;
  } else if (!requiresSpatialTracking && metadata.requires && metadata.requires.indexOf('spatial-tracking') > -1) {
    metadata.requires.splice(metadata.requires.indexOf('spatial-tracking'), 1);
    modifiedMetadata = true;
  }

  if (modifiedMetadata) {
    log.debug('Updating metadata.json file to change spatial-tracking requires');
    saveNewMetaDataContent(metadata, saveConfig);
  }
}

/**
 * Updates both src/ and dist/ copies of the metadata.json file with the extra requires: 'assisted-reality' for
 * assisted-reality projects.
 * @param {object} metadata Metadata.json file contents
 * @param {object} saveConfig
 */
function updateMetadataWithAssistedRealityRequires(metadata, saveConfig) {
  var modifiedMetadata = false;
  if (
    metadata.requires &&
    saveConfig &&
    saveConfig.projectSettings &&
    saveConfig.projectSettings.projectType === 'HMT' &&
    metadata.requires.indexOf('assisted-reality') < 0
  ) {
    metadata.requires.push('assisted-reality');
    modifiedMetadata = true;
  }

  if (modifiedMetadata) {
    log.debug('Updating metadata.json file to change assisted-reality requires');
    saveNewMetaDataContent(metadata, saveConfig);
  }
}

/**
 * Updates both src/ and dist/ copies of the metadata.json file with the widgetsUsage
 * found in project
 * @param {object} metadata Metadata.json file contents
 * @param {object} combinedWidgetsUsage widgets usage found in project
 * @param {object} saveConfig
 */
function updateMetadataWithWidgetsUsage(metadata, combinedWidgetsUsage, saveConfig) {
  metadata.widgetsUsage = metadata.widgetsUsage || [];
  const currentTime = new Date().toISOString();
  metadata.widgetsUsage.push({ timestamp: currentTime, action: 'SAVE', usage: combinedWidgetsUsage });
  saveNewMetaDataContent(metadata, saveConfig);
}

/**
 * Gets the appbuilder and widgets for transpiling
 */
function getAppBuilder(appBaseDir) {
  return require(path.resolve(appBaseDir, 'extensions', 'combined-widgets.js'));
}

/**
 * Build the app
 *
 * Called when saving a project from Studio UI, may also be called via CLI `gulp build`.
 * When executed via gulp a cb param is sent but all other params are undefined and will use default values.
 *
 * @param {function} cb - unused - a callback func (only sent in when run as gulp task) but never gets called?
 * @param {string} appBaseDir - such as '<Studio projects dir>/MyProj/', defaults to __dirname
 * @param {string} scaffoldDir - unused
 * @param {object} params - config obj sent from Studio, defaults to empty obj with empty builderSettings plus settings read in from appConfig.json
 * @return {Promise} resolved when build is complete
 */
function buildApp(cb, appBaseDir, scaffoldDir, params) {
  var extensionInfo = {};
  const buildAppPromise = new Promise(function (resolve, reject) {
    log.debug('build');
    if (!params) {
      params = {
        builderSettings: {},
      };
    }
    if (!appBaseDir) {
      appBaseDir = appPath;
    }
    if (!params.path) {
      params.path = __dirname;
    }

    // eslint-disable-next-line no-undef
    twxAppBuilder = exports.getAppBuilder(appBaseDir);
    if (params.settings === undefined) {
      var settingsFile = path.join(appBaseDir, 'appConfig.json');
      params.settings = fs.readJsonSync(settingsFile);
    }
    const settings = params.settings;
    const buildAppPromises = [];
    if (fs.existsSync(appPath)) {
      // generate distribution files

      ['phone'].forEach(function (target) {
        // an object containing useful information about the save operation
        var saveConfig = {
          destTargetRoot: getDistDir(appBaseDir),
          srcTargetRoot: path.join(appBaseDir, 'src', target),
          srcSharedRoot: path.join(appBaseDir, 'src', 'shared'),
          views: _.get(settings, 'targets[' + target + '].components', []),
          fragments: _.get(settings, 'targets.shared.fragments', []),
          appBaseDir: appBaseDir,
          projectSettings: settings,
        };

        // compile all the twxml into html starting with fragments (to be injected into components)
        buildAppPromises.push(
          new Promise(function (buildResolve, buildReject) {
            exports
              .compileTwxmlToHtml(
                path.join(saveConfig.srcSharedRoot, 'fragments'),
                path.join(saveConfig.destTargetRoot, 'app', 'shared', 'fragments'),
                saveConfig,
                params
              )
              .then(function (sharedResult) {
                const compileTwxmlToHtmlPromise = exports.compileTwxmlToHtml(
                  path.join(saveConfig.srcTargetRoot, 'components'),
                  path.join(saveConfig.destTargetRoot, 'app', 'components'),
                  saveConfig,
                  params,
                  sharedResult.contentMap
                );
                compileTwxmlToHtmlPromise.then(function (result) {
                  const needsMenuLayout = result.needsMenuLayout;
                  compileSharedTwxmlToHtml(
                    path.join(saveConfig.srcSharedRoot, 'components'),
                    path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components')
                  );

                  if (settings.projectType === 'eyewear') {
                    compileVoiceRecGrammarFiles(_.assign(saveConfig, { scaffoldDir: getScaffoldDir(params) }));
                  }

                  zipHelper.extractAllPVIFiles(path.join(saveConfig.destTargetRoot, 'app', 'resources', 'Uploaded'));

                  extensionInfo = getExtensionInfoWithRuntimeFileFilterApplied(appBaseDir, result.combinedWidgetDeps);

                  log.debug('dependencies to include in main page of the project', extensionInfo);
                  var sharedMetadataJsonPath = path.join(saveConfig.srcSharedRoot, 'components', 'metadata.json');
                  var tmlPathPrefix = argv.tmlPathPrefix || saveConfig.projectSettings.tmlPathPrefix || 'tml';
                  var deviceHTMLContents = fs.readFileSync(
                    path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Device.html'),
                    'utf8'
                  );
                  var dataHTMLContents = fs.readFileSync(
                    path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Data.html'),
                    'utf8'
                  );
                  // use 'saveConfig' as the 'this' object in the loop.

                  _.forEach(settings.targets[target].components, function (view) {
                    addEscapedInlineHTML(saveConfig, view, 'view');
                  });
                  _.forEach(settings.targets.shared.fragments, function (fragment) {
                    addEscapedInlineHTML(saveConfig, fragment, 'fragment');
                  });

                  var metadata = fs.readJsonSync(sharedMetadataJsonPath);
                  var defaultRoute =
                    metadata.experiences && metadata.experiences.length > 0
                      ? metadata.experiences[0].viewName
                      : settings.targets[target].components[0].fileName;
                  updateMetadataWithSpatialRequires(metadata, result.requiresSpatialTracking, saveConfig);
                  updateMetadataWithAssistedRealityRequires(metadata, saveConfig);
                  updateMetadataWithWidgetsUsage(metadata, result.combinedWidgetsUsage, saveConfig);

                  var dataFile = fs.readJsonSync(
                    path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Data.json')
                  );
                  var appParams = getAppParams(dataFile);
                  var enableVoiceCommands = _.find(dataFile.children, { name: 'twx-app-event' }) !== undefined;

                  var templateLocals = {
                    theme: settings.theme || 'twx-light',
                    mainNavigationMenuStyle: settings.mainNavigationMenuStyle,
                    views: settings.targets[target].components,
                    fragments: settings.targets.shared.fragments,
                    uuid: Date.now(),
                    extensionInfo: extensionInfo,
                    defaultRoute: defaultRoute,
                    metadata: JSON.stringify(metadata),
                    parameters: JSON.stringify(appParams),
                    tmlPathPrefix: tmlPathPrefix,
                    deviceHTMLContents: deviceHTMLContents,
                    dataHTMLContents: dataHTMLContents,
                    enableVoiceCommands: enableVoiceCommands,
                    projectType: settings.projectType,
                    angularDebugEnabled: false,
                  };

                  // support for offline experience DT-15090
                  templateLocals.designedForOffline = settings.designedForOffline;

                  // add the thumbnail info to the templateLocals only if the project has one defined
                  if (settings.thumbnail) {
                    templateLocals['thumbnail'] = {
                      href: 'public/' + encodeURI(settings.thumbnail),
                      type:
                        'image/' +
                        path.extname(settings.thumbnail).substr(1) /* should produce a string like image/png */,
                    };
                  }

                  var defaultRouteFound = _processViews(templateLocals, defaultRoute, appBaseDir, target);

                  if (!defaultRouteFound) {
                    //Default to the first view if none found on url
                    templateLocals.defaultRoute = templateLocals.views[0].fileName;
                  }
                  generateIndex(saveConfig.destTargetRoot, templateLocals, null, params, needsMenuLayout);

                  generateAppJs(appBaseDir, saveConfig.destTargetRoot, templateLocals);
                  buildResolve();
                }, buildReject);
                buildAppPromises.push(compileTwxmlToHtmlPromise);
              }, buildReject);
          })
        );
      });
      Promise.all(buildAppPromises).then(resolve, reject);
    } else {
      const msg = appPath + ' does not exist';
      log.error(msg);
      reject(msg);
    }
  });

  return buildAppPromise.then(function () {
    return new Promise(function (resolve, reject) {
      //Maintain folder structure relative to the extensions folder, can pass in filter for files used.
      //Only Copy extension files in use

      var srcExt = [];
      var i = extensionInfo.runtimeFiles.length;
      while (i--) {
        srcExt.push(appBaseDir + '/' + extensionInfo.runtimeFiles[i]);
      }
      gulp
        .src(srcExt, { base: path.join(appBaseDir + '/extensions/') })
        //.pipe(gulpDebug({title: 'cp-ext'}))
        .pipe(gulp.dest(getDistDir(appBaseDir) + '/extensions'))
        .on('end', resolve)
        .on('error', reject);
    });
  });
}

function readProjectSettingsSync(appBaseDir) {
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var config = path.join(appBaseDir, 'appConfig.json');
  var data = fs.readJsonSync(config);
  return data;
}

function getServer(appBaseDir) {
  var projectData = readProjectSettingsSync(appBaseDir);
  return projectData.thingworxServer;
}

/**
 * Gets the extension JSON configuration with runtime files and libraries filtered based on widgets used.
 * @param {String} appBaseDir
 * @param {Object} combinedWidgetDeps
 */
function getExtensionInfoWithRuntimeFileFilterApplied(appBaseDir, combinedWidgetDeps) {
  // build the list of 3rd party dependencies to include in the main page of the project
  const extInfo = getRuntimeExtensionsInfo(appBaseDir);
  let extensionInfo = {
    runtimeFiles: _.uniq(extInfo.runtimeLibraries.concat(extInfo.runtimeFiles)), //Default full list when the combinedWidgetDeps is not defined
    angularModules: extInfo.runtimeAngularModulesRequires,
  };
  if (combinedWidgetDeps) {
    if (combinedWidgetDeps.files) {
      // only include the libraries for the widgets that are included in the project (DT-16652)
      extensionInfo.runtimeFiles = combinedWidgetDeps.files.map(function (dep) {
        // ensure path to the dependency is releative to the <project>/dist/extensions dir
        if (dep && !dep.startsWith('extensions/')) {
          return 'extensions/' + dep;
        } else {
          return dep;
        }
      });
    }

    if (combinedWidgetDeps.angularModules) {
      detectMissingModules(combinedWidgetDeps.angularModules, extInfo.runtimeAngularModulesRequires);
      // only include the angular modules for the widgets that are included in the project (DT-16652)
      extensionInfo.angularModules = combinedWidgetDeps.angularModules;
    }
  }
  return extensionInfo;
}

function detectMissingModules(angularModules, runtimeAngularModulesRequires) {
  // If these modules are not included in runtimeAngularModulesRequires (ves-ar-extension/index.js)
  // things will break when TML Text widget is included in the project.
  // The idea is that whenever a new module is added and than tested we'll run into this check
  // whenever we try to build the project for the first time without it.
  const notIncludedModules = angularModules.filter((module) => !runtimeAngularModulesRequires.includes(module));
  if (notIncludedModules.length) {
    const error = `Modules not included in runtimeAngularModulesRequires: ${notIncludedModules.join(', ')}`;
    // Don't want to risk throwing exceptions like this in production, throw it in the dev env
    // so that it is a clear signal that things are missing.
    if (global.isProd) {
      log.error(error);
    } else {
      throw new Error(error);
    }
  }
}

function generateIndex(appPath, locals, callback, params, needsMenuLayout) {
  if (!params) {
    params = {};
  }
  locals.menu =
    (locals.mainNavigationMenuStyle === 'leftSideMenu' && locals.views && locals.views.length > 1) ||
    needsMenuLayout === true;
  if (locals.views) {
    locals.views.forEach(function (view) {
      view.escapedTitle = _.escape(view.title);
    });
  }
  const indexTemplate = params.settings.indexTemplate || 'index_sidemenu_nav.html.template';
  locals.ignoreJSFiles = [
    'extensions/js/libthingview_wasm.js',
    'extensions/js/thingview.js',
    'extensions/js/vuforia-angular.js',
    'extensions/js/twx-mobile-widgets-3d-ng.js',
    'extensions/js/url-search-params.js',
    'extensions/js/hmt-project-startup.js',
  ];

  var output = swig.renderFile(path.join(appPath, '_builder', indexTemplate), locals);
  if (output) {
    fs.writeFileSync(path.join(appPath, 'index.html'), output, 'utf8');

    var tmlRenderer =
      '<script src="extensions/js/thingview.js"></script>\n' +
      '<script src="extensions/js/twx-mobile-widgets-3d-ng.js"></script>\n ';

    var desktopOutput = output.replace('<!-- VuforiaImpl -->', tmlRenderer);
    desktopOutput = desktopOutput.replace('//desktop-ready-replacement', 'window.ionic.Platform.ready(setupWrapper);');

    // Allow certain builderSettings to be used in Preview
    var settingObj = {};
    Object.keys(params.builderSettings).forEach(function (k) {
      let setting = k.toLowerCase();
      if (setting.indexOf('enabled') >= 0 || setting.indexOf('mode') >= 0 || setting.indexOf('canvas') >= 0) {
        settingObj[k] = params.builderSettings[k];
      }
    });
    desktopOutput = desktopOutput.replace(
      '//<builder-settings>',
      'window.builderSettings = ' + JSON.stringify(settingObj)
    );

    var $desktopIndex = $('<div></div>').html(desktopOutput);
    // for eyewear projects, add the app events overlay to the preview page
    if (params.settings.projectType === 'eyewear') {
      var appEventsOverlay =
        '<div id="app-events" ng-hide="barcodeScannerActive">' +
        '<div class="header" ng-click="events.expanded = (events.expanded !== undefined ? !events.expanded : false)"><span class="iconChevron" ng-class="events.expanded === false? \'collapsed\' : \'expanded\'"></span> <span class="app-events-title">Application Events</span></div> ' +
        '  <div class="contents" ng-hide="events.expanded === false"> ' +
        '    <span class="app-event" title="{{appEvent.voiceAlias ? (appEvent.name + \'  (\' + appEvent.voiceAlias + \')\')  : appEvent.name}}" ng-repeat="appEvent in appEvents" ng-click="app.fn.triggerAppEvent(appEvent.name)">{{appEvent.name}} <span class="voice-desc"><i class="icon-voice"></i> ({{appEvent.voiceAlias}})</span></span>' +
        '    <span class="empty-app-events" ng-if="appEvents.length === 0">No Application Events to execute</span>' +
        '    <script type="text/javascript"> ' +
        '      document.querySelector(".app-events-title").innerText = parent.i18next.t("Application Events");' +
        '      document.querySelector(".empty-app-events").innerText = parent.i18next.t("ves-ar-extension:No Application Events to execute"); ' +
        '    </script>' +
        '  </div>' +
        '</div>';
      $desktopIndex.find('ion-nav-view').append(appEventsOverlay);
      $desktopIndex.find('head').append('<link rel="stylesheet" href="css/app-preview.css?v' + locals.uuid + '">');
    }

    fs.writeFileSync(path.join(appPath, 'index-desktop.html'), $desktopIndex.html(), 'utf8');
    if (callback) {
      callback();
    }
  }
}

function generateAppJs(appBaseDir, distPhonePath, locals) {
  locals.thingworxServer = getServer();
  locals.requires = JSON.stringify(locals.extensionInfo.angularModules || []);

  var theAppPath = path.join(distPhonePath, 'app');
  fs.ensureDirSync(theAppPath);

  var output = swig.renderFile(path.join(distPhonePath, '_builder', 'app.js.template'), locals);
  if (output) {
    fs.writeFileSync(path.join(theAppPath, 'app.js'), output, 'utf8');
  }
}

function getRuntimeExtensionsInfo(appBaseDir) {
  var runtimeExtensions = {};
  try {
    runtimeExtensions = require(appBaseDir + '/extensions/runtimeExtensions.json');
  } catch (e) {
    log.error('could not load extensions/runtimeExtensions.json', e);
  }
  return runtimeExtensions;
}

function getCombinedWidgets(previousWidgets, currentWidgets) {
  if (isEmpty(previousWidgets)) {
    return currentWidgets;
  } else {
    // For other views, update combinedWidgetsUsage by adding new widgets and
    // updating the count for already added widgets in previous views
    const keys = Object.keys(currentWidgets);
    for (const key of keys) {
      if (previousWidgets[key] === undefined) {
        previousWidgets[key] = currentWidgets[key];
      } else {
        previousWidgets[key] += currentWidgets[key];
      }
    }
    return previousWidgets;
  }
}

function modelTargetCarModeCallback(widget) {
  return widget.attribs['car-mode-str'] === 'On';
}

const analyticsMap = {
  'twx-dt-target-model': {
    transformName: 'target_mode_with_car',
    callback: modelTargetCarModeCallback,
  },
};

function getWidgetUsageAnalytics(widget, widgetsUsage) {
  const widgetName = widget.name;

  // add/update widgets usage count
  widgetsUsage[widgetName] = widgetsUsage[widgetName] === undefined ? 1 : ++widgetsUsage[widgetName];

  // add/update custom property usage count
  const analyticsInfo = analyticsMap[widgetName];
  if (analyticsInfo !== undefined) {
    const transformName = analyticsInfo.transformName;
    const usageCount = analyticsInfo.callback(widget) ? 1 : 0;
    widgetsUsage[transformName] =
      widgetsUsage[transformName] === undefined ? usageCount : widgetsUsage[transformName] + usageCount;
  }

  return widgetsUsage;
}

/**
 * Compiles view json to html and writes file to dist
 *
 * @param {string} srcPath - path to src location, such as 'MyProj/src/phone/components/'
 * @param {string} stagePath - path to dist location, such as 'MyProj/dist/app/components/'
 * @param {object} saveConfig - an object containing useful information about the save operation
 *    Includes properties such as: destTargetRoot, srcTargetRoot, srcSharedRoot, views, fragments, projectSettings, appBaseDir
 * @param {object} params - config obj sent from Studio
 * @param {object} sharedContent - stores fragment views in sharedContent map.
 *    If sharedContent is undefined, this function will compile fragments rather than views from saveConfig.
 * @return {Promise} resolved with object with the following properties:
 *   - needsMenuLayout - boolean indicating whether or not the app needs a menu layout
 *   - requiresSpatialTracking - boolean indicating whether or not the app requires spatial target support
 *   - contentMap - map of fragment/view contents, built on top of sharedContent
 *   - combinedWidgetDeps - describes the dependencies needed for all the widgets in the project
 */
function compileTwxmlToHtml(srcPath, stagePath, saveConfig, params, sharedContent) {
  return new Promise(function (resolve, reject) {
    fs.ensureDirSync(stagePath);
    var needsMenuLayout = false;
    var hasSpatialTarget = false;
    var hasNonSpatialTarget = false;
    var htmlBeautify = require('js-beautify').html;
    var combinedWidgetDeps = { files: [], angularModules: [] };
    var combinedWidgetsUsage = {};
    var hasTMLTextWidget = false;
    const compileViewPromises = [];
    const modelData = {};
    var views = sharedContent ? saveConfig.views : saveConfig.fragments; //meh... probably a better way
    if (!sharedContent) {
      sharedContent = {};
    }
    _.each(views, function (view) {
      const srcFile = path.join(srcPath, view.fileName + '.json');
      if (fs.existsSync(srcFile)) {
        var targetFile = path.join(stagePath, view.fileName + '.html');
        var key = view.fileName;
        var contents = fs.readFileSync(srcFile, 'utf8');
        const compileViewPromise = compileViewContents(
          JSONToXML(contents, true),
          view.fileName,
          view.name,
          saveConfig,
          params,
          sharedContent
        ).then(function (viewPromiseResults) {
          modelData[view.name] = viewPromiseResults.modelData;
          combinedWidgetDeps.files = _.union(combinedWidgetDeps.files, viewPromiseResults.widgetDeps.files);
          combinedWidgetDeps.angularModules = _.union(
            combinedWidgetDeps.angularModules,
            viewPromiseResults.widgetDeps.angularModules
          );
          combinedWidgetsUsage = getCombinedWidgets(combinedWidgetsUsage, viewPromiseResults.widgetsUsage);
          var compiledContents = viewPromiseResults.compiledContents;
          if (saveConfig.projectSettings && saveConfig.projectSettings.autoIndent) {
            compiledContents = htmlBeautify(compiledContents, { indent_size: 1 });
          }
          hasTMLTextWidget =
            hasTMLTextWidget || $(compiledContents).find('twx-widget[original-widget="twx-tml-text"]').length > 0;
          fs.writeFileSync(targetFile, compiledContents);
          needsMenuLayout =
            needsMenuLayout ||
            compiledContents.indexOf('original-widget="twx-view-header"') > 0 ||
            compiledContents.indexOf('ion-footer-bar') > 0;

          const spatialTargetIndex = compiledContents.indexOf('twx-dt-target-spatial');
          hasSpatialTarget = hasSpatialTarget || spatialTargetIndex > 0;
          hasNonSpatialTarget = hasNonSpatialTarget || spatialTargetIndex === -1;

          var contentsMinusViewTag = '<div>' + $(compiledContents).find('ion-content').html() + '</div>';
          var contentMap = {
            key: key,
            contents: contentsMinusViewTag,
          };
          sharedContent[key] = contentsMinusViewTag;
          return Promise.resolve(contentMap);
        });
        compileViewPromises.push(compileViewPromise);
      } else {
        log.error(srcFile, 'does not exist');
      }
    });

    const gltfHelper = ves_extension.gltfHelper;
    Promise.all(compileViewPromises)
      .then(function () {
        return gltfHelper.handleModelData(modelData, params);
      }, reject)
      .then(function () {
        //Package up all the info.json file for server side Model target generation
        return new Promise(function (copyInfosResolve, copyInfosReject) {
          let appBaseDir = saveConfig.appBaseDir || '';
          let fileCopyPatterns = [appBaseDir + '/resource_cache/**/*.info.json'];
          if (params.builderSettings.serverMTG === false) {
            // exclude the info files for the Model Targets when serverMTG is set to false, false means we don't want to have the ES process
            // the Model Targets so we need to make sure they are not included in dist/WEB-INF
            fileCopyPatterns.push('!' + appBaseDir + '/resource_cache/mtg/*.info.json');
          }
          // copy the xxxx.info.json files, for Model Targets and Image Targets, from <project>/resource_cache to <project>/dist/WEB-INF/resource_cache
          gulp
            .src(fileCopyPatterns, { nodir: true })
            //.pipe(gulpDebug({title: 'JSON files'}))
            .pipe(gulp.dest(saveConfig.destTargetRoot + '/WEB-INF/resource_cache/'))
            .pipe(preservetime())
            .on('end', copyInfosResolve)
            .on('error', copyInfosReject);
        });
      })
      .then(function () {
        resolve({
          needsMenuLayout: needsMenuLayout,
          // Only require spatial target support if all views use spatial targets, so that devices that don't support spatial targets can still access the other views.
          requiresSpatialTracking: hasSpatialTarget && !hasNonSpatialTarget,
          contentMap: sharedContent,
          // if there is a TML Text widget in the project, include all dependencies because it could include any other widget (DT-16652)
          combinedWidgetDeps: !hasTMLTextWidget ? combinedWidgetDeps : undefined,
          combinedWidgetsUsage: combinedWidgetsUsage,
        });
      }, reject);
  });
}

function compileSharedTwxmlToHtml(srcPath, stagePath) {
  var files = fs.readdirSync(srcPath);
  fs.ensureDirSync(stagePath);

  _.each(files, function (file) {
    if (_.endsWith(file, '.json') && !file.includes('metadata.json')) {
      var srcFile = path.join(srcPath, file);
      var targetFile = path.join(stagePath, file.replace('.json', '.html'));
      var contents = fs.readFileSync(srcFile, 'utf8');
      var compiledContents = JSONToXML(contents, false);
      fs.writeFileSync(targetFile, compiledContents);
    }
  });
}

/**
 * base64 encode the given image
 * The following extensions are supported and will return the correct mime type:
 * - svg
 * - png
 * - jpg
 * - jpeg
 * - gif
 * - bmp
 *
 * Any other extension will return image/unknown.
 *
 * @param {string} filePath file path of an image
 * @return {string} a data url of base mimetype image
 * @throws error if the file does not exist or cannot be read from disk
 */
function encodeAsDataURL(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Encode image failed. File does not exist: ' + filePath);
  }

  var ext = path.extname(filePath).toLowerCase();
  var prefix = 'data:';
  switch (ext) {
    case '.svg':
      prefix += 'image/svg+xml;base64,';
      break;
    case '.png':
      prefix += 'image/png;base64,';
      break;
    case '.jpg':
    case '.jpeg':
      prefix += 'image/jpeg;base64,';
      break;
    case '.gif':
      prefix += 'image/gif;base64,';
      break;
    case '.bmp':
      prefix += 'image/bmp;base64,';
      break;
    default:
      prefix += 'image/unknown;base64,';
      break;
  }

  return prefix + fs.readFileSync(filePath).toString('base64');
}

/**
 * Allows client to show/highlight clickable elements
 * @param {*} Widget element
 * @param {*} widgetDef
 * @return true if the widget has a click-expression or click event bindings
 */
function hasClickInteraction($target, widgetDef) {
  return !!(
    widgetDef.category === 'ar' &&
    ($target.find('[source-event="click"]').length > 0 || $target.attr('click-expression'))
  );
}

/**
 * Gets the runtime template for the widget.
 *
 * @param {*} widgetDef Widget Definition instance
 * @param {*} widgetProperties Widget Properties Object
 * @param {*} twxWidgetEl cheerio element, to pass into runtime template function
 * @param {*} fullOriginalDoc view document, to pass into runtime template function
 * @param {*} $ Cheerio instance to pass into template function
 * @param {Object} projectSettings project appConfig object
 * @returns {String} template html
 */
function getRuntimeTemplate(widgetDef, widgetProperties, twxWidgetEl, fullOriginalDoc, $, projectSettings, isARView) {
  return widgetDef.runtimeTemplate(widgetProperties, twxWidgetEl, fullOriginalDoc, $, projectSettings, isARView);
}

/**
 * Will handle relative urls for the resources, inlining the resource if necessary.
 * Currently no attempt to inline external URLs.
 * @param {string} propValue current value such as 'Uploaded/star.png' or 'http://acme.com/foo.png'
 * @param {string} saveConfig uses destTargetRoot projectSettings properties
 * @param {object} property metadata
 * @returns the new property value inlined or with relative base path as necessary.
 */
function handleResourceUrl(propValue, saveConfig, property) {
  if (!propValue.startsWith('http') && !propValue.startsWith('data:image')) {
    if (saveConfig.projectSettings.designedForOffline && (property.inlineForOffline || /\.svg$/i.test(propValue))) {
      try {
        log.debug('handleResourceUrl inlining image:', propValue);
        propValue = encodeAsDataURL(path.join(saveConfig.destTargetRoot, 'app', 'resources', propValue));
      } catch (e) {
        // error can occur when the file doesn't exist on disk or cannot be read.
        log.error('handleResourceUrl failed to inline image:', propValue, e);
        propValue = 'app/resources/' + encodeURI(propValue);
      }
    } else {
      propValue = 'app/resources/' + encodeURI(propValue);
    }
  }
  return propValue;
}

/**
 * Adds the dependencies defined on the widget definition to the collections on the widgetDeps object
 * @param {object} widgetDeps - Collection object, expected to contain {files: [], angularModules: []}
 * @param {object} widgetDef - the widget def to retrieve the dependencies from
 */
function applyWidgetDependencies(widgetDeps, widgetDef, params) {
  let dependencies;
  if (typeof widgetDef.dependencies === 'function') {
    let projectInfo = {
      projectSettings: params.settings,
      projectDefinition: params.projectConfig,
      builderSettings: params.builderSettings,
    };
    dependencies = widgetDef.dependencies(projectInfo);
  } else {
    // the dependencies is a property, check to see if it's an Array or an Object
    if (Array.isArray(widgetDef.dependencies)) {
      dependencies = { files: widgetDef.dependencies, angularModules: [] };
    } else if (typeof widgetDef.dependencies === 'object') {
      dependencies = _.assign({ files: [], angularModules: [] }, widgetDef.dependencies);
    }
  }

  // at this point, dependencies should be an object like {files: [], angularModules: []} or undefined
  if (dependencies && Array.isArray(dependencies.files)) {
    // add the dependencies to the collections on widgetDeps object
    widgetDeps.files = _.union(widgetDeps.files, dependencies.files);
    widgetDeps.angularModules = _.union(widgetDeps.angularModules, dependencies.angularModules || []);
  }
}

/**
 * Compiles view contents from xml to html
 * For each widget: init widget property values, extract PVI if necessary, handle GLTF if necessary, add services and events, etc.
 * For the view checks for header, footer, scrollbars, etc. to produce correct view content.
 *
 * @param {string} contents - view as XML
 * @param {string} viewName - internal name such as 'My_View'
 * @param {string} viewTitle - display name such as 'My View'
 * @param {object} saveConfig - an object containing useful information about the save operation
 *    Includes properties such as: destTargetRoot, srcTargetRoot, srcSharedRoot, views, projectSettings
 * @param {object} params - config obj sent from Studio
 * @param {object} sharedContent -stores fragment views in sharedContent map
 * @return {Promise} resolved with an object providing the HTML string of compiled view contents,
 *                   a modelData object giving information about the models within the view,
 *                   and a widgetDeps object describing the dependencies needed for all the widgets in the view.
 *                   Of the form:
 *                    { compiledContents: '...', modelData: {}, widgetDeps: {files: [], angularModules: []} }
 * @private
 */
function compileViewContents(contents, viewName, viewTitle, saveConfig, params, sharedContent) {
  const promise = new Promise(function (resolve, reject) {
    log.debug('compile view contents ', viewName);
    // this const has to be shared between client and server
    var HTML_BOOLEAN_ATTRIBUTES = ['disabled', 'autofocus'];
    var compiledDoc = $('<div></div>');
    var overlayWidgetId;
    var headerContentItems = [];
    var hasOverlay = false;
    var hasFooter = false;
    var isEmbeddable = false;
    compiledDoc.html(contents);
    var fullOriginalDoc = $('<div></div>').html(contents);
    var $target = compiledDoc.find('[twx-widget]').first();
    var idNumber = 0;
    var isViewWidget = false;
    var isModalView = false;
    var viewType = '';
    var footerEl;
    let needs3dScrollbarFix = false;
    let isARView = false;
    var modelData = {};
    var widgetDeps = { files: [], angularModules: [] };
    var widgetsUsage = {};
    const gltfHelper = ves_extension.gltfHelper;

    while ($target.length === 1) {
      var tagName = $target[0].name; // $target.prop('tagName');

      // eslint-disable-next-line no-undef
      var widgetDef = twxAppBuilder.findWidgetDefByTag(tagName);
      if (widgetDef) {
        //log.debug('Compiler - handling ----' + tagName + '-----');
        isViewWidget = false;

        var isThisTagAnEmbeddableView = false;
        if (tagName === 'twx-view') {
          isViewWidget = true;
          isModalView = false;
          viewType = $target.attr('data-viewtype');
          if (viewType === 'embedded') {
            isEmbeddable = true;
            isThisTagAnEmbeddableView = true;
          } else if (viewType === 'modal') {
            isModalView = true;
          }
        }
        var widgetId = $target.attr('widget-id');
        if (widgetId === undefined || widgetId.length === 0) {
          widgetId = 'x' + idNumber++;
        }
        let widgetName = $target.attr('widget-name');
        if (widgetName) {
          widgetName = 'widget-name="' + widgetName + '"';
        } else {
          widgetName = '';
        }

        var compiledEl = $(
          '<twx-widget widget-id="' +
            widgetId +
            '" original-widget="' +
            tagName +
            '" ' +
            widgetName +
            (isThisTagAnEmbeddableView ? ' twx-view ' : '') +
            '><twx-widget-content></twx-widget-content></twx-widget>'
        );

        var properties = widgetDef.properties;
        var services = widgetDef.services || [];
        var events = widgetDef.events;
        var widgetProperties = {};
        var twxWidgetEl = compiledEl;

        widgetsUsage = getWidgetUsageAnalytics($target[0], widgetsUsage);

        if (widgetDef.dependencies) {
          // add the widget dependencies, we only want include the artifacts/resources necessary for the widgets that have been included in the project (DT-16652)
          applyWidgetDependencies(widgetDeps, widgetDef, params);
        }

        // TODO don't make functions within a loop
        // eslint-disable-next-line no-loop-func
        _.each(properties, function (property) {
          var key = property.name;
          var attrVal;
          var datatype = property.runtimeDatatype || property.datatype;

          if (datatype === 'custom_ui') {
            // Do nothing...
          } else {
            attrVal = $target.attr(getAttrName(_.kebabCase(key)));

            var propValue;
            if (property.default !== undefined && property.default !== null) {
              if (property.datatype === 'json') {
                propValue = JSON.stringify(property.default || {});
              } else {
                propValue = property.default;
              }
              //log.debug('set to property default: ' + property.name + ' = ' + propValue);
              if (attrVal !== undefined && attrVal !== null && attrVal !== propValue) {
                propValue = attrVal;
                //log.debug('override default: ' + property.name + ' = ' + propValue);
              }
            } else {
              propValue = attrVal;
              //log.debug('no default, set to defined attribute value: ' + property.name + ' = ' + propValue);
            }

            if (datatype !== undefined) {
              // eslint-disable-next-line default-case
              switch (datatype.toLowerCase()) {
                case 'number':
                case 'boolean':
                  if (propValue === '') {
                    propValue = property.default;
                  } else if (_.indexOf(HTML_BOOLEAN_ATTRIBUTES, propValue) > -1 || propValue === 'true') {
                    propValue = true;
                  }
                  break;
              }
            }

            if (datatype === 'resource_url' && propValue) {
              propValue = handleResourceUrl(propValue, saveConfig, property);
            }

            if (isViewWidget && property.name === 'title' && propValue !== property.default) {
              viewTitle = propValue;
            }

            if (propValue !== undefined && propValue !== null) {
              widgetProperties[key] = propValue;
            }

            if (datatype !== 'xml' && datatype !== 'custom_ui') {
              var twxWidgetPropertyEl = $('<twx-widget-property></twx-widget-property>');
              twxWidgetPropertyEl.attr('name', key);
              twxWidgetPropertyEl.attr('datatype', datatype || '');
              if (propValue !== undefined && propValue !== null) {
                twxWidgetPropertyEl.attr('value', propValue);
              }
              twxWidgetEl.prepend(twxWidgetPropertyEl);
            }
          }
        });

        //Update the sequence path to match the extracted path.
        zipHelper.extractPVI_ifNecessary(
          widgetProperties,
          saveConfig.srcTargetRoot,
          saveConfig.destTargetRoot,
          twxWidgetEl
        );

        gltfHelper.gatherModelData(widgetProperties, twxWidgetEl, widgetDef, params, modelData, {
          title: viewTitle,
          contents: compiledDoc,
        });

        // TODO dont' make functions within a loop
        // eslint-disable-next-line no-loop-func
        _.each(services, function (service) {
          var key = service.name;
          var twxWidgetServiceEl = $('<twx-widget-service></twx-widget-service>');
          twxWidgetServiceEl.attr('name', key);
          twxWidgetEl.prepend(twxWidgetServiceEl);
        });

        addWidgetEventElements(events, twxWidgetEl, $target, widgetProperties);

        widgetProperties['widgetId'] = widgetId;

        var containerContentsHtml = undefined;
        if (widgetDef.isContainer === true || widgetDef.isRepeater === true) {
          var theContentEl = undefined;
          if (widgetDef.isContainer === true) {
            theContentEl = $target.find('twx-container-content').first();
          } else {
            theContentEl = $target.find('twx-repeater-content').first();
          }

          containerContentsHtml = theContentEl.html();
          theContentEl.remove();
        } else if (widgetDef.outputElementsOnly === true) {
          containerContentsHtml = $target.first().html();
        }

        var addInteractableFlag = hasClickInteraction($target, widgetDef);
        var target_contents = $target.contents();
        //var contentsHtml = $target.html();
        //log.debug(' ------ just testing, contentsHtml: ' + contentsHtml);
        twxWidgetEl.append(target_contents);
        var tmpl = getRuntimeTemplate(
          widgetDef,
          widgetProperties,
          twxWidgetEl,
          fullOriginalDoc,
          $,
          saveConfig.projectSettings,
          isARView
        );
        var newEl = compiledEl.find('twx-widget-content').append(tmpl);
        if (addInteractableFlag) {
          newEl.find(tagName).attr('interactable-hint', 'true');
        }
        //log.debug('  compiledEl after:' + twxWidgetEl.html());

        if (tagName === 'twx-fragment') {
          var key = $target.attr('fragment');
          compiledEl.find('fragment-content').replaceWith(sharedContent[key].contents);
        }

        if (widgetDef.outputElementsOnly === true) {
          //log.debug(' generating a widget with outputElementsOnly == true');
          compiledEl = $(tmpl);

          var newContainer = compiledEl.find('twx-container-content');
          if (newContainer === undefined || newContainer.length === 0) {
            compiledEl.append(containerContentsHtml);
          } else {
            newContainer.append(containerContentsHtml);
          }
        } else if (widgetDef.isRepeater === true) {
          var repeaterContainer = compiledEl.find('twx-widget-content').find('twx-repeater-content');
          repeaterContainer.append(containerContentsHtml);
        } else if (widgetDef.isContainer === true) {
          var widgetContainer = compiledEl.find('twx-widget-content').find('twx-container-content');
          widgetContainer.append(containerContentsHtml);
        }

        if (tagName === 'twx-header-buttons' || tagName === 'twx-header-title') {
          headerContentItems.push(compiledEl);
        }

        if (tagName === 'twx-view-footer') {
          footerEl = compiledEl;
          hasFooter = true;
        }

        $target.replaceWith(compiledEl);

        if (tagName === 'twx-toolbar') {
          hasFooter = true;
        }

        if (tagName === 'twx-overlay-panel') {
          hasOverlay = true;
          overlayWidgetId = widgetId;
        }

        if (tagName === 'twx-overlay-container') {
          needs3dScrollbarFix = true;
        }

        // twx-dt-view is necessary for AR view so having it implies it is one.
        if (tagName === 'twx-dt-view') {
          isARView = true;
        }

        var scrollableElement = false;
        if (compiledEl.find('twx-widget-property[name="scrollable"][value="true"]').length > 0) {
          scrollableElement = true;
        }

        if (scrollableElement === true && needs3dScrollbarFix === true) {
          compiledEl.attr('scrollable', 'true');
        }
      } else {
        // if we don't remove the twx-widget we keep looking for it and end up in an infinite loop
        log.info('******** cannot process twx-widget ' + tagName);
        $target.attr('twx-widget', null);
      }

      $target = compiledDoc.find('[twx-widget]').first();
    }

    const compiledContents = compileViewContents_step2(compiledDoc, params, {
      footerEl: footerEl,
      hasFooter: hasFooter,
      hasOverlay: hasOverlay,
      headerContentItems: headerContentItems,
      isEmbeddable: isEmbeddable,
      isModalView: isModalView,
      overlayWidgetId: overlayWidgetId,
      viewName: viewName,
      viewTitle: viewTitle,
      viewType: viewType,
    });
    resolve({
      compiledContents: compiledContents,
      modelData: modelData,
      widgetDeps: widgetDeps,
      widgetsUsage: widgetsUsage,
    });
  });
  return promise;
}

/**
 * Called after compileViewContents is done compiling all the widgets in the view contents.
 * @param {object} compiledDoc a cheerio object - similar to a jQuery element
 * @param {object} params - config obj sent from Studio
 * @param {object} config has all the properties that were initialized in compileViewContents() when the widgets were compiled
 *                        put into a config since there are too many to reasonably pass in as separate args (too easy to mix up order)
 * @return {string} compiled contents of the view
 * @private
 */
function compileViewContents_step2(compiledDoc, params, config) {
  const footerEl = config.footerEl;
  const hasFooter = config.hasFooter;
  const hasOverlay = config.hasOverlay;
  const headerContentItems = config.headerContentItems;
  const isEmbeddable = config.isEmbeddable;
  const isModalView = config.isModalView;
  const overlayWidgetId = config.overlayWidgetId;
  const viewName = config.viewName;
  const viewTitle = config.viewTitle;
  const viewType = config.viewType;

  let headerContentsHtml = '';
  let footerContentsHtml = '';
  let popupContentsHtml = '';
  let scannerContentsHtml = '';
  const overlayDoc = $('<div><div class="overlay ng-hide" ng-show=""></div></div>');
  if (hasOverlay) {
    var overlayEl = compiledDoc.find('div.twx-overlay-panel');
    overlayDoc.find('.overlay').append(overlayEl.html());
    overlayEl.remove();

    overlayDoc.find('.overlay').attr('ng-show', "view.wdg['" + overlayWidgetId + "'].visible == true");
  }

  if (headerContentItems.length > 0) {
    for (var i = 0; i < headerContentItems.length; i += 1) {
      var headerContentEl = headerContentItems[i];
      headerContentsHtml += headerContentEl.children('twx-widget-content').html();
      headerContentItems[i].remove();
    }
  }

  compiledDoc.find('.gridLayout[even-rows="true"]').closest('twx-widget').addClass('hasEvenlySpacedRows');
  compiledDoc.find('.gridLayout[even-rows="false"]').closest('twx-widget').removeClass('hasEvenlySpacedRows');

  var hasEvenlySpacedRowGridClass = (compiledDoc.find('.gridLayout[even-rows="true"]').length > 0).toString();

  var popupEl = compiledDoc.find('[original-widget="twx-popup"]');
  if (popupEl.length > 0) {
    popupContentsHtml = $.html(popupEl);
    popupEl.remove();
  }

  const scannerEl = compiledDoc.find('[original-widget="twx-barcode-scanner"]');
  if (scannerEl.length > 0) {
    scannerContentsHtml = $.html(scannerEl);
    scannerEl.remove();
  }

  var isEyewear = params.settings.projectType === 'eyewear';
  var isDesktop = params.settings.projectType === 'desktop';
  if (isEyewear) {
    // if there are more than one thingmarks defined (which shouldn't be the case for eyewear projects), it will use
    // the "stationary" property value from the first thingmark.
    let isTargetStationary =
      compiledDoc
        .find('twx-dt-target')
        .closest('twx-widget')
        .find('twx-widget-property[name="stationary"]')
        .attr('value') || 'true';
    compiledDoc.find('twx-dt-view > twx-dt-tracker').attr('stationary', isTargetStationary);

    // remove extended tracking properties from the 3D container
    let _3DContainer = compiledDoc.find('twx-dt-view');
    _3DContainer.removeAttr('extendedtracking');
    _3DContainer.removeAttr('persistmap');
  }

  var hasBounce = '';
  var hasScroll = ['mobile-2D', 'hmt-2D'].includes(viewType);
  if (isEyewear || isDesktop) {
    hasBounce = 'has-bouncing="false" ';
    hasScroll = false;
  }
  // due to some ion bug need to double escape title here to display correct string (with only single escape, 'my<view' displays as 'my' and '&gt;' displays as '>')
  const escapedTitle = _.escape(_.escape(viewTitle));
  const viewAttrs =
    ' twx-view="' + viewName + '" view-title="' + escapedTitle + '" ctrl-name="' + viewName + '_TwxViewController"';
  let compiledContents;
  if (isEmbeddable) {
    compiledContents = compiledDoc.first().html();
  } else if (isModalView) {
    compiledContents =
      '<ion-modal-view' +
      viewAttrs +
      '>' +
      headerContentsHtml +
      overlayDoc.html() +
      '<ion-content scroll="' +
      hasScroll +
      '" ' +
      hasBounce +
      '>' +
      compiledDoc.first().html() +
      '</ion-content></ion-modal-view>';
  } else {
    if (hasFooter) {
      footerContentsHtml = footerEl.find('ion-footer-bar').parent().html();
      footerEl.remove();
    }
    compiledContents =
      '<ion-view hasGridEvenRows="' +
      hasEvenlySpacedRowGridClass +
      '" view-type="' +
      viewType +
      '"' +
      viewAttrs +
      ' can-swipe-back="false">' +
      headerContentsHtml +
      overlayDoc.html() +
      '<ion-content scroll="' +
      hasScroll +
      '" ' +
      hasBounce +
      '>' +
      compiledDoc.first().html() +
      '</ion-content>' +
      scannerContentsHtml +
      popupContentsHtml +
      footerContentsHtml +
      '</ion-view>';
  }

  return compiledContents;
}

/**
 * Add twx-widget-event tags for each configured event that has a event expression
 * @param {Array} events
 * @param {DomElement} twxWidgetEl
 * @param {DomElement} $target
 * @param {Object} widgetProperties Properties metadata
 */
function addWidgetEventElements(events, twxWidgetEl, $target, widgetProperties) {
  _.each(events, function (event) {
    var eventExpressionName = event.name + 'Expression';
    if ($target.attr(event.name.toLowerCase() + '-expression')) {
      widgetProperties[eventExpressionName] = $target.attr(event.name.toLowerCase() + '-expression');
      var eventEl = $('<twx-widget-event></twx-widget-event>');
      eventEl.attr('name', event.name);
      eventEl.attr('value', $target.attr(event.name.toLowerCase() + '-expression'));
      twxWidgetEl.prepend(eventEl);
    }
  });
}

/**
 * Generates a grammar file into the dist folder for each view.  The grammar file defines the voice commands that will
 * cause the associated Application Event to be fired when the voice command is recognized by the device.  If there are no
 * application events with an associated voice alias, the generation of the grammar files will be skipped.
 *
 * @param saveConfig Object containing properties/settings used to read/write files from the various locations
 */
function compileVoiceRecGrammarFiles(saveConfig) {
  let viewsDistPath = path.join(saveConfig.destTargetRoot, 'app', 'components');
  fs.ensureDirSync(viewsDistPath);

  const dataFile = fs.readJsonSync(path.join(saveConfig.srcSharedRoot, 'components', 'Data.json'));
  // find all twx-app-event elements that have a non-empty voicealias attribute
  var appEvents = _.filter(dataFile.children, function (item) {
    return item.name === 'twx-app-event' && item.attributes && item.attributes['voicealias'];
  });

  if (appEvents.length < 1) {
    log.debug('not generating the grammar files for the views since there are no app events with a voice alias');
    return;
  }

  var templatesPath = path.join(saveConfig.scaffoldDir, 'templates');
  var grammarTemplate = fs.readFileSync(path.join(templatesPath, 'view-grammar.xml.template'), 'utf8');
  if (typeof grammarTemplate === 'string') {
    // Cheerio will see a final trailing \n as a separate XML node (a text node) in the document.
    // This in turn causes problems for .append() because .append()
    // will try to append the data to all "root-level" nodes. This
    // causes Cheerio to blow up on the TextNode representing the
    // "\n".
    // Work around this behaviour by trimming the grammarTemplate before doing anything with it.
    grammarTemplate = grammarTemplate.trim();
  }
  var compiledContents = generateVoiceRecGrammar(appEvents, grammarTemplate);

  _.each(saveConfig.views, function (view) {
    var grammarFile = path.join(viewsDistPath, view.fileName + '-grammar.xml');
    fs.writeFileSync(grammarFile, compiledContents);
  });
}

/**
 * Generates the contents of the grammar file for the given set of application events containing a voice alias command.
 *
 * @param voiceCommandAppEvents List of application events that have a voice alias command associated to it
 * @param grammarTemplate The template containing the content structure
 * @return {string}
 */
function generateVoiceRecGrammar(voiceCommandAppEvents, grammarTemplate) {
  var $grammar = $(grammarTemplate, {
    xmlMode: true,
    normalizeWhitespace: true,
  });

  var helpTokens = [];
  var $cmds = $grammar.find('#cmds > one-of');
  var cmdCount = 1;

  _.each(voiceCommandAppEvents, function (appEvent) {
    var cmdToken = appEvent.attributes['voicealias'];
    var cmd = appEvent.attributes['name'];
    var cmdId = 'voice_command_' + cmdCount++;
    var cmdHelp = appEvent.attributes['voicehelp'] || '';

    var commandBlob = ' out.command="' + xmlescape(cmd) + '";';
    // the response is intentionally blank here, it's added as a event listener in the twx-app-event directive in twx-client-core-all.js
    var helpBlob = ' out.help="' + xmlescape(cmdHelp) + '";';
    const ruleTmpl =
      '  <rule id="' +
      cmdId +
      '">\n' +
      '    <item>\n' +
      '      <tag></tag>\n' +
      '      <token></token>\n' +
      '    </item>\n' +
      '  </rule>\n';

    const ruleDoc = $(ruleTmpl, {
      xmlMode: true,
      normalizeWhitespace: true,
    });

    ruleDoc.find('tag').text(commandBlob + helpBlob);
    ruleDoc.find('token').text(xmlescape(cmdToken));
    $grammar.append(ruleDoc);
    var ruleRefBlob = '  <item><ruleref uri="#' + cmdId + '"/></item>\n';
    $cmds.append(ruleRefBlob);
    helpTokens.push(xmlescape(cmdToken));
  });

  var $help = $grammar.find('#ptcSpeechCommandHelp tag');
  if ($help.length) {
    var $helplist = $help.eq(0);
    $helplist.text($helplist.text().replace('%%help%%', ' ' + helpTokens.join(', ')));
  }

  const beautify = require('js-beautify').html;
  return beautify('<?xml version="1.0" encoding="utf-8" ?>\n' + $.xml($grammar), {
    indent_size: 2,
    html: { end_with_newline: true },
  });
}

/**
 * called via Array.prototype.forEach
 * expects 'this' to be config.
 *
 * @param {object} config -  an object containing useful information about the operation
 * @param {object} view - view / fragment data
 * @param {string} type - type of resource : view or fragment
 */

function addEscapedInlineHTML(config, view, type) {
  var relativePath = type === 'view' ? path.join('app', 'components') : path.join('app', 'shared', 'fragments');
  var viewFilePath = path.join(config.destTargetRoot, relativePath, view.fileName + '.html');
  log.debug('Working with view named ' + viewFilePath + ' which exists? [' + fs.existsSync(viewFilePath) + ']');
  var viewFile = fs.readFileSync(viewFilePath, 'utf8');
  var lines = viewFile.split('\n');

  lines.forEach(function (line, idx, arr) {
    arr[idx] = "'" + line.replace(/\'/g, '&apos;') + "\\n'";
  });

  view.inlineableHTML = lines.join('+\n');
}

/**
 * Convert JSON design files to Twxml format
 * @param {String} jsonString
 * @param {Boolean} addDataDash - True to prepend attribute keys with data- when no dash is present
 */
function JSONToXML(jsonString, addDataDash) {
  var xml = '';
  if (jsonString.length > 0) {
    var jsonContents = JSON.parse(jsonString);
    var rootNode = jsonContents.name;
    if (rootNode) {
      var root = $('<' + rootNode + '/>');
      root.append(convertJSON(jsonContents, addDataDash));
      xml = root.html();
    }
  }
  return xml;
}

function getAttrName(name) {
  if (name && !name.includes('-')) {
    return 'data-' + name;
  }
  return name;
}

/**
 * Child iterator for converting JSON design files to Twxml format
 * @param {String} source
 * @param {Boolean} addDataDash - True to prepend attribute keys with data- when no dash is present
 */
function convertJSON(source, addDataDash = true) {
  var sourceName = source['name'];
  var xml = $('<' + sourceName + '/>');
  if (source.attributes) {
    _.forEach(source.attributes, function (attrValue, attrName) {
      xml.attr(addDataDash ? getAttrName(attrName) : attrName, attrValue);
    });
  }
  if (source.children) {
    _.forEach(source.children, function (childValue) {
      xml.append(convertJSON(childValue, addDataDash));
    });
  }
  return xml;
}

exports.copySrc = copySrc;
exports.clean = clean;
exports.compileTwxmlToHtml = compileTwxmlToHtml;
exports.getAppBuilder = getAppBuilder;
exports.init = init;
exports.readProjectSettingsSync = readProjectSettingsSync;
exports.buildApp = buildApp;
exports.getScaffoldDir = getScaffoldDir;
exports._compileVoiceRecGrammarFiles = compileVoiceRecGrammarFiles;
exports.generateIndex = generateIndex;
exports._processViews = _processViews;
exports.getCombinedWidgets = getCombinedWidgets;
exports.getWidgetUsageAnalytics = getWidgetUsageAnalytics;
exports.updateMetadataWithSpatialRequires = updateMetadataWithSpatialRequires;
exports.updateMetadataWithAssistedRealityRequires = updateMetadataWithAssistedRealityRequires;
exports.updateMetadataWithWidgetsUsage = updateMetadataWithWidgetsUsage;
exports.hasClickInteraction = hasClickInteraction;
exports._handleResourceUrl = handleResourceUrl;
exports._encodeAsDataURL = encodeAsDataURL;
exports._compileViewContents_step2 = compileViewContents_step2;
exports._applyWidgetDependencies = applyWidgetDependencies;
exports.getAttrName = getAttrName;
exports.JSONToXML = JSONToXML;
exports._getProjectDeviceName = _getProjectDeviceName;
exports._localizeDefaultView = _localizeDefaultView;
exports._getInitViewComponent = _getInitViewComponent;
exports.initializeExperience = initializeExperience;
exports._getLocalizedViewName = _getLocalizedViewName;
exports._addWidgetEventElements = addWidgetEventElements;
exports._getExtensionInfoWithRuntimeFileFilterApplied = getExtensionInfoWithRuntimeFileFilterApplied;
