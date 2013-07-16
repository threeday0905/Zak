(function(window) {
  'use strict';

  var
    exports = window,
    document = window.document,
    navigator = window.navigator,
    location = window.location,
    userAgent = navigator.userAgent,
    setTimeout = window.setTimeout,
    href = location.href,

    /* Main Classes*/
    Zak, ZakHelper, AppItem,
    Page, Element, Script, Source, Material, Template, Node,

    /* Shared properties */
    kaz, swak, flag, config;


  swak = window.swak;
  kaz = new window.Kaz();

  flag = {
    phonegap: /^file:\//i.test(href) && /ios|iphone|ipod|ipad|android/i.test(userAgent),
    /*mobile: undefined,
    tablet: undefined,*/
    ios: /ios|iphone|ipod|ipad/i.test(userAgent),
    android: /android/i.test(userAgent)
  };

  config = {
    appName: 'Zak App',
    scriptMethods: [ 'init', 'load', 'render', 'show', 'hide', 'source'],
    dataKey: {
      mtrFilter: 'data-page-filter',
      mtrParameter: 'data-page-parameter',
      btnSwitch: 'data-btn-switch',
      btnRefresh: 'data-btn-refresh',
      btnBack: 'data-btn-back'
    },
    sourceType: [
      { name: 'template', dataType: 'html'   },
      { name: 'element',  dataType: 'html'   },
      { name: 'script',   dataType: 'script' },
      { name: 'material', dataType: 'json'   }
    ],
    sourcePath: {
      element:  './source/element/${0}.html',
      template: './source/template/${0}.html',
      material: './source/material/${0}.json',
      script:   './source/script/${0}.js'
    },
    storageKey: 'zak_Source',
    material: {
      filterKey: 'one',
      parameterKey: 'par'
    },
    cache: true,
    prod: false
  };

  /* B: Core Class - Source */
  Source = function(options) {
    var
      SourceItem, //sub class
      setting = swak.oo.mixin( {
        storageKey: config.storageKey,
        sourceType: config.sourceType,
        sourcePath: config.sourcePath,
        sourceProxy: {}
      }, options),
      cache = new swak.storage(setting.storageKey),
      remote = function(sourceItem) { return swak.ajax(sourceItem.path(), { dataType: sourceItem.dataType }); },
      memCache = {},
      proxy = setting.sourceProxy,
      path = setting.sourcePath,
      types = swak.to.obj(setting.sourceType, 'name'),
      timer = new swak.timer();

    SourceItem = function(type, key, options2) {
      if (!type || !key) { return undefined; }

      var setting2 = swak.oo.mixin({ refresh: false }, options2),
          typeObj = swak.to.objByKey(type, types),
          reload = setting2.refresh || this.needRefresh();

      this.type = typeObj.name;
      this.dataType = typeObj.dataType;
      this.key = key;
      this.value = undefined;
      this.cache = true;
      this.error = false;

      if (setting.debug) { timer.start(); }
      if (!cache.available) {
        if (reload || swak.is.empty(memCache[this.toString()])) {
          this.value = remote(this);
          this.cache = false;
          memCache[this.toString()] = this.value;
        } else {
          this.value = memCache[this.toString()];
          this.cache = true;
        }
      } else {
        if (reload || !cache.exists(this)) {
          this.value = remote(this);
          this.cache = false;
          cache.put(this);
        } else {
          this.value = cache.take(this);
        }
      }

      if (this.cache && typeObj === types.script) {
        eval(this.value);
      }

      if (setting.debug) { timer.done(this.path() + ' loaded {0} / ' + ( this.cache ? '(cache)' : '(remote)' ), 'Source - ' + this.type); }
    };

    SourceItem.prototype = {
      toString: function() {
        return this.key + '_' + this.type;
      },
      valueOf: function() {
        return this.value;
      },
      path: function() {
        var
          self = this,
          defaultFn = function() {
            var result = (path[self.type] || '').replace(/\$\{(\w)\}/g,
              function(match, val) {
                switch (val) {
                case '0':
                  return self.key;
                case '1':
                  return self.type;
                case '2':
                  return self.dataType;
                default:
                  return match;
                }
              }
            );
            return result;
          };
        return swak.is.fn(proxy.path) ? proxy.path.call(self, defaultFn) : defaultFn();
      },
      needRefresh: function() {
        var self = this, defaultFn = function() {
          return false; //!cache.available;
        };
        return swak.is.fn(proxy.needRefresh) ? proxy.needRefresh.call(self, defaultFn) : defaultFn();
      }
    };

    this.sync = function(type, key, options) {
      var data = new SourceItem(type, key, swak.is.bool(options) ? { refresh: options } : options );
      return data.value;
    };

    this.clear = cache.clear;
  };
  /* E: Core Class - Source */

  /* B: Core Class - Material */
  Material = function(key, source, options) {
    var
      setting = swak.oo.mixin({
        filterName : config.material.filterKey,
        parameterName: config.material.parameterKey
      }, options),
      lastFilter, lastParameter, keys, data;

    this.load = function(key, refresh) {
      data = {};
      if (key) { keys = swak.to.opt(key); }
      if (swak.is.empty(keys)) { return; }

      var len = keys.length, name,
          reload = !!(refresh || setting.refresh);

      while ( len-- ) {
        name = keys[len].replace(/\.[\w\W]*/, '');
        if (name) {
          data[name] = source.sync('material', name, reload );
        }
      }
    };

    this.parameter = function(pas) {
      if (pas === true && !swak.is.empty(lastParameter)) {
        pas = lastParameter;
      }
      if (pas) {
        lastParameter = pas;
        data[setting.parameterName] = pas.items;
      } else if (data[setting.parameterName]) {
        lastParameter = null;
        delete data[setting.parameterName];
      }
    };

    this.filter = function(fts) {
      if (fts === true && !swak.is.empty(lastFilter)) {
        fts = lastFilter;
      }
      if (fts) {
        lastFilter = fts;
        data[setting.filterName] = {};
        fts = swak.to.arr(fts).forEach(function(ft) {
          data[setting.filterName][ft.dataName] = ft.reduce(data);
        });
      } else if (data[setting.filterName]) {
        lastFilter = null;
        delete data[setting.filterName];
      }
    };

    this.data = function(fts, pas) {
      if (fts || fts === false) { this.filter(fts); }
      if (pas || pas === false) { this.parameter(pas); }
      return data;
    };

    this.reset = function() {
      this.filter(false);
      this.parameter(false);
      return data;
    };

    if (key) {
      this.load(key);
    }
  };

  /* B: Material Sub Class */
  Material.Filter = function(dataName, prop, key) {
    this.isFilter = true;
    this.dataName = dataName;
    this.prop = prop;
    this.value = key || '';

    this.reduce = function(data, key) {
      if (!data) { data = {}; }
      if (key) { this.value = key || ''; }

      var i, target = this.dataName ? data[this.dataName] : data;
      if (swak.is.arr(target)) {
        i = target.length;
        while ( i-- ) {
          if (target[i][this.prop].toString() === this.value.toString()) {
            return target[i];
          }
        }
      }
    };
  };

  Material.Filter.create = function(name, prop, value) {
    if (swak.is.empty(name)) { return undefined; }
    var result = [], reg, mat;
    if (arguments.length === 3) {
      result.push(new Material.Filter(name, prop, value));
    } else if (name) {
      reg = /\s*(\w+):(\w+):(\w+)\s*/g;
      while( (mat = reg.exec(name)) !== null ) {
        result.push(new Material.Filter(mat[1], mat[2], mat[3]));
      }
    }
    result.isFilter = true;
    return result;
  };
  Material.Parameter = function(str) {
    var self = this, reg = /(\w+)\s*:\s*([\w\.]*)/g, mat;
    self.items = {};
    if (swak.is.str(str) && str) {
      while( ( mat = reg.exec(str) ) !== null) {
        self.items[mat[1]] = ( mat[2] === 'undefined' || mat[2] === 'null' ) ? null : mat[2];
      }
    }
    self.isParameter = true;
  };
  Material.Parameter.create = function(str) {
    if (swak.is.empty(str)) { return undefined; }
    return new Material.Parameter(str);
  };
  /* E: Material Sub Object */

  /* E: Core Class - Material */

  /* B: Core Class - Element */
  Element = function(key, source, options) {
    if (swak.is.bool(options)) { options = { refresh: options }; }
    var setting = options || {};
    this.key = key;
    this.html = source.sync('element', key, setting.refresh);
  };
  /* E: Core Class - Element */

  /* B: Core Class - Script */
  Script = function(key, source, options) {
    this.source = source;
    this.setting = swak.oo.mixin({
      args: function() { return undefined; }
    }, options);
    this.queue = [];
    if (key) {
      this.load(key);
    }
  };

  Script.prototype = {
    load: function(key, refresh) {
      var reload = !!(refresh || this.setting.refresh),
          source = this.source;
      if (!key) { return; }

      swak.to.opt(key).forEach(function(scriptKey) {
        source.sync('script', scriptKey, reload);
        // it will load and execute remote script file, then automatically call register method via jsonp.
      });
    },
    register: function(scripts, id) {
      if (!scripts) { return; }
      var instance = {}, len = Script.methods.length, fn;
      while ( len-- ) {
        fn = Script.methods[len];
        if (swak.is.fn(scripts[fn])) {
          instance[fn] = scripts[fn];
        }
      }
      instance.extend = scripts.extend || {};
      instance.id = id || (+new Date());
      this.queue.push(instance);
    },
    exec: function(methodName, pars) {
      if (!methodName) { return; }
      var args = pars || this.setting.args();
      this.queue.forEach(function(item) {
        if (swak.is.fn(item[methodName])) {
          item[methodName].apply(item, args);
        }
      });
    },
    clear: function() {
      this.queue = [];
    }
  };
  Script.methods = config.scriptMethods;
  /* E: Core Class - Script */

  /* B: Core Class - Template */
  Template = function(key, source, options) {
    var setting = options || {};
    this.template = '';
    this.elements = undefined;
    this.tokens = undefined;
    this.load = function(key, refresh) {
      var reload = !!(refresh || setting.refresh);
      this.key = key;
      if (key) {
        this.template = source.sync('template', key, reload);
        this.tokens = kaz.tmpl.collect(this.template);
        this.elements = swak.to.obj(this.tokens, 'self', function() {
          return this.charAt(0) !== '#' ? new Element(this, source, reload).html : this;
        });
      }
    };


    this.html = function(material) {
      var tmpl = kaz.tmpl.extend(this.template, this.elements);
      return kaz.html.chew(tmpl, material);
    };

    this.sample = function() {
      return kaz.tmpl.extend(this.template, this.elements);
    };

    if (key) {
      this.load(key);
    }
  };
  /* E: Core Class - Template */

  /* B: Core Class - Page */
  Page = function(key, source, options) {
    var
      self = this,
      setting = swak.oo.mixin({
        refreshBtn: true,
        backBtn: true
      }, options);

    this.key = key;
    this.setting = setting;
    this.cache = {};
    this.node = new Node();
    this.material = new Material('', source, setting);
    this.template = new Template('', source, setting);
    this.script = new Script('', source, {
      args: function() {
        var data = self.data();
        return [self, data.data];
      }
    });

    //this.load(this.setting.refresh);
    this.script.exec('init');

  };

  Page.prototype = {
    //Page Flow Methods
    show: function() {
      this.script.exec('show');
    },
    hide: function() {
      this.script.exec('hide');
    },
    load: function(reload) {
      if (reload) { this.cache = {}; }

      this.template.load(this.key, reload);
      this.material.load(this.setting.material, reload);

      this.script.clear();
      this.script.load(this.setting.script, reload);
      this.script.register(this.setting.appScript);
      this.script.exec('load');
    },
    render: function(refresh) {
      if (this.node.isEmpty() || refresh) {
        var data = this.material.data();
        this.script.exec('source');
        this.node.load(this.template.html(data));
        this.script.exec('render');
      }
      return this.node.content();
    },
    reload: function() {
      this.load(true);
      this.material.filter(true); // pass true to use the last filter & parameter data
      this.material.parameter(true);
      this.render(true);
    },
    //Page Material Methods
    filter: function(fts) {
      if (fts || fts === false) {
        this.material.filter(fts);
        this.render(true);
      }
    },
    parameter: function(pas) {
      if (pas || pas === false) {
        this.material.parameter(pas);
        this.render(true);
      }
    },
    //Page Node Methods
    content: function() { return this.node.content(); },
    find: function(selector) { return this.node.find(selector); },
    findAll: function(selector) { return this.node.findAll(selector); },

    //Page Properties Methods
    title: function() {
      var title = this.setting.title;
      return kaz.isPattern(title) ?
        kaz.data.chew(title, this.material.data()) || '' : title;
    },
    data: function() {
      return {
        data: this.material.data(),
        opt: {
          title: this.title(),
          nav: this.setting.nav || this.key,
          refreshBtn: !!this.setting.refreshBtn,
          backBtn: !!this.setting.backBtn
        }
      };
    },
    registerScript: function(scriptInstance) {
      this.script.register(scriptInstance);
    }
  };
  /* E: Core Class - Page */

  /* B: Core Class - Node */
  Node = function(html) {
    this.child = [];
    this.kazItem = [];
    if (html) {
      this.load();
    }
  };
  Node.prototype = {
    load: function(html) {
      this.child = [];
      this.kazItem = [];
      this.add(html);
    },
    add: function(html, notKaz) {
      if (swak.is.str(html)) {
        var container = document.createElement('div'), i, len, item;
        container.innerHTML = html || '';
        for ( i = 0, len = container.childNodes.length; i < len; i++) {
          item = container.childNodes[i];
          if (item.nodeType === 1) {
            this.child.push(item);
            if (notKaz !== true) {
              this.kazItem.push(item);
            }
          }
        }
      } else if (swak.is.dom(html)) {
        this.child.push(html);
        if (notKaz !== true) {
          this.kazItem.push(html);
        }
      }
    },
    content: function() {
      return this.child;
    },
    isEmpty: function() {
      return (!this.child || this.child.length === 0);
    },
    find: function(selector) {
      if (!selector) { return undefined; }
      var result, i, len;
      for (i = 0, len = this.child.length; i < len; i++ ) {
        result = this.child[i].querySelector(selector);
        if (result) { break; }
      }
      return result;
    },
    findAll: function(selector) {
      if (!selector) { return []; }
      var result = [], i, len;
      for (i = 0, len = this.child.length; i < len; i++ ) {
        result = result.concat(this.child[i].querySelectorAll(selector));
      }
      return result;
    },
    update: function(data) {
      kaz.dom.chew(this.kazItem, data);
    }
  };
  /* E: Core Class - Node */

  /* B: Core Class - AppItem */
  AppItem = function(type, key, source, options) {
    var self = this, setting = swak.oo.mixin({}, options),
        node, template;

    node = new Node();
    template = new Template(key, source);

    this.type = type;


    if (type === 'container') {
      this.container = document.createElement('div');
      template.tokens.forEach(function(name) {
        if (name.charAt(0) !== '#') {
          node.add(template.elements[name]);
        } else if (name === '#page') {
          node.add(self.container, true); // assign true to pass Kaz engine
        }
      });

      this.update = function(page) {
        var data = page.data();
        node.update(data);
        swak.node.append(this.container, page.render(), true);
      };
    } else if (type ==='mask') {
      node.load(template.html());
      this.update = function(method, className) {
        if (!className) { return; }
        var classMethod = (method === 'show') ? 'add' : 'remove', container;
        function updateClass(obj) { if (swak.is.dom(obj)) { swak.dom.clas[classMethod](obj, className); } }
        if (setting.containerId) {
          container = document.getElementById(setting.containerId);
          updateClass(container);
        }
        node.content().forEach(updateClass);

        if (method === 'show') {
          setTimeout(function() { self.update('hide', className); }, 4000);
        }
      };
    } else {
      node.load(template.html());
      this.update = node.update;
    }

    this.appendTo = function(target) {
      swak.node.append(target, node.content());
    };

    if (setting.containerId) {
      this.appendTo(setting.containerId);
    }

    if (swak.is.fn(setting.render)) {
      setting.render(node.content());
    }
  };
  /* E: Core Class - AppItem */

  /* B: Main Class: Zak */
  ZakHelper = function(zak, options) {
    var each = Array.prototype.forEach,
        keys = options.dataKey || config.dataKey;

    function bindPageBtn(ele) {
      var mer = Material,
          btns = ele.querySelectorAll('[' + keys.btnSwitch + ']'),
          refreshBtns = ele.querySelectorAll('[' + keys.btnRefresh + ']'),
          backBtns = ele.querySelectorAll('[' + keys.btnBack + ']');

      each.call(btns, function(btn) {
        var page = btn.getAttribute(keys.btnSwitch);
        if (!page || swak.dom.data.take(btn, 'btnEvtBinded')) { return;}
        swak.evt.touch(btn, function() {
          zak.switchTo(page, {
            filter: mer.Filter.create(btn.getAttribute(keys.mtrFilter)),
            parameter: mer.Parameter.create(btn.getAttribute(keys.mtrParameter))
          });
        });
        swak.dom.data.put(btn, 'btnEvtBinded', true);
      });
      each.call(refreshBtns, function(btn) {
        if (swak.dom.data.take(btn, 'btnBinded')) { return;}
        swak.evt.touch(btn, function() { zak.refreshTo(); });
        swak.dom.data.put(btn, 'btnEvtBinded', true);
      });
      each.call(backBtns, function(btn) {
        if (swak.dom.data.take(btn, 'btnBinded')) { return;}
        swak.evt.touch(btn, function() { zak.backTo(); });
        swak.dom.data.put(btn, 'btnEvtBinded', true);
      });
    }

    function bindExternalLink(ele) {
      if (!flag.phonegap) { return; }
      var links = ele.querySelectorAll('[target=_blank'), url,
          reg = /^https?:\/\//;
      each.call(links, function(link) {
        if (swak.dom.data.put(link, 'extLinkBinded')) { return;}
        url = link.getAttribute('href');
        if (reg.test(url)) {
          swak.evt.click(link, function() { window.open(url, '_system'); });
        }
        swak.dom.data.put(link, 'extLinkBinded', true);
      });
    }


    return {
      pageSwitched: function(zak) {

        var title = zak.pageCurrent.title();
        if (document.title) {
          document.title = zak.setting.appName + ( title ? ' - ' : '' ) + title;
        }

        if (location.hash !== undefined) {
          location.hash = zak.pageCurrent.key;
        }

        if (swak.is.fn(window.scrollTo)) {
          window.scrollTo(0, 1);
        }
      },
      clipApp: function() {
        var body = document.body, f;
        if (flag.phonegap && !swak.dom.data.take(body, 'fixHover')) {
          swak.evt.bind(body, 'touchstart', function() {});
          swak.dom.data.take(body, 'fixHover', true);
        }
        for ( f in flag) {
          if (flag.hasOwnProperty(f) && flag[f] === true) {
            swak.dom.clas.add(body, f);
          }
        }
      },
      clipElement: function(items) {
        var els = swak.to.arr(items), len = els.length;
        while (len--) {
          bindPageBtn(els[len]);
          if (flag.phonegap) {
            bindExternalLink(els[len]);

          }
        }
      }
    };
  };
  /* E: Main Class: ZakHelper */

  /* B: Main Class: Zak */
  Zak = function(containerId, options) {

    Zak.instances.push(this);

    var self = this, setting = swak.oo.mixin({ containerId: containerId}, config, options),
        source = new Source(setting),
        helper = new ZakHelper(this, setting),
        appItemOpt = { containerId: setting.containerId, render: helper.clipElement };

    this.id = options.id || ('Zak_' + new Date().valueOf());
    this.setting = setting;
    this.helper = helper;
    this.source = source;
    this.cache = {};


    this.container = new AppItem('container', setting.structure, source, appItemOpt);

    if (setting.mask) {
      this.mask = new AppItem('mask', setting.mask.element, source, appItemOpt);
    }

    this.pages = {};
    this.pageOpts = swak.to.obj(setting.pages, 'key');
    this.pageHistoury = [];
    this.pageCurrent = undefined;
    this.pageLast = undefined;

    this.sync = self.source.sync;

    this.helper.clipApp();

    if (setting.indexPage) {
      self.switchTo(setting.indexPage);
    }

  };

  Zak.prototype = {
    getPageOpt: function(pageName, pageOpt) {
      if (pageOpt) {
        this.pageOpts[pageName] = swak.oo.mixin(this.pageOpts[pageName], pageOpt);
      }

      var opt = this.pageOpts[pageName], helper = this.helper;
      opt.appScript = {
        render: function(page) { helper.clipElement(page.content()); }
      };

      return opt;
    },
    loadPage: function(pageName) {
      this.pages[pageName] =
        new Page(pageName, this.source, this.getPageOpt(pageName));
      this.pages[pageName].load();
      return this.pages[pageName];
    },
    getPage: function(pageName) {
      return this.pages[pageName] || this.loadPage(pageName);
    },
    switchTo: function(pageItem, data, reload) {
      var self = this;
      function goToPage() {
        var pageName = swak.is.str(pageItem) ? pageItem : pageItem.key,
            page = self.getPage(pageName),
            refreshPage = false;

        if (!page) { return false; }

        if (reload) {
          page.reload(true);
        }

        refreshPage = reload || ( self.pageCurrent === page );

        if (!refreshPage) {
          self.pageLast = self.pageCurrent;
          self.pageCurrent = page;
        }

        if (data) {
          page.filter(data.isFilter ? data : data.filter);
          page.parameter(data.isParameter ? data : data.parameter);
        }

        self.container.update(page);

        self.pageCurrent.show();
        if (!refreshPage) {
          if (self.pageLast && self.pageLast !== self.pageCurrent) {
            self.pageLast.hide();
          }
          self.pageHistoury.push(self.pageCurrent.key);
        }

        self.helper.pageSwitched(self);
      }
      if (this.mask && this.setting.mask.className ) {
        this.mask.update('show', this.setting.mask.className);
        setTimeout(function() {
          goToPage();
          self.mask.update('hide', self.setting.mask.className);
        }, 50);
      } else {
        goToPage();
      }
    },
    backTo: function() {
      if (this.pageLast) {
        this.switchTo(this.pageLast, undefined, false);
      }
    },
    refreshTo: function() {
      if (this.pageCurrent) {
        this.switchTo(this.pageCurrent, undefined, true);
      }
    },
    registerScript: function(pageName, scriptInstance) {
      var page = this.getPage(pageName);
      if (page)  {
        page.registerScript(scriptInstance);
      }
    }
  };

  // shared methods.
  Zak.flag = flag;
  Zak.instances = [];
  Zak.createFilter = function() {
    return Material.Filter.create.apply(undefined, arguments);
  };
  Zak.createParameter = function() {
    return Material.Parameter.create.apply(undefined, arguments);
  };
  Zak.registerScript = function(par1, par2, par3) {
    var zak, pageName, script;
    if (arguments.length === 2) {
      zak = Zak.instances[0];
      pageName = par1;
      script = par2;
    } else if (arguments === 3) {
      Zak.instances.forEach(function(item) {
        if (item.id === par1 || item === par1) { zak = item; }
      });
      pageName = par2;
      script = par3;
    }
    if (zak) {
      zak.registerScript(pageName, script);
    }
  };

  Zak.sync = function(par1, par2, par3, par4) {
    var zak, sourceName, sourceKey, sourceOpts;
    if (arguments.length === 2 || swak.is.obj(par3) || swak.is.bool(par3)) {
      zak = Zak.instances[0];
      sourceName = par1;
      sourceKey = par2;
      sourceOpts = par3;
    } else if (arguments === 3 || swak.is.obj(par4) || swak.is.bool(par4)) {
      Zak.instances.forEach(function(item) {
        if (item.id === par1 || item === par1) { zak = item; }
      });
      sourceName = par2;
      sourceKey = par3;
      sourceOpts = par4;
    }
    return zak ? zak.source.sync(sourceName, sourceKey, sourceOpts) : '';
  };
  /* E: Main Class: Zak */

  exports.Zak = Zak;


}(window));
