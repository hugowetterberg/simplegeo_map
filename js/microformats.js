(function (SimpleGeoMap, $) {
  $(SimpleGeoMap).bind('loaded', function() {
    var positions, icon, tmp_ids, last_marker, default_zoom;
    positions = $('.geo');
    if (positions.length > 0) {
      icon = new google.maps.Icon();
      icon.image = Drupal.settings.simpleGeoMap.images + '/location.png';
      icon.iconSize = new GSize(24, 24);
      icon.iconAnchor = new GPoint(12, 12);
      default_zoom = parseInt(Drupal.settings.simple_geo_max_zoom, 10);

      tmp_ids = 0;
      $.each(positions, function(i, geo) {
        var lat = $(geo).find('.latitude').text(),
          lng = $(geo).find('.longitude').text(),
          pos = new google.maps.LatLng(lat, lng),
          marker = new google.maps.Marker(pos, {
              icon : icon, 
              zIndexProcess: function() {
                return 9000;
              }
            });

        last_marker = marker;
        SimpleGeoMap.getMap().addOverlay(marker);
        google.maps.Event.addListener(marker, "click", function () {
          var level = geo, has_title, title;
          while (!(has_title = (title = jQuery(level).children('.simple-geo-title,.title,.views-field-title')).length) && level.parentNode) {
            level = level.parentNode;
          }
          if (!has_title) {
            level = geo.parentNode;
            if (!level.id) {
              level.id = 'micromap-' + (tmp_ids);
              tmp_ids = tmp_ids + 1;
            }
          }

          $(level).css({ backgroundImage: 'none' }).animate({ backgroundColor: "#FFFFAA" }, 1000, function () {
            $(this).animate({ backgroundColor: "#FFFFFF" }, 1000, function () {
              $(this).css({ backgroundImage: '', backgroundColor: '' });
            });
          });
          window.location.hash = '#' + level.id;
          if (positions.length == 1) {
            SimpleGeoMap.getMap().setCenter(marker.getLatLng(), default_zoom);
          }
        });
        $(geo.parentNode).find('a[rel=map]').click(function() {
          SimpleGeoMap.getMap().setCenter(marker.getLatLng(), Math.max(SimpleGeoMap.getMap().getZoom(), default_zoom));
        }).attr('href', '#' + SimpleGeoMap.mapElement.id);
      });

      if (positions.length == 1) {
        SimpleGeoMap.getMap().setCenter(last_marker.getLatLng(), Number(default_zoom));
      }
    }
  });
})(SimpleGeoMap, jQuery);