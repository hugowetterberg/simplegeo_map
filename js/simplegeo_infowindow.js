/**
 * @file
 *   Provides a basic simple info window for markers
 *
 * @param   object      SimpleGeoMap
 * @param   object      marker
 *  The clicked marker
 */
(function (SimpleGeoMap) {
  var elem,
  infoWindow = {
    /**
     * Initialize the infoWindow adding it to <body>
     */
    init: function () {
      elem = $('<div id="simplegeomap-info-window"><div id="simplegeomap-info-content"></div></div>').appendTo('body').hide();
      $('<a href="#" class="close">' + Drupal.t('Close') + '</a>').prependTo(elem).click(function () {
        infoWindow.hide();
        return false;
      });
    },

    /**
     * Display infoWindow, usually on marker click
     *
     * @param   object    marker
     */
    show: function (marker) {
      // Determine marker position
      var pos     = SimpleGeoMap.getMap().fromLatLngToContainerPixel(marker.getLatLng());
      var offset  = $(SimpleGeoMap.getMapElement()).offset();
      elem.css({
        'top': pos.y + offset.top + marker.getIcon().iconSize.height - marker.getIcon().iconAnchor.y + 2,
        'left': pos.x + offset.left - marker.getIcon().iconAnchor.x
      });

      // Empty old content to make place for new
      $('#simplegeomap-info-content').empty();

      // Display loader
      $('#simplegeomap-info-content').html('<div class="marker-info marker-info-loading">Loading...</div>');

      // Show window to user
      elem.show();
    },

    /**
     * Hide the infoWindow
     */
     hide: function () {
        elem.hide();
     },

    /**
     * Did finish loading contents
     *
     * @param   object    contents
     */
     didFinishLoadingContent: function (contents) {
       // Inject content
       $('#simplegeomap-info-content').empty();
       $('#simplegeomap-info-content').html(contents);

       // Show content
     }
  };

  // Register this info window with SimpleGeoMap
  SimpleGeoMap.setInfoWindow(infoWindow);
}(SimpleGeoMap));