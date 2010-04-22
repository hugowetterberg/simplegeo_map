/**
 * @file
 *   Provides a basic simple info window for markers
 *
 * @param   object      SimpleGeoMap
 * @param   object      marker
 *  The clicked marker
 */
(function (SimpleGeoMap) {
  var elem,             // The infoWindow DOM element
      marker,           // Clicked marker object
      markerId,         // Nids in cluster
      clusterBounds;    // Cluster bounds (GLatLngBounds)

  // The info window object
  var infoWindow = {
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
     * @param   object    clusterBounds
     * @param   array     markerId
     */
    show: function (m, cb, mId) {
      marker = m;
      clusterBounds = cb;
      markerId = mId;

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
     * @param   int       clusterCount
     */
    didFinishLoadingContent: function (contents, clusterCount) {
      // Inject content
      $('#simplegeomap-info-content').empty();
      $('#simplegeomap-info-content').html(contents).hide();

      $(elem).children('.zoom').remove();
      if (SimpleGeoMap.getMap().getZoom() < SimpleGeoMap.getMaxZoom()) {
        $('<a class="zoom" href="#">' + Drupal.formatPlural(clusterCount, 'Zoom in to marker', 'Zoom in to markers') + '</a>').appendTo(elem).click(function() {
          SimpleGeoMap.getMap().setCenter(marker.getLatLng(), SimpleGeoMap.getMap().getBoundsZoomLevel(clusterBounds)-1);
          return false;
        });
      }

      // Setup pager
      if (clusterCount > 1) {
        setupPager(markerId, marker, $('#simplegeomap-info-content'));
      }

      // Show content
      $('#simplegeomap-info-content').slideDown();
    }
  };

  /**
   * Private pager function
   *
   * @param   array   markerId
   * @param   object  marker
   * @param   object  markerInfo
   */
  var setupPager = function (markerId, marker, markerInfo) {
    var total = markerId.length,
      pagerTitle = marker.clusterCount > total ? Drupal.t('<span class="current">1</span> of latest <span class="total">!total</span>', {'!total' : total}) : Drupal.t('<span class="current">1</span> of <span class="total">!total</span>'),
      pager = $('<div class="item-list"><ul class="pager clear-block"><li class="pager-previous"><a href="#">' + Drupal.t('Previous') +'</a></li><li class="pager-next"><a href="#">' + Drupal.t('Next') + '</a></li><li>' + pagerTitle + '</li></ul></div>').prependTo(markerInfo),
      currentCount = $("span.current", pager), index = 0, oldNode = false;

    function page(index) {
      if (oldNode) {
        oldNode.hide();
      }
      else {
        $("div.node", markerInfo).hide();
      }
      // Loop from 1 to total
      index = (index % (total));
      oldNode = $("div.node:eq(" + index + ")", markerInfo).show();
      currentCount.text(index + 1);
    }

    $("span.total", pager).text(markerId.length);
    $(".pager-previous a", pager).click(function () {
      index--;
      page(index);
      return false;
    });
    $(".pager-next a", pager).click(function () {
      index++;
      page(index);
      return false;
    });

    page(index);
  };

  // Register this info window with SimpleGeoMap
  SimpleGeoMap.setInfoWindow(infoWindow);
}(SimpleGeoMap));