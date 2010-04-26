//Public function
var SimpleGeoMap = {};

(function ($){ // Create local scope.
  var map, mapWrapper, cluster,
  oldCenter = false, padding = 256, ajax, infoWindow, filterInputs, filters,
  filterCookie, enabledFilters = [], loader, mapState = 1, smallZoomControl,
  largeZoomControl, helpBox, maxZoom = 17, minZoom = 7,
  sources = {}, activeSource = null,
  loaderShow = function() {
    loader.show();
  };

  SimpleGeoMap.addSource = function(name, source) {
    sources[name] = source;
    if (!activeSource) {
      activeSource = name;
    }
  };

  SimpleGeoMap.setActiveSource = function(name) {
    if (activeSource != name) {
      activeSource = name;
      SimpleGeoMap.updateMarkers(true);
    }
  };

  SimpleGeoMap.setInfoWindow = function(win) {
    infoWindow = win;
  };

  SimpleGeoMap.getMap = function() {
    return map;
  };

  SimpleGeoMap.getMapElement = function() {
    return SimpleGeoMap.mapElement;
  };

  SimpleGeoMap.getMaxZoom = function() {
    return maxZoom;
  };

  function newMarker(type, markerLocation, clusterCount, clusterBounds, markerId, title, map) {
    var marker,
    getMarkerTheme = function (clusterCount, type) {
      var lastMatch = null, markers = Drupal.settings.simpleGeoMap.markerTheme.markers,
        i = 0, count = markers.length;
      for (i=0; i<count; i++) {
        if (markers[i].threshold > clusterCount) {
          break;
        }
        lastMatch = markers[i];
      };
      return lastMatch;
    },
    getClusterMarker = function (clusterCount, type) {
      var icon = new GIcon(),
        iconInfo = getMarkerTheme(clusterCount, type);
      icon.image = iconInfo.marker;
      icon.iconSize = new GSize(iconInfo.size[0], iconInfo.size[1]);
      icon.iconAnchor = new GPoint(iconInfo.anchor[0], iconInfo.anchor[1]);

      var opts = {
        "icon": icon,
        "clickable": true,
        "labelText": (iconInfo.labelShow == 0) ? '' : clusterCount.toString(),
        "labelOffset": new GSize(iconInfo.labelOffset[0], iconInfo.labelOffset[1]),
        "labelClass": 'marker-label marker-label-' + iconInfo.threshold + ' marker-label-chars-' + clusterCount.toString().length,
        "title": Drupal.t('Hits in this cluster: @hits', {'@hits' : clusterCount.toString()})
      };
      return new LabeledMarker(markerLocation, opts);
    },
    getSingleMarker = function (type) {
      var icon =  new GIcon();
        iconInfo = getMarkerTheme(1, type);
      icon.image = iconInfo.marker;
      icon.iconSize = new GSize(iconInfo.size[0], iconInfo.size[1]);
      icon.iconAnchor = new GPoint(iconInfo.anchor[0], iconInfo.anchor[1]);
      return new GMarker(markerLocation, icon);
    };

    if (clusterCount == 1) {
      marker = getSingleMarker(type);
      // Zoom in when doubleclicking a single marker.
      // Not needed on labeledMarker (clusters) where the default event is fired.
      GEvent.addListener(marker, "dblclick", function (p) {
        map.zoomIn(p, true);
      });
    }
    else {
      marker = getClusterMarker(clusterCount, type);
    }

    // Marker clicked, show infoWindow
    GEvent.addListener(marker, "click", function () {
      if (infoWindow) {
        infoWindow.show(marker, clusterBounds, markerId);
        $.get(Drupal.settings.basePath + 'geo/api/node-info?nids=' + markerId.join(','), function (data) {
          // Tell infoWindow that content finished loading
          infoWindow.didFinishLoadingContent(data, clusterCount);
        });
      }
    });

    // Store data needed by ClusterMarker.js when creating markers.
    marker.clusterCount = clusterCount;
    marker.markerId = markerId;
    marker.clusterBounds = clusterBounds;
    return marker;
  }

  // Set public function used by ClusterMarker.js
  SimpleGeoMap.newMarker = newMarker;

  SimpleGeoMap.removeMarkers = function () {
    if (cluster !== undefined) {
      cluster.removeMarkers();
    }
  };

  SimpleGeoMap.updateMarkers = function (forceRefresh) {
    if (!activeSource || !sources[activeSource]) {
      SimpleGeoMap.removeMarkers();
      return;
    }

    var size = map.getSize(),
    zoomLevel = map.getZoom(),
    center = map.getCenter(),
    proj = map.getCurrentMapType().getProjection(),
    pixel = proj.fromLatLngToPixel(center, zoomLevel),
    tile, topLeftPixel, topLeftTile, bottomRightPixel, bottomRightTile, url, data, tid, markersArray = [],
    source = sources[activeSource];


    // Only fetch new markers if the map is moved outside the padding or
    // forceRefresh is specified.
    if (forceRefresh || !oldCenter || (Math.abs(oldCenter.x - pixel.x) >= padding) || (Math.abs(oldCenter.y - pixel.y) >= padding)) {
      tile = new GPoint(Math.floor(pixel.x/256), Math.floor(pixel.y/256));

      topLeftPixel = {x : pixel.x - (size.width/2), y: pixel.y - (size.height/2)};
      topLeftTile = new GPoint(Math.floor(topLeftPixel.x/256), Math.floor(topLeftPixel.y/256));

      bottomRightPixel = {x : pixel.x + (size.width/2), y: pixel.y + (size.height/2)};
      bottomRightTile = new GPoint(Math.floor(bottomRightPixel.x/256), Math.floor(bottomRightPixel.y/256));

      data = {
        z: zoomLevel,
        x: (topLeftTile.x - 1),
        y: (topLeftTile.y - 1),
        width: bottomRightTile.x - topLeftTile.x + 2,
        height: bottomRightTile.y - topLeftTile.y + 2
      };
      url = source.query(data);

      if (url) {
        // Get markers
        ajax = $.ajax({
          url: url,
          data: data,
          dataType: 'json',
          beforeSend: function () {
            // Abort previous requests;
            if (typeof ajax !== 'undefined') {
              ajax.abort();
            }
            loaderShow();
          },
          success: function (json) {
            source.result(json, function (type, m) {
              var clusterBounds = new GLatLngBounds();
              if (m.NW) {
                clusterBounds.extend(new GLatLng(m.NW[0], m.NW[1]));
                clusterBounds.extend(new GLatLng(m.SE[0], m.SE[1]));
              }
              else {
                clusterBounds.extend(new GLatLng(m.lat, m.lon));
              };
              markersArray.push(newMarker(type, new GLatLng(m.lat, m.lon), m.count, clusterBounds, m.nid, Drupal.t("Show items"), map));
            });

            // Save the current center
            oldCenter = pixel;

            // Remove previous cluster.
            SimpleGeoMap.removeMarkers();

            // Add cluster
            cluster.addMarkers(markersArray);
            cluster.refresh();
            loader.hide();
          }
        });
      }
      else {
        SimpleGeoMap.removeMarkers();
      }
    }
  };

  function setEnabledFilters() {
    // Reset array
    enabledFilters = [];
    filterInputs.each(function () {
      if (this.checked) {
        enabledFilters.push($(this).val());
      }
    });
    return enabledFilters;
  }

  function toggleSize() {
    var center = map.getCenter();
    switch (mapState) {
    case 0: // Swith to large
      mapWrapper.removeClass('small').addClass('large');
      map.removeControl(smallZoomControl);
      map.addControl(largeZoomControl);
      mapState = 1;
      break;
    case 1: // Switch to small
      $("a", this).text(Drupal.t('Enlarge map'));
      mapWrapper.addClass('small').removeClass('large');
      map.removeControl(largeZoomControl);
      map.addControl(smallZoomControl);
      mapState = 0;
      break;
    }

    map.checkResize();
    map.setCenter(center);
  }

  function closeHelpBox() {
    if (helpBox.is(':visible')) {
      helpBox.css('display', 'none');
      $.cookie('simplegeoMapTouched', '1', {expires: 9999});
    };
  }

  function addToolbar() {
    var filterToggle, filterHTML, filterBox,
    tagFilterToggle, sizeToggle,
    fullscreen, fullscreenToggle, searchAddress, source;

    SimpleGeoMap.toolbar = $('<ul id="simplegeomap-toolbar"></ul>').insertBefore(SimpleGeoMap.mapElement);

    // Add home button
    $('<li class="home"><a href="#">' + Drupal.t('Home') + '</a></li>').appendTo(SimpleGeoMap.toolbar).click(function() {
      setCenter();
      return false;
    });

    // Add sources
    $.each(sources, function(sourceName, source) {
      if (source.dialog) {
        source.dialog.insertBefore(SimpleGeoMap.mapElement);
        if (sourceName != activeSource) {
          source.dialog.hide();
        }
      }

      // Add toggle control
      source.toggle = $('<li class="toggle-tag-filter"><a href="#"></a></li>').appendTo(SimpleGeoMap.toolbar);
      $("a", source.toggle).text(source.title).click(function() {
        // Show or hide the dialog
        if (source.dialog) {
          if (sourceName == activeSource) {
            source.dialog.hide();
          }
          else {
            if (activeSource && sources[activeSource].dialog) {
              sources[activeSource].dialog.hide();
            }
            source.dialog.show();
          }
        }
        if (sourceName != activeSource) {
          SimpleGeoMap.setActiveSource(sourceName);
        }
      });
    });

    //Add size control
    sizeToggle = $('<li class="toggle-size"><a href="#">' + (mapState ? Drupal.t('Minimize map') : Drupal.t('Enlarge map')) + '</a></li>').appendTo(SimpleGeoMap.toolbar);

    sizeToggle.click(function () {
      toggleSize(this);
      $("a", this).text((mapState ? Drupal.t('Minimize map') : Drupal.t('Enlarge map')));
      $.cookie('simplegeoMapState', mapState, {expires: 365});
      return false;
    });

    // Add fullscreen control
    fullscreen = false;
    fullscreenToggle = $('<li class="toggle-fullscreen"><a href="#">' + Drupal.t('Fullscreen') + '</a></li>').appendTo(SimpleGeoMap.toolbar);

    fullscreenToggle.click(function () {
      var center = map.getCenter();
      if (fullscreen) {
        $("html").removeClass('fullscreen');
        $("a", this).text(Drupal.t('Fullscreen'));
        mapWrapper.replaceAll('#map-temp-wrapper');
        $('#lmc3d').css('top', '7px');
        fullscreen = false;
      }
      else {
        $("html").addClass('fullscreen');
        $("a", this).text(Drupal.t('Leave fullscreen'));
        mapWrapper.before('<div id="map-temp-wrapper"></div>').prependTo('body');
        SimpleGeoMap.updateMarkers(true);
        $('#lmc3d').css('top', (7 + SimpleGeoMap.toolbar.outerHeight()) + 'px');
        fullscreen = true;
      }
      map.checkResize();
      map.setCenter(center);
      return false;
    });

    $(SimpleGeoMap).trigger('toolbarCreated', SimpleGeoMap);
  }

  function setCenter() {
    var zoom, center, positions, mapBounds, p, midLat=0, midLon=0;
    if (Drupal.settings.simpleGeoMap.center) {
      center = Drupal.settings.simpleGeoMap.center.split(" ");
      center = new GLatLng(center[0], center[1]);
    }
    else if (Drupal.settings.simple_geo_position) {
      center = Drupal.settings.simple_geo_position.split(" ");
      center = new GLatLng(center[0], center[1]);
    }
    else {
      center = new GLatLng(55.655897188968034, 12.557373046875);
    }

    if (Drupal.settings.simpleGeoMap.area) {
      positions = Drupal.settings.simpleGeoMap.area.split(",");
      mapBounds = new GLatLngBounds();

      if (positions) {
        for (p in positions) {
          if (positions.hasOwnProperty(p)) {
            point = positions[p].split(" ");
            mapBounds.extend(new GLatLng(point[0], point[1]));
            midLat += parseFloat(point[0]);
            midLon += parseFloat(point[1]);
          }
        }
        midLat = midLat / positions.length;
        midLon = midLon / positions.length;
        center = new GLatLng(midLat, midLon);
        zoom = map.getBoundsZoomLevel(mapBounds);
      }
    }
    else if (Drupal.settings.simpleGeoMap.zoom) {
      zoom = parseInt(Drupal.settings.simpleGeoMap.zoom);
    }
    else {
      zoom = 10;
    }
    map.setCenter(center, zoom);
  }

  function init() {
    var mt, i, savedMapState;
    mapWrapper = $("#simplegeo-map-wrapper");

    SimpleGeoMap.mapElement = document.getElementById("simplegeo-map");
    map = new GMap2(SimpleGeoMap.mapElement);

    setCenter();
    savedMapState = $.cookie('simplegeoMapState');

    smallZoomControl = new GSmallZoomControl3D();
    largeZoomControl = new GLargeMapControl3D();

    if (savedMapState !== null && mapState !== Number(savedMapState) && Drupal.settings.simpleGeoMap.toolbar !== false) {
      toggleSize();
    }
    else {
      map.addControl(largeZoomControl);
    }

    cluster = new ClusterMarker(map, {intersectPadding: 5});
    //cluster = new ClusterMarker(map, {intersectPadding: 5, clusteringEnabled: false});

    GEvent.addListener(map, "click", function (overlay) {
      closeHelpBox();
      if (!overlay && infoWindow) {
        infoWindow.hide();
      }
    });
    GEvent.addListener(map, "movestart", function () {
      closeHelpBox();
      if (infoWindow) {
        infoWindow.hide();
      }
    });
    GEvent.addListener(map, "moveend", function () {
      closeHelpBox();
      if (infoWindow) {
        infoWindow.hide();
      }
      SimpleGeoMap.updateMarkers();
    });


    // Marker Infowindow
    if (infoWindow) {
      infoWindow.init();
    }

    //Add loader
    loader = $('<div id="simplegeomap-loader">Loading...</div>').insertBefore(SimpleGeoMap.mapElement).hide();

    // Init sources
    $.each(sources, function(sourceName, source) {
      source.dialog = source.init();
    });

    // Add toolbar
    if (Drupal.settings.simpleGeoMap.toolbar !== false) {
      addToolbar();
    }

    // Helpbox
    helpBox = $('#simplegeomap-help');
    if ($.cookie('simplegeoMapTouched') !== '1') {
      helpBox.show();
      $("a.close", helpBox).click(function() {
        closeHelpBox();
        return false;
      });
    }

    SimpleGeoMap.updateMarkers(true);
  }

  // Load up the map.
  if (google && google.load) {
    google.load('maps', '2');
    $(document).ready(function () {
      init();
      $(SimpleGeoMap).trigger('loaded', SimpleGeoMap);
    });
  }
})(jQuery);
