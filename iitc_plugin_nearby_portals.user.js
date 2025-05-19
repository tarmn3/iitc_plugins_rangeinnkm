// ==UserScript==
// @id            iitc-plugin-nearby-portals@tarmn3
// @name          IITC Plugin: Nearby Portals
// @category      Info
// @version       0.1.0
// @namespace     https://github.com/tarmn3/iitc_plugins_rangeinnkm
// @description   List portals within a specified radius of the selected portal (map popup & sidebar)
// @include       https://*.ingress.com/intel*
// @include       http://*.ingress.com/intel*
// @match         https://*.ingress.com/intel*
// @match         http://*.ingress.com/intel*
// @grant         none
// ==/UserScript==
(function() {
  function wrapper(plugin_info) {
    if (typeof window.plugin !== 'object') window.plugin = {};
    var p = window.plugin.nearbyPortals = {};
    p.defaultRadiusKm = 1.0; // default radius in km

    // Add [Nearby] button
    function addButton() {
      $('.portaldetails .title, #portaldetails .title').each(function() {
        var $title = $(this);
        if ($title.find('.nearby-list-btn').length) return;
        var $btn = $('<a class="nearby-list-btn" href="#" style="margin-left:4px;font-size:0.9em;">[Nearby]</a>');
        $btn.on('click', function(ev) {
          ev.preventDefault();
          p.promptAndShow();
        });
        $title.append($btn);
      });
    }

    // Prompt user for radius and show list
    p.promptAndShow = function() {
      var km = prompt('半径をkm単位で指定してください (例: 1 = 1km)', p.defaultRadiusKm);
      if (km === null) return; // cancelled
      km = parseFloat(km);
      if (isNaN(km) || km <= 0) {
        alert('有効な数値を入力してください');
        return;
      }
      p.defaultRadiusKm = km;
      p.showNearby(km * 1000);
    };

    // Show nearby portals within given radius in meters
    p.showNearby = function(radius) {
      var centerGuid = window.selectedPortal;
      if (!centerGuid) { alert('ポータルが選択されていません'); return; }
      var details = window.portalDetail.get(centerGuid);
      var centerData = details && window.getPortalSummaryData
        ? window.getPortalSummaryData(details)
        : (window.portals[centerGuid] && window.portals[centerGuid].options.data);
      if (!centerData) { alert('ポータルデータが取得できません'); return; }
      var centerLatLng = L.latLng(centerData.latE6/1e6, centerData.lngE6/1e6);

      // Collect nearby
      var nearby = [];
      $.each(window.portals, function(guid, portal) {
        var latlng = portal.getLatLng();
        var dist = centerLatLng.distanceTo(latlng);
        if (dist <= radius) nearby.push({ guid: guid, dist: dist });
      });
      if (!nearby.length) {
        alert('半径' + (radius/1000) + 'km以内のポータルは見つかりませんでした');
        return;
      }

      // Prepare items, load missing details
      var items = [], toLoad = {}, remaining = 0;
      nearby.forEach(function(item) {
        var d = window.portalDetail.get(item.guid);
        if (d && window.getPortalSummaryData) {
          var s = window.getPortalSummaryData(d);
          items.push({ name: s.title, guid: item.guid, dist: item.dist });
        } else {
          toLoad[item.guid] = item.dist;
          remaining++;
          window.portalDetail.request(item.guid);
        }
      });
      if (remaining === 0) {
        display(items, radius);
      } else {
        var hook = function(data) {
          if (data.success && data.details && data.guid in toLoad) {
            var s = window.getPortalSummaryData(data.details);
            items.push({ name: s.title, guid: data.guid, dist: toLoad[data.guid] });
            delete toLoad[data.guid];
            remaining--;
            if (remaining <= 0) {
              window.removeHook('portalDetailLoaded', hook);
              display(items, radius);
            }
          }
        };
        window.addHook('portalDetailLoaded', hook);
      }
    };

    // Render dialog
    function display(items, radius) {
      items.sort(function(a, b) { return a.dist - b.dist; });
      var km = (radius/1000).toFixed(2);
      var html = '<div style="max-height:300px;overflow:auto;width:100%;"><ul>';
      items.forEach(function(item) {
        var url = location.origin + '/intel?oguid=' + item.guid;
        html += '<li>' + item.name + ' (<a href="' + url + '" target="_blank">' + url + '</a>) - ' + Math.round(item.dist) + 'm</li>';
      });
      html += '</ul></div>';
      window.dialog({
        title: '半径 ' + km + ' km 内のポータル',
        html: html,
        width: 600
      });
    }

    function setup() {
      window.addHook('portalSelected', addButton);
      window.addHook('portalDetailsUpdated', addButton);
    }
    setup.info = plugin_info;
    window.addHook('iitcLoaded', setup);
  }

  var script = document.createElement('script');
  var info = {};
  if (typeof GM_info !== 'undefined' && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name };
  script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
  document.body.appendChild(script);
})();
