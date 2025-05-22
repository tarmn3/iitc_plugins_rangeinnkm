// ==UserScript==
// @id            iitc-plugin-nearby-portals@tarmn3
// @name          IITC Plugin: Nearby Portals
// @category      Info
// @version       0.2.0
// @namespace     https://github.com/tarmn3/iitc_plugins_rangeinnkm
// @description   List portals within a specified radius of the selected portal (map popup & sidebar)
// @include       https://*.ingress.com/intel*
// @include       http://*.ingress.com/intel*
// @match         https://*.ingress.com/intel*
// @match         http://*.ingress.com/intel*
// @grant         none
// ==/UserScript==
(function() {
  function wrapper() {
    if(typeof window.plugin !== 'function') window.plugin = function() {};
    var p = window.plugin.nearbyPortals = { defaultRadiusKm: 1.0 };

    // Consolidated CSS for dialog content and button styles
    var STYLE = `
        /* ダイアログ本体の幅を中身に合わせる */
        .nearby-dialog.ui-dialog {
          width: auto !important;          /* 自動幅 */
          display: inline-block !important;/* インラインブロック化してテキスト幅にフィット */
          max-width: 90vw !important;      /* ビューポート比で上限を設けたいなら */
        }

        /* タイトルバー部分を含めた全体の余白を微調整（必要なら） */
        .nearby-dialog .ui-dialog-titlebar {
          padding: 0.4em 0.6em !important;  /* お好みで調整 */
        }

        /* リスト部分は折り返しせず、1行で長いテキストも確認したい場合 */
        .nearby-dialog .ui-dialog-content {
          white-space: nowrap !important;  /* 折り返さない */
        }

      .nearby-list-btn {
        margin-left: 4px !important;
        font-size: 0.9em !important;
        cursor: pointer !important;
        color: #ff0 !important;
      }
    `;

    /** Inject consolidated CSS into page **/
    function injectStyles() {
      $('<style>').prop('type', 'text/css').html(STYLE).appendTo('head');
    }

    /** Add [Nearby] link to portal detail headers **/
    function addButton() {
      $('.portaldetails .title, #portaldetails .title').each(function() {
        var $el = $(this);
        if ($el.find('.nearby-list-btn').length) return;
        $('<a>', { class: 'nearby-list-btn', text: '[Nearby]' })
          .on('click', function(e) { e.preventDefault(); p.promptAndShow(); })
          .appendTo($el);
      });
    }

    /** Prompt for radius and trigger nearby search **/
    p.promptAndShow = function() {
      var km = prompt('半径をkm単位で指定してください (例: 1 = 1km)', p.defaultRadiusKm);
      if (km === null) return;
      km = parseFloat(km);
      if (isNaN(km) || km <= 0) { alert('有効な数値を入力してください'); return; }
      p.defaultRadiusKm = km;
      p.showNearby(km * 1000);
    };

    /** Compute nearby portals and render list **/
    p.showNearby = function(radius) {
      var guid = window.selectedPortal ||
        (window.portaldetails && window.portaldetails.portalDetails && window.portaldetails.portalDetails.guid);
      if (!guid) { alert('ポータルが選択されていません'); return; }

      var portal = window.portals[guid];
      if (!portal || !portal.options || !portal.options.data) { alert('ポータルデータが取得できません'); return; }
      var centerLL = L.latLng(portal.options.data.latE6 / 1e6, portal.options.data.lngE6 / 1e6);

      var items = [];
      $.each(window.portals, function(g, ptl) {
        var dist = centerLL.distanceTo(ptl.getLatLng());
        if (dist <= radius) {
          items.push({ title: ptl.options.data.title, guid: g, dist: dist });
        }
      });
      if (!items.length) { alert('半径 ' + (radius / 1000) + 'km以内にポータルがありません'); return; }
      render(items, radius);
    };

    /** Render the portal list in a modal dialog **/
    function render(items, radius) {
      items.sort(function(a, b) { return a.dist - b.dist; });
      var km = (radius / 1000).toFixed(2);
      var html = '<ul style="margin:0; padding:0; list-style:disc outside;">';
      items.forEach(function(i) {
        var url = location.origin + '/intel?oguid=' + i.guid;
        html += '<li style="margin:4px 0; padding:0 10px;">'
              + i.title + ' (<a href="' + url + '" target="_blank">Link</a>) - '
              + Math.round(i.dist) + 'm</li>';
      });
      html += '</ul>';

      window.dialog({
        dialogClass: 'nearby-dialog',
        modal: true,
        title: '半径 ' + km + ' km 内のポータル',
        html: html,
        width: '80vw'
      });
    }

    /** Initialize plugin and register hooks **/
    function setup() {
      injectStyles();
      addButton();
      window.addHook('portalSelected', addButton);
      window.addHook('portalDetailsUpdated', addButton);
      window.addHook('mapDataRefreshEnd', addButton);
      window.addHook('boot', addButton);
    }

    setup.info = { script: { version: '0.6.1' } };
    window.addHook('iitcLoaded', setup);
  }

  // Inject the plugin into page context
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + wrapper + ')()'));
  document.body.appendChild(script);
})();
