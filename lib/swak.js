(function(window) {
  'use strict';

  if (!String.prototype.trim) {
    String.prototype.trim = function(){ return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g,''); };
  }

  if ( !Array.prototype.forEach ) {
    Array.prototype.forEach = function(fn, scope) {
      var i , len;
      for(i = 0, len = this.length; i < len; ++i) {
        fn.call(scope, this[i], i, this);
      }
    };
  }

  if (typeof Array.isArray !== 'function') {
    Array.isArray = function( array ) {
      return Object.prototype.toString.call( array ) === '[object Array]';
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex ) {
      if (this === null) { throw new TypeError(); }
      var len = this.length, n = 0, k;
      if (len === 0) { return -1; }
      if (fromIndex) {
        n = Number(fromIndex);
        if (isNaN(n)) {
          n = 0;
        } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) { return -1; }
      k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (k; k < len; k++) {
        if (this[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          FNOP = function () {},
          fBound = function () {
            return fToBind.apply(this instanceof FNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
          };
      FNOP.prototype = this.prototype;
      fBound.prototype = new FNOP();
      return fBound;
    };
  }

}(window));



(function(window) {
  'use strict';

  var
      exports = window,
      document = window.document,
      location = window.location,
      console = window.console,
      swak;

  swak = {
    is: {
      fn: function(obj) { return (typeof obj === 'function'); },
      arr: function(obj) { return Array.isArray( obj ); },
      bool: function(obj) { return (typeof obj === 'boolean' || (obj && obj.constructor === Boolean )); },
      str: function(obj) { return (typeof obj === 'string' || (obj && obj.constructor === String)); },
      num: function(obj) { return (typeof obj === 'number' || (obj && obj.constructor === Number)); },
      obj: function(obj) { return (typeof obj === 'object'); },
      dom: function(obj) { return (obj && obj.nodeType && obj.nodeType === 1); },
      nodeList: function(obj) {
        return (/^\[object (HTMLCollection|NodeList|Object)\]$/).test(Object.prototype.toString.call(obj)) && (obj.length === 0 || (typeof obj[0] === 'object' && obj[0].nodeType > 0));
      },
      empty: function(obj) {
        return obj === undefined || obj === null || ( ( swak.is.arr(obj) || swak.is.str(obj) || swak.is.nodeList(obj) ) && obj.length === 0 );
      }

    },
    to: {
      arr: function(obj) {
        var arr;
        if (swak.is.empty(obj)) {
          arr = [];
        } else if (swak.is.arr(obj) || swak.is.nodeList(obj)) {
          arr = obj;
        } else {
          arr = [ obj ];
        }
        return arr;
      },
      obj: function(arr, key, prop) {
        if (!key || !swak.is.arr(arr) || !arr.length) { return {}; }
        var obj = {}, i, j, len, props, data;
        if (swak.is.empty(prop) || swak.is.str(prop)) {
          props = prop ? prop.match(/\S+/g) : [];
          for ( i = 0, len = arr.length; i < len; i++ ) {
            if (props.length === 0 ) {
              data = arr[i];
            } else if (props.length === 1) {
              data = arr[i][props[0]];
            } else {
              j = props.length;
              while ( j-- ) {
                data[props[j]] = arr[i][props[j]];
              }
            }
            if (arr[i][key]) {
              obj[arr[i][key]] = data;
            } else if (key === 'self') {
              obj[arr[i]] = data;
            }
          }
        } else if (swak.is.fn(prop)) {
          for ( i = 0, len = arr.length; i < len; i++ ) {
            if (key === 'self') {
              obj[arr[i]] = prop.call(arr[i], arr[i]);
            } else {
              if (arr[i][key]) {
                obj[arr[i][key]] = prop.call(arr[i], arr[i][key]);
              }
            }

          }
        }

        return obj;
      },
      objByKey: function(key, target, prop) {
        var len, obj;
        if (swak.is.obj(key)) {
          // if key is an object, then return directly;
          obj = key;
        } else if (swak.is.arr(target) && prop) {
          // if target is an array, then iterate all item and find the corresponding object
          len = target.legnth;
          while (len--) {
            if (target[len][prop] === key) {
              obj = target[len][prop];
              break;
            }
          }
        } else if (swak.is.obj(target)) {
          // if target is an object, then return the corresponding property
          obj = target[key] || undefined;
        }
        return obj;
      },
      opt: function(str) {
        return ( swak.is.str(str) && str ) ?
          str.match(/\S+/g) || [] :
          swak.to.arr(str);
      },
      split: function(str, key) {
        if (swak.is.empty(str)) { return []; }
        var arr = str.split(key), len = arr.length;
        while (len--) {
          arr[len] = arr[len].trim();
        }
        return arr;
      }
    },
    oo: {
      inherit: (function() {
        var Fake = function () {};
        return function(Child, Parent) {
          Fake.property = Parent.prototype;
          Child.property = new Fake();
          Child.uber = Parent.prototype;
          Child.prototype.constructor = Child;
        };
      }()),
      mixin: function(target) {
        var i, len, j, len2, keys, supplier, property, receiver, descriptor;
        receiver = target || {};
        if (arguments.legnth <= 1 ) { return receiver; }
        for ( i = 1, len = arguments.length; i < len; i++) {
          supplier = arguments[i];
          if (supplier) {
            if (Object.keys) {
              keys = Object.keys(supplier);
              for ( j = 0, len2 = keys.length; j < len2; j++ ) {
                property = keys[j];
                if (swak.is.obj(supplier[property])) {
                  if (swak.is.empty(receiver[property]) || !swak.is.obj(receiver[property])) {
                    receiver[property] = swak.is.arr(supplier[property]) ? [] : {};
                  }
                  swak.oo.mixin(receiver[property], supplier[property]);
                } else {
                  descriptor = Object.getOwnPropertyDescriptor(supplier, property);
                  if (swak.is.obj(descriptor)) {
                    Object.defineProperty(receiver, property, descriptor);
                  } else {
                    receiver[property] = descriptor;
                  }

                }
              }

            } else {
              for (property in supplier) {
                if (supplier.hasOwnProperty(property)) {
                  if (swak.is.obj(supplier[property])) {
                    if (swak.is.empty(receiver[property]) || !swak.is.obj(receiver[property])) {
                      receiver[property] = swak.is.arr(supplier[property]) ? [] : {};
                    }
                    swak.oo.mixin(receiver[property], supplier[property]);
                  } else {
                    receiver[property] = supplier[property];
                  }
                }
              }
            }
          }
        }
        return receiver;
      }
    },
    evt: {
      bind: function(obj, type, fn) {
        if (!swak.is.dom(obj) || !type || !swak.is.fn(fn)  ) { return false; }
        if (obj.addEventListener) {
          obj.addEventListener(type, fn, false);
        } else if (obj.attachEvent) {
          obj.attachEvent('on' + type, function(e) {
            var self = this;
            e = e || window.event;
            e.preventDefault  = e.preventDefault  || function(){ e.returnValue = false; };
            e.stopPropagation = e.stopPropagation || function(){ e.cancelBubble = true; };
            fn.call(self, e);
          });
        }
      },
      touch: function(dom, fn) {
        if (!swak.is.dom(dom) || !swak.is.fn(fn)) { return false; }
        (function(dom, fn) {
          var startX, startY, startTime, eventFired, clickFn;
          clickFn = function(e) {
            fn.call(dom, e);
            e.preventDefault();
            e.stopPropagation();
            return false;
          };

          swak.evt.bind(dom, 'touchstart', function(e) {
            if (e.touches.length > 0 ) {
              startX = e.touches[0].pageX;
              startY = e.touches[0].pageY;
              startTime = e.timeStamp;
            }
            eventFired = false;
          });

          swak.evt.bind(dom, 'touchend', function(e) {
            if (e.changedTouches.length > 0　) {
              if ( Math.abs(e.changedTouches[0].pageX - startX) < 10 &&
                   Math.abs(e.changedTouches[0].pageY - startY) < 10 &&
                   e.timeStamp - startTime < 250 && !eventFired) {
                clickFn(e);
                eventFired = true;
              }
            }
          });

          swak.evt.bind(dom, 'click', function(e) {
            if (!eventFired) {
              clickFn(e);
              eventFired = false;
            }
          });
        }(dom, fn));
      }
    },

    node: {
      parse: function(html, container) {
        var childNodes = [], i, len;
        if (!container) { container = document.createElement('div'); }
        if (html) { container.innerHTML = html; }
        for ( i = 0, len = container.childNodes.length; i < len; i++ ) {
          if (container.childNodes[i].nodeType === 1) {
            childNodes.push(container.childNodes[i]);
          }
        }
        return childNodes;
      },

      append: function(target, nodes, reset) {
        var i, len;
        if (swak.is.str(target)) { target = document.getElementById(target); }
        if (!swak.is.dom(target)) { return; }
        nodes = swak.to.arr(nodes);
        if (reset) {
          while (target.firstChild) {
            target.removeChild(target.firstChild);
          }
        }
        for (i = 0, len = nodes.length; i < len; i++ ) {
          if (nodes[i]) {
            target.appendChild(nodes[i]);
          }
        }
      },
      after: function(target, nodes) {
        var i, len;
        if (!target) { return; }
        nodes = swak.to.arr(nodes);
        for (i = 0, len = nodes.length; i < len; i++ ) {
          if (nodes[i]) {
            target.parentNode.insertBefore(nodes[i], target.nextSibling);
          }
        }
      }
    },
    storage: (function() {
      var uid, available, cache, storage, json = window.JSON;
      try {
        uid = String(new Date().valueOf());
        storage = window.localStorage;
        storage.setItem(uid, uid);
        if (storage.getItem(uid) === uid) {
          storage.removeItem(uid);
          available = true;
        } else {
          available = false;
        }
      } catch(e) {
        available = false;
      }

      if (available && json) {
        cache = function(key) {
          var self = this, sync, data;
          sync = function() { cache.setItem(key, data); };
          data = cache.getItem(key) || {};

          self.available = true;
          self.exists = function(o) {
            return !!self.take(o);
          };
          self.take = function(o) {
            return data[o.toString()];
          };
          self.put = function(o) {
            data[o.toString()] = o.valueOf();
            sync();
          };
          self.remove = function(o) {
            delete data[o.toString()];
            sync();
          };
          self.clear = function() {
            data = {};
            sync();
          };
        };
        cache.available = true;
        cache.setItem = function(key, data) { storage.setItem(key, json.stringify(data)); };
        cache.getItem = function(key) { return json.parse(storage.getItem(key) || '{}'); };
        cache.clear = function() {
          storage.clear();
        };
      } else {
        cache = function() {
          this.available = false;
          this.clear = function() {};
        };
        cache.available = false;
        cache.clear = function() {};
      }
      return cache;
    }()),
    dom: {
      clas: (function() {
        var support = document.createElement('div').classList !== undefined;
        function update(method, alter) {
          return support ?
            function(dom, className) {
              if (!className) { return; }
              dom.classList[method](className);
            } :
            function(dom, className) {
              if (!className) { return; }
              var classArr = dom.className.split(/\s+/),
                  index = classArr.indexOf(className);
              alter(classArr, index, className);
              dom.classname = classArr.join(' ');
            };
        }
        return {
          add: update('add', function(classArr, index, className) {
            if (index === -1) { classArr.push(className); }
          }),
          remove: update('remove', function(classArr, index, className) {
            if (index > -1) { classArr.splice(index, 1); }
          }),
          toggle: update('toggle', function(classArr, index, className) {
            if (index > -1) { classArr.splice(index, 1); }
            else { classArr.push(className);}
          }),
          contains: function(dom, className) {
            return support ? dom.classList.contains(className) : dom.className.lastIndexOf(className) > -1;
          }
        };

      }()),
      data: (function() {
        var support = document.createElement('div').dataset !== undefined;
        function transKey(keyStr) {
          var propKey, dataKey;
          if (!keyStr) { keyStr = ''; }
          dataKey = keyStr.replace(/^data-/, '').replace(/-(\w)?/g, function(mat, key) {
              return key ? key.toUpperCase() : '';
            });
          propKey = keyStr.replace(/([a-z][A-Z])/g, function(mat, key) {
            return key.charAt(0) + '-' + key.charAt(1).toLowerCase();
          });
          if (!/^data-/.test(propKey)) {
            propKey = 'data-' + propKey;
          }
          return {
            propKey: propKey,
            dataKey: dataKey
          };
        }
        return {
          take: function(dom, keyStr) {
            var key = transKey(keyStr);
            return dom.getAttribute(key.propKey);
          },
          put: function(dom, keyStr, value) {
            var key = transKey(keyStr);
            return dom.setAttribute(key.propKey, value);
          },
          dataSet: function(dom) {
            return support ? dom.dataSet : {};
          }
        };
      }())
    },
    ajax: function(url, opt) {
      var val;
      $.support.cors = true;
      $.ajax({ async: false, url: url, dataType: opt.dataType })
        .done(function(data) {
          val = data;
        })
        .fail(function() {
          swak.log(url, 'AJAX Error');
        });

      return val;
    },
    par: {
      qtr: function( name ) {
        var regex, result;
        regex = new RegExp( '[\\?&]' + name + '=([^&#]*)' );
        result = regex.exec( location.href );
        return result ? result[1] : '' ;
      }
    },
    /*
    ajax: {
      script: function(url, callback) {
        if (!url) { return; }
        var h, s = document.createElement('script');
        s.type = 'text/javascript';
        if (swak.is.fn(callback)) {
          if (s.readyState) {
            s.onreadystatechange = function() {
              if (s.readyState === 'loaded' || s.readyState === 'complete') {
                s.onreadystatechange = null;
                callback();
              }
            };
          } else {
            s.onload = function(){ callback(); };
          }
        }
        s.src = url;
        h = document.getElementsByTagName('head')[0];
        if (h) {
          h.appendChild(s);
        } else {
          h = document.getElementsByTagName('script')[0];
          h.parentNode.insertBefore(s, h);
        }
      }
    },
    */
    log: function(msg, cat) {
      if (!swak.is.empty(console.log)) {
        console.log( ( !swak.is.empty(cat) ? '[' + cat + '] ' : '' ) + msg);
      }
    },
    err: function(msg, cat) {
      var result = ( !swak.is.empty(cat) ? '[' + cat + ']' : '' ) + msg;
      throw result;
    },
    timer: function() {
      var obj = {
        startTime: undefined,
        during: 0,
        start: function() { this.startTime = new Date(); },
        done: function(msg, cat) {
          this.endTime = new Date();
          this.during = this.endTime.valueOf() - this.startTime.valueOf();
          if (msg) {
            swak.log(msg.replace(/\{0\}/g, this.during), 'Timer - ' + cat);
          }
          return this.during;
        }
      };
      obj.start();
      return obj;
    }
  };

  exports.swak = swak;
}(window));

var ajax = function(url, options, methods) {
  'use strict';
  var link, opt, fns, xdm, xhr, data, xdr, value;

  link = url.replace( /#[\w\W]*$/, '').replace(/^\/\//, window.location.protocol + '//');
  opt = options || {};
  fns = methods || {};
  xdm = (link.lastIndexOf( window.location.protocol + '//' + window.location.host) === -1);
  xhr = (function() {
    var xhrObj, XHR = window.XMLHttpRequest, XDR = window.XDomainRequest, AXO = window.ActiveXObject;
    if (XHR) {
      xhrObj = new XHR();
    } else if (XDR) {
      xdr = true;
      xhrObj = new XDR();
    } else if (AXO) {
      try { xhrObj = new AXO('Microsoft.XMLHTTP'); }
      catch(ignore) {  }
    }
    return xhrObj;
  }());

  data = (function(data) {
    var key, result = [];
    for ( key in data) {
      if (data.hasOwnProperty(key) && data[key]) {
        switch(typeof (data[key])) {
        case 'number':
        case 'string':
        case 'boolean':
          result.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
          break;
        }
      }
    }
    return result.join('&').replace(/%20/g, '+');
  }(opt.data || {}));

  if (opt.type !== 'POST') { opt.type = 'GET'; }

  if ( ( xdm || opt.dataToURL) && data) {
    link += ((/\?/).test(url) ? '&' : '?') + data;
  }

  if ( opt.cache !== true) {
    link += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime();
  }

  if (!xdr) {
    xhr.setRequestHeader('Accept', '*/*');
    if (opt.type === 'POST') {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
  }

  xhr.open(opt.type, link, false);
  xhr.send(data);

  if (xdr) {
    xhr.ontimeout = xhr.onerror = function() { value = false; };
    xhr.onload = function() { value = xhr.responseText; };
  } else {
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        value = xhr.responseText;
      } else {
        value = false;
      }
    };
    xhr.onreadystatechange(); // always sync, so directly call ready function
  }

  return value;
};
