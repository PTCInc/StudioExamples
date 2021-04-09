const fs = require('fs-extra');
const path = require('path');
const log = require('studio-log').getLogger('ar-extension:gulp-shared');
let AdmZip = require('adm-zip');

/**
 * Extracts all the .pvi files found in all the .pvz files in the uploaded directory
 * In cases where they may be loaded dynamically, so that they are available.
 * Does not update any widget properties that might have a url to a PVI.
 *
 * @param {String} rootPath of the Uploaded directory
 */
function extractAllPVIFiles(rootPath) {
  try {
    if (fs.existsSync(rootPath)) {
      fs.readdirSync(rootPath).forEach((file) => {
        if (/\.pvz$/i.test(file)) {
          let fileName = file.substring(0, file.length - 4);
          fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.]/gi, '_');
          let destPath = path.join(rootPath, fileName);
          var zip = new AdmZip(path.join(rootPath, file));
          var zipEntries = zip.getEntries();
          zipEntries.forEach(function (zipEntry) {
            if (/\.pvi$/i.test(zipEntry.entryName)) {
              try {
                zip.extractEntryTo(zipEntry.entryName, destPath, /*maintainEntryPath*/ false, /*overwrite*/ false);
              } catch (e) {
                log.debug('PVI file already exists', e);
              }
            }
          });
        }
      });
    }
  } catch (e) {
    log.warn('Error trying to extract PVI files from all PVZs:', e);
  }
}

/**
 * @param pvzFile  {String} file path to pvz file
 * @param pviPath  {String} url path of the pvi file.
 * @param pviFinalPath {String}  file path of the pvi file in dist
 * @private
 */
function extractPVI(pvzFile, pviPath, pviFinalPath) {
  let AdmZip = require('adm-zip');
  var zip = new AdmZip(pvzFile);
  var pviNameInZip = pviPath.substring(pviPath.lastIndexOf('/') + 1);
  var pathWithoutName = pviFinalPath.substring(0, pviFinalPath.lastIndexOf(pviNameInZip));
  try {
    zip.extractEntryTo(pviNameInZip, pathWithoutName, /*maintainEntryPath*/ false);
  } catch (e) {
    log.error('PVI extract failure', pviNameInZip, pathWithoutName, pvzFile, e);
  }
}

/**
 * Extracts PVI file from PVZ if there is a PVZ src defined and
 * the PVI sequence is defined, but PVI file doesn't exist.
 * Updates the sequence property to have a new path to the PVI file
 *
 * @param {object} widgetProperties that may or may not be for a Model (and may or may not have src & sequence)
 * @param {string} srcRoot path to root dir of src where PVZ and PVI should reside
 * @param {string} destRoot path to root dir of destination to extract PVI to if necessary
 * @private
 */
function extractPVI_ifNecessary(widgetProperties, srcRoot, destRoot, twxWidgetEl) {
  var src = widgetProperties.src;
  var sequence = widgetProperties.sequence;
  if (sequence && src && /\.pvz$/i.test(src)) {
    src = decodeURI(src);
    sequence = decodeURI(sequence);
    const srcpvz = path.join(srcRoot, src.substring(src.indexOf('app') + 4));
    if (!fs.existsSync(path.join(destRoot, sequence))) {
      if (!fs.existsSync(srcpvz)) {
        throw new Error('Missing PVZ file, sequence cannot be extracted: ' + srcpvz);
      }
      //Do not need to extract if the pvi already exists in the uploaded dir
      var fileName = src.substring(src.lastIndexOf('/') + 1, src.length - 4);
      fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.]/gi, '_');
      var newDir = fileName;
      let destpvi = path.join(
        destRoot,
        sequence.substring(0, sequence.lastIndexOf('/')),
        newDir,
        sequence.substring(sequence.lastIndexOf('/') + 1)
      );

      //The PVI may have the same name as others in different PVZ files (removal.pvi for engine and transmission)
      //They may also exist in multiple views.   Allow for multiple duplicates by using a sub-directory of the widget id
      //and index extension to make sure it can eventually find a unique solution
      let count = 1;
      while (fs.existsSync(destpvi) && count < 1000) {
        newDir = fileName + '_' + count++;
        destpvi = path.join(
          destRoot,
          sequence.substring(0, sequence.lastIndexOf('/')),
          newDir,
          sequence.substring(sequence.lastIndexOf('/') + 1)
        );
      }
      widgetProperties.sequence = encodeURI(sequence.replace('Uploaded/', 'Uploaded/' + newDir + '/'));
      twxWidgetEl.find('[name="sequence"]').attr('value', widgetProperties.sequence);
      log.debug('Extract pvi from src pvz zip', srcpvz, destpvi);
      extractPVI(srcpvz, sequence, destpvi);
    }
  }
}

exports.extractAllPVIFiles = extractAllPVIFiles;
exports.extractPVI_ifNecessary = extractPVI_ifNecessary;
exports.extractPVI = extractPVI;
