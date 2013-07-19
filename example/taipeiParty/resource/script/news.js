Zak.registerScript("news", {
  source: function(page, data) {
    if (data && data.poi_news && data.poi_news.length && data.poi && data.poi.length ) {
      var pois = swak.to.obj(data.poi, "sn");
      data.poi_news.forEach(function(obj) {
        obj.poi = (obj.p_sn && pois[obj.p_sn]) ? pois[obj.p_sn] : null;
      });
    }
  }
});
//# sourceURL=\source\script\news.js
