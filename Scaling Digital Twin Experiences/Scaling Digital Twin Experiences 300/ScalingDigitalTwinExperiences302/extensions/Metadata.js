(function () {
  const _propertiesCache = {};
  /*global Enumerable */
  /**
 * Example usage:
 *
    PTC.Metadata.fromId('model-1').then(function(modelMeta) {

      modelMeta.get('/0/6', 'Display Name')
      => "BLOWER.ASM"
      modelMeta.get('/0/6').getCategory('__PV_SystemProperties')
      => {Component Name: "BLOWER.ASM", Display Name: "BLOWER.ASM", OL File Name: "", Part Depth: "3", Part ID: "6", …}

      modelMeta.find('Display Name').like('PRT')
      => Metadata {id: "model-1", _friendlyName: "Display Name like PRT", _selectedPaths: Array(26)}

      modelMeta.find('Display Name').like('PRT').find('Part Depth').in(0,3)
      => Metadata {id: "model-1", _friendlyName: "Display Name like PRT AND Part Depth in 0-3", _selectedPaths: Array(10)}

      var meta = modelMeta.find('Part Depth').greaterThan(4);
      meta.getSelected();
      =>["/0", "/0/1", "/0/1/2", "/0/6"]

      modelMeta.find('Part Depth').greaterThan(4, (idpath) => modelMeta.get(idpath, 'Display Name'))
      => ["PISTON.PRT", "PISTON_PIN.PRT", "CONNECTING_ROD.PRT"]

      modelMeta.findCustom(whereFunc, (idpath) => modelMeta.get(idpath, 'Display Name'))
      =>["PISTON.ASM", "PISTON.PRT", "PISTON_PIN.PRT", "CONNECTING_ROD.PRT"]

      modelMeta.find('Part Depth').greaterThan(4, (idpath) => modelMeta.get(idpath).getCategory('__PV_SystemProperties'))
      => (3) [{…}, {…}, {…}]
      0: {Component Name: "PISTON.PRT", Display Name: "PISTON.PRT", OL File Name: "l-Creo 3D_0_ac-40_asm_5.ol" …}
      1: {Component Name: "PISTON_PIN.PRT", Display Name: "PISTON_PIN.PRT", OL File Name: "l-Creo 3D_0_ac-40_asm_6.ol",…}
      2: {Component Name: "CONNECTING_ROD.PRT", Display Name: "CONNECTING_ROD.PRT", OL File Name: "l-Creo 3D_0_ac-40_asm_7.ol", …}
    }
 */
  if (!window.PTC) {
    window.PTC = {};
  }
  PTC.Metadata = class Metadata {
    constructor(id, selectedPaths, friendlyName) {
      this.id = id;
      if (friendlyName) {
        this._friendlyName = friendlyName;
      }
      this._selectedPaths = selectedPaths;
      this.activateSourceListener();
    }

    /**
     * Add a listener on the 'src' attribute of the 3D Model and load the metadata file
     */
    activateSourceListener() {
      const self = this;
      const elemToCheck = document.querySelector('[id="' + self.id + '"]');
      if (elemToCheck) {
        const config = { attributes: true, childList: true, subtree: true };
        const observer = new MutationObserver(function (mutationsList, observer) {
          for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
              _propertiesCache[self.id] = null;
              self._updateDataIfNecessary();
            }
          }
        });
        observer.observe(elemToCheck, config);
      }
    }

    /**
     * Generate a metadata object loading the file related to the id
     * @param {string} id - Id of the 3D Model
     * @returns {Promise<Metadata|Error>}}
     *          When resolved, the generate Metadata object
     *          When failed, an error message is returned
     */
    static fromId(id) {
      const md = new Metadata(id);
      return md._updateDataIfNecessary();
    }

    /**
     * Generate a metadata object by passing a json
     * @param {json} data - json of the 3D Model
     * @returns {Metadata}} the generate Metadata object
     */
    static fromData(id, data) {
      const md = new Metadata(id);
      md.data = data;
      md._selectedPaths = Object.keys(data);
      md.isExternalData = true;
      return md._updateDataIfNecessary();
    }

    _updateDataIfNecessary() {
      var self = this;
      return new Promise(function (resolve, reject) {
        if (!_propertiesCache[self.id]) {
          const modelEl = document.querySelector('[id="' + self.id + '"]');
          if (modelEl) {
            const src = modelEl.getAttribute('src');
            const properties = _propertiesCache[src];
            if (!properties) {
              if (self.isExternalData) {
                _propertiesCache[self.id] = self.data;
                resolve(self);
              } else {
                const metadataPath = src.substring(0, src.lastIndexOf('.')) + '.metadata.json';
                const http = angular.element(document.body).injector().get('$http');
                http
                  .get(metadataPath)
                  .success(function (data) {
                    _propertiesCache[self.id] = _propertiesCache[src] = data;
                    resolve(self);
                  })
                  .error(function (error) {
                    console.error('Error loading metadata: ', error);
                    _propertiesCache[self.id] = _propertiesCache[src] = {};
                    reject(new Error('Error loading metadata'));
                  });
              }
            } else {
              _propertiesCache[self.id] = properties;
            }
          } else {
            resolve(self);
          }
        }
        if (_propertiesCache[self.id] && self._selectedPaths === undefined) {
          self._selectedPaths = Object.keys(_propertiesCache[self.id]);
          resolve(self);
        }
      });
    }

    _setPropertyCache(id, obj) {
      _propertiesCache[id] = obj;
    }

    _getRawProps() {
      return _propertiesCache[this.id] ? _propertiesCache[this.id] : {};
    }

    /**
     * Gets a metadata obj representing the given id path, or property value(s) for given idpath and propName
     * @param {string|string[]} idpath id path such as '/0/1', or array of idpaths ['/0/1', '/0/2']
     * @param {string|string[]} propName     optional, such as 'Display Name', or ['Display Name', 'Part ID Path']
     * @param {string|string[]} categoryName optional, such as 'PROE Parameters'
     *          if propName was string [], categoryName must also be array of matching length (or undefined)
     * @returns metadata obj representing the given id path, or if propName is given then the value of the property on the component,
     *          if category is given then property must be in that category, if category is undefined property may be in any category
     */
    get(idpath, propName, categoryName) {
      this._updateDataIfNecessary();
      if (Array.isArray(idpath)) {
        const that = this;
        if (propName) {
          let result = [];
          idpath.forEach(function (id) {
            result.push(that.get(id, propName, categoryName));
          });
          return result;
        } else {
          let result = [];
          idpath.forEach(function (i) {
            if (that._getRawProps()[i]) {
              result.push(i);
            }
          });
          const friendlyName = result.slice(0, 3).join(', ') + (result.length > 3 ? '...' : '');
          return new Metadata(this.id, result, friendlyName);
        }
      } else {
        if (this._selectedPaths && this._selectedPaths.includes(idpath)) {
          let component = this._getRawProps()[idpath];
          if (component) {
            if (propName) {
              const _getProp = function (propName, categoryName) {
                const category = categoryName
                  ? component[categoryName]
                  : Object.values(component).find(function (category) {
                      return propName in category;
                    });
                return category ? category[propName] : undefined;
              };
              if (Array.isArray(propName) && (categoryName === undefined || Array.isArray(categoryName))) {
                let result = [];
                for (let i = 0; i < propName.length; i++) {
                  result.push(_getProp(propName[i], categoryName ? categoryName[i] : undefined));
                }
                return result;
              } else {
                return _getProp(propName, categoryName);
              }
            } else {
              return new PTC.Metadata(this.id, [idpath], idpath /* friendly name */);
            }
          }
        }
      }
      return undefined;
    }

    /**
     * @param {string|string[]} propName     optional, such as 'Display Name', or ['Display Name', 'Part ID Path']
     * @param {string|string[]} categoryName optional, such as 'PROE Parameters'
     *          if propName was string [], categoryName must also be array of matching length (or undefined)
     * @returns string prop value all from a single component, or undefined if no data/components available,
     *          if given propName was an array, returns string[] of values
     */
    getProp(propName, categoryName) {
      if (this._selectedPaths && this._selectedPaths.length >= 1) {
        return this.get(this._selectedPaths[0], propName, categoryName);
      }
      return undefined;
    }

    /**
     * @param {string} categoryName
     * @returns object with all property names and values from given category
     */
    getCategory(categoryName) {
      if (this._selectedPaths && this._selectedPaths.length >= 1) {
        const idpath = this._selectedPaths[0];
        const component = this._getRawProps()[idpath];
        return component ? component[categoryName] : undefined;
      }
      return undefined;
    }

    /**
   * @param {function} selectFunc optional, function that controls the values put into the returned array
   *                      The func is given idpath as an arg and current metadata as `this`
                          function(idpath) {
                              return [idpath, this.get(idpath, 'Display Name')];
                          });
   * @returns an array of whatever is returned by the given selectFunc,
   *          or if selectFunc undefined then returns string[] of id paths
   */
    getSelected(selectFunc) {
      if (typeof selectFunc === 'function') {
        if (this._selectedPaths && this._selectedPaths.length >= 1) {
          let result = [];
          const that = this;
          this._selectedPaths.forEach(function (idpath) {
            result.push(selectFunc.call(that, idpath));
          });
          return result;
        }
        return undefined;
      } else {
        return this._selectedPaths || Object.keys(this._getRawProps());
      }
    }

    /**
   * Find components based on property values
   * Also see findCustom
   *
   * @returns a finder for component(s) based on given propName and category. For example:
   *      PTC.Metadata('model-1').find('Display Name').like('BOLT')
   *      PTC.Metadata('model-1').find('Part Depth').lessThan(3).find('Display Name').like('PRT')
   *
          var selectFunc = function(idpath) {
            // scope var `this` is the metadata instance
            return this.get(idpath, 'Display Name')
          }
          PTC.Metadata.fromId('model-1').find('Part Depth').greaterThan(4, selectFunc)

   * The comparison can be:
          - startsWith,like,sameAs,unlike                                 : string comparison
          - equal,notequal,greaterThanEq,lessThanEq,lessThan,greaterThan  : numeric comparison
          - in,out                                                        : numeric range comparison
          - before,after                                                  : date/time comparison

   */
    find(propName, category) {
      this._updateDataIfNecessary();
      return new Find(propName, category, this);
    }

    /**
   * Also see find
   *
   * @param {function} whereFunc required
   * @param {function} selectFunc optional
   * @returns a finder for component(s) based on custom whereFunc. For example:
   *    // finds all components with depth<2 OR has name like 'ASM'
        var whereFunc = function(idpath) {
          // scope var `this` is the metadata instance
          const depth = this.get(idpath, 'Part Depth')
          const name  = this.get(idpath, 'Display Name')
          return parseFloat(depth) >= 4 || (name && name.search('ASM') >= 0)
        }
        PTC.Metadata.fromId('model-1').findCustom(whereFunc)
   */
    findCustom(whereFunc, selectFunc) {
      this._updateDataIfNecessary();
      const result = new Find(undefined, undefined, this);
      return result.findCustom(whereFunc, selectFunc);
    }
  };

  const cmds = {
    starts: function (a, b) {
      return a.search(b) === 0;
    },
    not: function (a, b) {
      return a !== b;
    },
    same: function (a, b) {
      return a === b;
    },
    like: function (a, b) {
      return a.search(b) >= 0;
    },
    unlike: function (a, b) {
      return a.search(b) < 0;
    },
    eq: function (a, b) {
      return parseFloat(a) === parseFloat(b);
    },
    ne: function (a, b) {
      return parseFloat(a) !== parseFloat(b);
    },
    lt: function (a, b) {
      return parseFloat(a) < parseFloat(b);
    },
    gt: function (a, b) {
      return parseFloat(a) > parseFloat(b);
    },
    le: function (a, b) {
      return parseFloat(a) <= parseFloat(b);
    },
    ge: function (a, b) {
      return parseFloat(a) >= parseFloat(b);
    },
    in: function (a, b, c) {
      var pa = parseFloat(a);
      return pa >= parseFloat(b) && pa <= parseFloat(c);
    },
    out: function (a, b, c) {
      var pa = parseFloat(a);
      return !(pa >= parseFloat(b) && pa <= parseFloat(c));
    },
    before: function (a, b) {
      var pa = Date.parse(a);
      var pb = Date.parse(b);
      return pa < pb;
    },
    after: function (a, b) {
      var pa = Date.parse(a);
      var pb = Date.parse(b);
      return pa > pb;
    },
  };

  class Find {
    // jshint ignore:line
    constructor(propName, categoryName, metadata) {
      this._propertyName = propName;
      this._categoryName = categoryName;
      this._metadata = metadata;
    }

    _find(cmdName, propValue1, propValue2) {
      // friendly name such as 'model-1 Display Name like FLANGE', or 'model-1 Part Depth in 1-5'
      const friendlyWhere = this._whereFunc
        ? 'custom whereFunc'
        : [
            this._propertyName + (this._category ? ':' + this._category : ''),
            cmdName,
            propValue1 + (propValue2 ? '-' + propValue2 : ''),
          ].join(' ');
      const friendlyName = (this._metadata._friendlyName ? this._metadata._friendlyName + ' AND ' : '') + friendlyWhere;
      let propsCount = 0;
      Object.values(this._metadata._getRawProps()).forEach(function (node) {
        Object.values(node).forEach(function (category) {
          propsCount = propsCount + Object.values(category).length;
        });
      });

      const compareFunc = cmdName ? cmds[cmdName] : undefined;
      const that = this;
      const pathsToQuery = this._metadata.getSelected();
      const whereFunc = this._whereFunc
        ? function (idpath) {
            return that._whereFunc.call(that._metadata, idpath);
          }
        : function (idpath) {
            const propValue = that._metadata.get(idpath, that._propertyName, that._categoryName);
            return propValue && compareFunc(propValue, propValue1, propValue2);
          };
      const selectFunc = this._selectFunc
        ? function (idpath) {
            return that._selectFunc.call(that._metadata, idpath);
          }
        : function (idpath) {
            return idpath;
          };
      const queryResult = Enumerable.from(pathsToQuery).where(whereFunc).select(selectFunc).toArray();

      if (this._selectFunc) {
        return queryResult;
      } else {
        const result = new PTC.Metadata(this._metadata.id, queryResult, friendlyName);
        return result;
      }
    }

    startsWith(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('starts', propValue);
    }
    not(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('not', propValue);
    }
    sameAs(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('same', propValue);
    }
    like(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('like', propValue);
    }
    unlike(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('unlike', propValue);
    }
    equal(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('eq', propValue);
    }
    notEqual(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('ne', propValue);
    }
    lessThanEq(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('le', propValue);
    }
    greaterThanEq(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('ge', propValue);
    }
    lessThan(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('lt', propValue);
    }
    greaterThan(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('gt', propValue);
    }
    in(min, max, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('in', min, max);
    }
    out(min, max, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('out', min, max);
    }
    before(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('before', propValue);
    }
    after(propValue, selectFunc) {
      this._selectFunc = selectFunc;
      return this._find('after', propValue);
    }
    findCustom(whereFunc, selectFunc) {
      this._selectFunc = selectFunc;
      this._whereFunc = whereFunc;
      return this._find();
    }
  }
})();
