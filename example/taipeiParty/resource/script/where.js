Zak.registerScript("where", {
  extend: { },
  init: function() {
    // call by page init
  },
  load: function(page) {
    // call by page init or reload
    var kaz = new Kaz();
    var extend = this.extend;
    var map = null;
    var bounds = null;
    var infoBB = null;
    var sn = "";
    var polylineOptionsActual = null;
    var option = {
      canvasId: "mapCanvas",
      mapDescId: "mapDesc",
      icon: {
        me:    "style/images/marker_me.png",
        poi:   "style/images/marker_bar.png",
        focus: "style/images/marker_bar_active.png"
      },
      defaultLat: 25.041478,
      defaultLng: 121.55109800000002,
      template: Zak.sync("element", "where_info"),
      material: Zak.sync("material", "poi")
    };
    var methods = {
      setSn: function(sn_val) { sn = sn_val; },
      distHaversine: function(lat1, lng1, lat2, lng2) {
        var rad = function (x) { return x * Math.PI / 180; }
        var R = 6371; // earth's mean radius in km
        var dLat = rad( lat2 - lat1 );
        var dLong = rad( lng2 - lng1 );

        var a =  Math.sin(dLat / 2) * Math.sin(dLat / 2)
               + Math.cos(rad( lat1 )) * Math.cos(rad( lat2 ))
               * Math.sin(dLong / 2) * Math.sin(dLong / 2);
        var c =  Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 2;
        var d = R * c;
        return parseFloat( d.toFixed(2) );
      },

      bearingTo: function( lat1, lng1, lat2, lng2 ) {
        Number.prototype.toRad = function () { return this * Math.PI / 180; }
        Number.prototype.toDeg = function() { return this * 180 / Math.PI; }

        lat1 = lat1.toRad();
        lat2 = lat2.toRad();
        var dLon = (lng2-lng1).toRad();

        var y = Math.sin(dLon) * Math.cos(lat2);
        var x = Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        var brng = Math.atan2(y, x);

        return (brng.toDeg()+360) % 360;
      },
      initMap: function(pt, isCurrentP) {
        var mapObj = document.getElementById(option.canvasId);
        if ( ! mapObj ) return;
        map = new google.maps.Map( mapObj, {
          disableDefaultUI: true,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              stylers: [
                { hue: "auto" },
                { saturation: -20 }
              ]
            },{
              featureType: "road",
              elementType: "geometry",
              stylers: [
                { lightness: 100 },
                { visibility: "simplified" }
              ]
            },{
              featureType: "road",
              elementType: "labels",
              stylers: [
                { visibility: "off" }
              ]
            }
          ]
        });
        bounds = new google.maps.LatLngBounds();
        bounds.extend( pt );
        if ( isCurrentP ) {
          var markerMe = new google.maps.Marker({
            position: pt,
            icon: option.icon.me,
            map: map
          });
        }
        google.maps.event.addListener(
          map,
          "click",
          function() {
            if ( infoBB ) {
              infoBB.marker.setIcon( option.icon.poi );
              infoBB.close();
            }
          }
        );
      },
      travelTo: function(srcLat, srcLng, destLat, destLng) {
        //swak.log( "travelTo：" + srcLat +","+ srcLng +","+ destLat +","+ destLng );
        if ( polylineOptionsActual != null ) {
          polylineOptionsActual.setPath([]);
          polylineOptionsActual.setMap( null );
          polylineOptionsActual = null;
        }
        //
        var travel = {
          origin: new google.maps.LatLng( srcLat, srcLng ),
          destination: new google.maps.LatLng( destLat, destLng ),
          travelMode: google.maps.TravelMode.DRIVING
        };
        var directionsService = new google.maps.DirectionsService();
        directionsService.route(travel, function(result, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            polylineOptionsActual = new google.maps.Polyline({
              strokeColor: '#fc8415',
              strokeOpacity: 0.9,
              strokeWeight: 5
            });
            var rendererOptions = {
              map: map,
              suppressMarkers : true,
              polylineOptions: polylineOptionsActual
            }
            var directionsDisplay = new google.maps.DirectionsRenderer( rendererOptions );
            directionsDisplay.setDirections(result);
          }
          else {
            swak.log(status);
          }
        });
      },
      showPoi: function(myLat, myLng, isCurrentP) {
        if ( map == null ) return;

        var nearPoiName = "";
        var nearPoiDistance = -1.0;
        var nearLat = 0.0;
        var nearLng = 0.0;

        if (option.material) {
          var poi_data = option.material.slice(0);
          if ( sn == "" ) poi_data.sort( function( d1, d2 ){ return d1.lat < d2.lat ? -1 : (d1.lat == d2.lat ? 0 : 1 ) } );
          for( var i=0; i<poi_data.length; i++ ) {
            if ( sn != "" && poi_data[i].sn != sn ) continue;
            //
            var lat = parseFloat(poi_data[i].lat);
            var lng = parseFloat(poi_data[i].lng);
            //
            var dist_str = "";
            if ( isCurrentP ) {
              var dist = methods.distHaversine( lat, lng, myLat, myLng );
              if ( nearPoiDistance < 0.0 || dist < nearPoiDistance ) {
                nearPoiDistance = dist;
                nearPoiName = poi_data[i].p_name;
                nearLat = lat;
                nearLng = lng;
              }
              dist_str = "距離約: " +dist+ "公里";
            }
            var infoContent = methods.getInfoContent( poi_data[i], dist_str );
            while (
            sn == ""
            && i < (poi_data.length-1)
            && poi_data[i].lat == poi_data[i+1].lat
            && poi_data[i].lng == poi_data[i+1].lng ) {
              i ++;
              infoContent += methods.getInfoContent( poi_data[i], dist_str );
            }
            methods.drawPt( myLat, myLng, isCurrentP, lat, lng, infoContent );
          }
          if ( isCurrentP && sn == "" ) {
            var mes = "<span>最近店家為: " +'<em>' + nearPoiName +'</em>' + "<br/>";
            mes += "距離約:" +'<em>'+ nearPoiDistance +'</em>' + " 公里</span>";
            var bearing = methods.bearingTo(myLat, myLng, nearLat, nearLng);
            var threshold = 25.0;
            var bearingImg = "";
            if ( bearing <= (0.0+threshold) || bearing >= (360.0-threshold) ) bearingImg = "images/direction_n.png";
            if ( bearing <= (90.0-threshold) && bearing >= (0.0+threshold) ) bearingImg = "images/direction_en.png";
            if ( bearing <= (90.0+threshold) && bearing >= (90.0-threshold) ) bearingImg = "images/direction_e.png";
            if ( bearing <= (180.0-threshold) && bearing >= (90.0+threshold) ) bearingImg = "images/direction_es.png";
            if ( bearing <= (180.0+threshold) && bearing >= (180.0-threshold) ) bearingImg = "images/direction_s.png";
            if ( bearing <= (270.0-threshold) && bearing >= (180.0+threshold) ) bearingImg = "images/direction_ws.png";
            if ( bearing <= (270.0+threshold) && bearing >= (270.0-threshold) ) bearingImg = "images/direction_w.png";
            if ( bearing <= (360.0-threshold) && bearing >= (270.0+threshold) ) bearingImg = "images/direction_wn.png";
            mes += "<span style='margin-left: 10px;'>";
            mes += "<img border='0' width='25' height='25' src='" +bearingImg+ "' data='" +threshold+ "'/>";
            mes += "</span>";

            extend.mapDesc.innerHTML = mes;
            bounds.extend( new google.maps.LatLng( nearLat, nearLng ) );
          }
          else {
            extend.mapDesc.style.display = "none";
          }
          map.fitBounds(bounds);
          //
          if ( isCurrentP &&  sn != "" ) {
            methods.travelTo( myLat, myLng, nearLat, nearLng );
          }
        }
      },
      drawPt: function( myLat, myLng, isCurrentP, lat, lng, content ) {
        var self = this;
        var pt = new google.maps.LatLng( lat , lng );
        var marker1 = new google.maps.Marker({
          position: pt,
          icon: option.icon.poi,
          map: map
        });
        //bounds.extend( pt );
        google.maps.event.addListener(
          marker1, 'click',
          function() {
            self.openInfoWindow( marker1, content );
            if ( isCurrentP ) methods.travelTo( myLat, myLng, lat, lng );
          });
      },
      openInfoWindow: function( mk, str ) {
        if ( infoBB ) {
          infoBB.marker.setIcon( option.icon.poi );
          infoBB.close();
        }
        var infoOptions = {
          content: str,
          disableAutoPan: false,
          pixelOffset: new google.maps.Size(-140, 0),
          zIndex: null,
          boxStyle: { opacity: 0.85, width: "300px" },
          closeBoxURL: "",
          isHidden: false,
          pane: "floatPane",
          enableEventPropagation: false
        };
        infoBB = new InfoBox(infoOptions);
        infoBB.open( map, mk );
        mk.setIcon( option.icon.focus );
        infoBB.marker = mk;
      },
      getInfoContent: function ( poi_obj, dist_str ) {
        var template, data, html;
        template  = option.template;
        data = swak.oo.mixin( {
          dist: dist_str,
          link:"javascript:zak.switchTo('shopInfo', Zak.createFilter('poi', 'sn', '" +poi_obj.sn+ "'));"
        }, poi_obj);
        if (!data.img) { data.img = "images/default_bg.png"; }
        html = kaz.html.chew(template, data);

        return html;
      },
      callByCurrent: function(position) {
        swak.log("getCurrentP success");
        var myLat = parseFloat(position.coords.latitude),
        myLng = parseFloat(position.coords.longitude);
        methods.displayMap(myLat, myLng, true);
      },
      callByDefault: function(err) {
        console.log("getCurrentP fail");
        methods.displayMap(option.defaultLat, option.defaultLng, false);
      },
      callByTrigger: function(sn) {
        //methods.displayMap(myLat, myLng, false);
      },
      displayMap: function(myLat, myLng, isCurrentP) {
        methods.initMap( new google.maps.LatLng( myLat, myLng ), isCurrentP);
        methods.showPoi(myLat, myLng, isCurrentP);
      }
    };
    this.extend.option = option;
    this.extend.methods = methods;
  },
  render: function(page) {
    // call by page render html
    this.extend.mapDesc = page.find("#" + this.extend.option.mapDescId) || document.createElement("div");
    this.extend.canvas = page.find("#" + this.extend.option.canvasId) || document.createElement("div");
  },
  show: function(page, data) {
    // call by page show
    var methods = this.extend.methods, mapDesc = this.extend.mapDesc, canvas = this.extend.canvas;
    mapDesc.style.display = "block";
    //
    if ( google && google.maps )  {
      swak.log("Map API good");
      mapDesc.innerHTML = "讀取中 ...";
      canvas.style.width = (window.screen.availWidth) + "px";
      var heightOfHeader = document.querySelector('header').clientHeight;
      var heightOfFooter = document.querySelector('footer').clientHeight;
      canvas.style.height = (window.screen.availHeight - heightOfHeader - heightOfFooter) + "px";
    }
    else {
      swak.log("Map API FAIL");
      mapDesc.innerHTML = "地圖讀取失敗";
      return;
    }
    //
    if ( data.par && data.par.sn ) {
      this.extend.parameter = data.par; // add parameter into cross method object;
      methods.setSn( data.par.sn );
    } else {
      methods.setSn( "" );
    }
    if ( Zak.flag.phonegap ) {
      navigator.geolocation.getCurrentPosition( methods.callByCurrent, methods.callByDefault, { maximumAge: 10000, timeout: 10000, enableHighAccuracy: true } );
    } else {
      methods.callByDefault(null);
    }
  },
  hide: function() {
    // call by page hide
  },
  source: function(page, data) {
    // use to trans page data
  },
});
//# sourceURL=\source\script\where.js
