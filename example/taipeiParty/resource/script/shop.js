Zak.registerScript("shop", {
  source: function(page, data) {
    if (data && data.poi && data.poi.length) {
      var today = new Date().getDay();
      data.poi.forEach(function(obj) {
        obj.businessDay = ((obj.opening || '').lastIndexOf(today) >= 0);
      });
      data.poi.sort(function(a, b) {
        return b.businessDay - a.businessDay;
      });
    }
  }
});

//# sourceURL=\source\script\shop.js
