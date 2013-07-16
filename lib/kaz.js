(function(window) {
  "use strict";
  var exports = window, document = window.document, swak = window.swak,
      Kaz;

  Kaz = function(options) {
    options = options || {};
    var dataKey, regex, core;
    dataKey =  swak.oo.mixin({
      update: "data-zak-txt",
      show: "data-zak-show",
      clas: "data-zak-class"
    }, options.dataKey);

    regex = {
      normal: /\$\{([#\w\.\?\= ]+)\}/,
      keys:   /\$\{([#\w\.\?\= ]+)\}/g,
      condition: /#if +([\w\.]+) *= *(\w+) *\? *(\w+) *:? *(\w*)/,
      pure: /^[\w,]+$/
    };

    core = {};
    core.pattern = {
      check: function(selector) {
        return regex.normal.test(selector);
      }
    };

    core.source = {
      unwrap: function(key) { // wrap ${xxx} box, return real selector
        var mat = regex.normal.exec(key || "");
        return mat ? mat[1] : "";
      },

      // pure value
      pure: function(selector, data) {
        var paths = core.source.path(selector);
        return core.source.extract(paths, data);
      },
      path: function(selector) { // parse the selector to path array.
        return swak.to.split(selector, ".");
      },
      extract: function(paths, data) { // extract the actual data with path array
        if (swak.is.empty(paths) || !data) { return undefined; }
        var val = data[paths.shift()];
        return (paths.length) ? this.extract(paths, val) : val;
      },
      // condition value
      condition: function(selector, data) {
        var mats = regex.condition.exec(selector), target, compareWith, result, pass, fail;
        target = mats[1];
        compareWith = mats[2];
        result = core.source.value(target, data).toString() === compareWith;
        pass = result ? mats[3] : mats[4];
        fail = result ? mats[4] : mats[3];
        return {
          condition: true,
          result: result,
          pass: pass,
          fail: fail
        };
      },
      value: function(key, data) { // get the data
        if (!swak.is.str(key)) { return ""; }
        var selector = core.pattern.check(key) ? core.source.unwrap(key) : key,
            result = "";

        if (selector[0] === "#") {
          if (regex.condition.test(selector)) {
            result = core.source.condition(selector, data);
          }
        } else {
          result = core.source.pure(selector, data);
        }
        return result;
      }
    };


    core.dom = {
      prop: {
        text: (function() {
          return ("innerText" in document.createElement("div")) ? "innerText" : "textContent";
        }()),
        html: "innerHTML"
      },
      take: {
        keyCache: function(dom) {
          if (!dom.keyCache) { dom.keyCache = { attr: {} }; }
          return dom.keyCache;
        },
        selector: function(dom, type, key) {
          var path = "", keyCache = core.dom.take.keyCache(dom);
          if (type === "text") {
            path = keyCache.text || dom[core.dom.prop.text];
            keyCache.text = path;
          } else if (type === "attr" && swak.is.str(key)) {
            path = keyCache.attr[key] || dom.getAttribute(key);
            keyCache.attr[key] = path;
          }
          return path;
        },
        datakey: function(dom, key) {
          return swak.dom.data.take(dom, key);
        }
      },
      update: {
        text: function(dom, data) {
          var selector = core.dom.take.selector(dom, "text"),
              val = core.source.value(selector, data);
          dom[core.dom.prop.text] = val;
        },
        attr: function(dom, key, data) {
          var selector = core.dom.take.selector(dom, "attr", key),
              val = core.source.value(selector, data);
          dom.setAttribute(key, val);
        }
      },
      trigger: function(doms, method, data) {
        if (swak.is.empty(doms) || !core.dom.method[method]) { return; }
        doms = swak.to.arr(doms);
        var len = doms.length, key;
        while (len--) {
          key = core.dom.take.datakey(doms[len], dataKey[method]);
          core.dom.method[method](doms[len], key, data);
        }
      },
      method: {
        update: function(dom, selector, data) {
          var keys = swak.to.split(selector, ","),
              len = keys.length, key;
          while (len--) {
            key = keys[len];
            if (key.charAt(0) === "@") {
              core.dom.update.attr(dom, key.substr(1), data);
            } else if (key === "text") {
              core.dom.update.text(dom, data);
            }
          }
        },
        show: function(dom, selector, data) {
          var val = core.source.value(selector, data),
              keyCache = core.dom.take.keyCache(dom);
          if (val) {
            dom.style.display = keyCache.display || "block";
          } else if (dom.style.display !== "none") {
            keyCache.display = dom.style.display;
            dom.style.display = "none";
          }
        },
        clas: function(dom, selector, data) {
          var val = core.source.value(selector, data);
          if (!val) { return; }
          if (val.condition) {
            if (val.pass) { swak.dom.clas.add(dom, val.pass); }
            if (val.fail) { swak.dom.clas.remove(dom, val.fail); }
          } else {
            if (val) { swak.dom.clas.add(dom, val); }
          }
        }

      }
    };

    // use to extend the html template text.
    this.tmpl = {
      collect: function(tmpl) {
        if (!swak.is.str(tmpl)) { return []; }
        var items = [], reg = regex.keys, mat;
        reg.lastIndex = 0;
        while( (mat = reg.exec(tmpl)) !== null ) {
          items.push(mat[1]);
        }
        return items;
      },
      extend: function(tmpl, items) {
        if (!swak.is.str(tmpl)) { return ""; }
        if (swak.is.empty(items)) { return tmpl; }
        return tmpl.replace(regex.keys, function(mat, key) {
          return items[key] || mat;
        });
      }
    };

    // use to generate actual html code with data.
    this.html = {
      chew: function(tmpl, data) {
       if (!window.Handlebars || swak.is.empty(tmpl)) { return tmpl; }
       var engine = window.Handlebars.compile(tmpl);
       return engine ? engine(data || {}) : tmpl;
      }
    };

    // use to handle the dom update with data
    this.dom = {
      chew: function(doms, data) {
        doms = swak.to.arr(doms);
        var method, len = doms.length;
        while ( len-- ) {
          for ( method in dataKey) {
            if (dataKey.hasOwnProperty(method)) {
              core.dom.trigger(doms[len].querySelectorAll("[" + dataKey[method] + "]"), method, data);
            }
          }
        }
      }
    };

    this.data = {
      chew: function(selector, data) {
        return core.source.value(selector, data);
      }
    };
    this.isPattern = core.pattern.check;
  };
  exports.Kaz = Kaz;
}(window));
