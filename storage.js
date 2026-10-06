(function () {
  "use strict";
  var DBN = "wattar-ls-backup", ST = "kv", KEY = "snapshot", RF = "wattar-restored";
  var timer = 0;

  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function put(v) {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction(ST, "readwrite");
        tx.objectStore(ST).put(v, KEY);
        tx.oncomplete = function () { d.close(); res(); };
        tx.onerror = tx.onabort = function () { rej(tx.error); };
      });
    });
  }
  function get() {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var q = d.transaction(ST, "readonly").objectStore(ST).get(KEY);
        q.onsuccess = function () { d.close(); res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function snap() {
    var o = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); } } catch (e) {}
    return o;
  }
  function backup() {
    clearTimeout(timer);
    timer = 0;
    var o = snap();
    if (!Object.keys(o).length) return;
    put({ t: Date.now(), d: o }).catch(function () {});
  }
  function later() { if (!timer) timer = setTimeout(backup, 800); }

  try {
    var P = Storage.prototype, s = P.setItem, r = P.removeItem, c = P.clear;
    P.setItem = function () { var x = s.apply(this, arguments); if (this === window.localStorage) later(); return x; };
    P.removeItem = function () { var x = r.apply(this, arguments); if (this === window.localStorage) later(); return x; };
    P.clear = function () { var x = c.apply(this, arguments); if (this === window.localStorage) later(); return x; };
  } catch (e) {}

  addEventListener("pagehide", backup);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") backup(); });

  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}

  var empty = true;
  try { empty = localStorage.length === 0; } catch (e) { return; }
  if (empty && window.indexedDB) {
    get().then(function (rec) {
      if (!rec || !rec.d || !Object.keys(rec.d).length) return;
      var done = false;
      try { done = sessionStorage.getItem(RF) === "1"; } catch (e) {}
      if (done) return;
      for (var k in rec.d) { try { localStorage.setItem(k, rec.d[k]); } catch (e) {} }
      try { sessionStorage.setItem(RF, "1"); } catch (e) {}
      location.reload();
    }).catch(function () {});
  } else {
    later();
  }
})();
