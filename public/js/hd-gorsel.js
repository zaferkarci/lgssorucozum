/* public/js/hd-gorsel.js — v4.17.28
 * PDF'ten yuksek cozunurlukte kirpilan soru gorselleri Cloudinary'de "hd_<id>_d250.png" (ya da _d200) adiyla durur.
 * Bu gorseller 2,5 (ya da 2) kat fazla piksel tasir. Bu betik onlari ekranda ESKI boyutlarinda gosterir
 * (piksel / yogunluk), boylece sayfa duzeni degismez ama gorsel keskin olur (telefon / yuksek DPI ekran / buyutme).
 * Eski gorsellere ve diger resimlere dokunmaz. Buyutme penceresi (gorselLightboxImg) gorseli tam cozunurlukte gosterir.
 * Sayfanin <head> bolumunde, ertelemeden (defer olmadan) yuklenmelidir: boylece gorseller boyutlanmadan once gorunmez.
 */
(function () {
  'use strict';
  var DESEN = /\/hd_[^\/?#]*_d(\d{3})\.[a-z0-9]+(?:[?#].*)?$/i;

  // Boyutlanana kadar gizle (betik yuklenmezse bu stil de olmaz; gorseller yine gorunur)
  try {
    var st = document.createElement('style');
    st.textContent = 'img[src*="/hd_"]:not([data-hd]){visibility:hidden}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { /* yoksay */ }

  function yogunluk(src) {
    var m = DESEN.exec(src || '');
    if (!m) return 0;
    var d = parseInt(m[1], 10) / 100;
    return (d >= 1 && d <= 4) ? d : 0;
  }
  // "max-width: min(<mevcut sinir>, <eski genislik>px)" — en-boy orani korunur, mevcut sinirlar (%100, 70vh...) gecerli kalir
  function sinir(mevcut, px) {
    if (!mevcut || mevcut === 'none') return px + 'px';
    return 'min(' + mevcut + ', ' + px + 'px)';
  }
  function boyutla(img) {
    var d = yogunluk(img.getAttribute('src'));
    if (!d) { if (img.hasAttribute('data-hd')) img.removeAttribute('data-hd'); return; }
    if (img.id === 'gorselLightboxImg' || img.hasAttribute('data-hd-dogal')) {
      img.setAttribute('data-hd', 'dogal'); // buyutmede tam cozunurluk
      return;
    }
    var uygula = function () {
      if (img.getAttribute('data-hd-src') === img.getAttribute('src')) { img.setAttribute('data-hd', '1'); return; }
      if (img.naturalWidth && img.naturalHeight) {
        // ilk islemde satir ici max-width / max-height degerlerini sakla (src degisirse yeniden kullanilir)
        if (!img.hasAttribute('data-hd-mw')) {
          img.setAttribute('data-hd-mw', img.style.maxWidth || '');
          img.setAttribute('data-hd-mh', img.style.maxHeight || '');
        }
        var w = Math.round(img.naturalWidth / d), h = Math.round(img.naturalHeight / d);
        img.style.maxWidth = sinir(img.getAttribute('data-hd-mw') || '100%', w);
        img.style.maxHeight = sinir(img.getAttribute('data-hd-mh'), h);
        img.setAttribute('data-hd-src', img.getAttribute('src'));
      }
      img.setAttribute('data-hd', '1');
    };
    if (img.complete && img.naturalWidth) uygula();
    else {
      img.addEventListener('load', uygula, { once: true });
      img.addEventListener('error', function () { img.setAttribute('data-hd', 'hata'); }, { once: true });
    }
  }
  function tara(kok) {
    if (!kok) return;
    if (kok.tagName === 'IMG') { boyutla(kok); return; }
    if (kok.querySelectorAll) {
      var l = kok.querySelectorAll('img[src*="/hd_"]');
      for (var i = 0; i < l.length; i++) boyutla(l[i]);
    }
  }
  try {
    new MutationObserver(function (kayitlar) {
      for (var i = 0; i < kayitlar.length; i++) {
        var k = kayitlar[i];
        if (k.type === 'attributes') {
          var img = k.target;
          if (img.tagName === 'IMG') {
            img.removeAttribute('data-hd');
            if (img.hasAttribute('data-hd-mw')) { // onceki boyutlamayi geri al
              img.style.maxWidth = img.getAttribute('data-hd-mw');
              img.style.maxHeight = img.getAttribute('data-hd-mh');
              img.removeAttribute('data-hd-mw'); img.removeAttribute('data-hd-mh'); img.removeAttribute('data-hd-src');
            }
            boyutla(img);
          }
        } else {
          for (var j = 0; j < k.addedNodes.length; j++) if (k.addedNodes[j].nodeType === 1) tara(k.addedNodes[j]);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  } catch (e) { /* cok eski tarayici: asagidaki tarama yeter */ }
  document.addEventListener('DOMContentLoaded', function () { tara(document); });
})();
