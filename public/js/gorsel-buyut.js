/* public/js/gorsel-buyut.js — v4.17.30
 * Gorsel buyutme yardimcilari (soru cozme ekrani, ogretmen ornek soru, "Soruyu Gor" penceresi, admin onizleme):
 *  1) ".gb-sar" / ".gb-rozet" stilleri: gorselin kosesinde her cihazda gorunen "🔍 Büyüt" etiketi.
 *     Siklarda etiket (".gb-dugme") parmakla rahat dokunulacak buyuklukte bir dugmedir; gorselin kendisine dokunmak
 *     sikki isaretler (cevap verir), dugmeye dokunmak yalniz buyutur. Metin + gorsel siklarda gorsel metnin altinda
 *     kendi satirina iner (".gb-tam"); onceden sikkin disina tasiyordu.
 *  2) Buyutme penceresi (#gorselLightbox): "✕ Kapat" dugmesi, "kapatmak icin dokunun" yazisi ve Esc ile kapanma.
 * Sayfanin <head> bolumunde yuklenir (stiller icerik cizilmeden once gelsin). Betik yuklenmezse eski davranis aynen surer.
 */
(function () {
  'use strict';
  try {
    var st = document.createElement('style');
    st.textContent = [
      '.gb-sar{position:relative;display:inline-block;max-width:100%;line-height:0;vertical-align:top}',
      '.gb-sar>img{display:block;max-width:100%;margin-left:auto;margin-right:auto}',
      '.gb-rozet{position:absolute;right:6px;bottom:6px;z-index:2;line-height:1;background:rgba(0,0,0,.62);color:#fff;',
      'font-size:12px;font-weight:600;padding:5px 9px;border-radius:999px;cursor:zoom-in;white-space:nowrap;',
      '-webkit-user-select:none;user-select:none;box-shadow:0 1px 4px rgba(0,0,0,.25);font-family:inherit}',
      '.gb-rozet:hover{background:rgba(0,0,0,.82)}',
      '.gb-dugme{top:4px;right:4px;bottom:auto;display:inline-flex;align-items:center;justify-content:center;',
      'min-height:36px;min-width:44px;padding:8px 12px;font-size:13px;background:#1a73e8;border:2px solid #fff}',
      '.gb-dugme:hover{background:#1557b0}',
      '.secenek-btn-yeni:has(>.gb-tam){flex-wrap:wrap}',
      '.gb-tam{display:block;flex:0 0 100%;min-width:0;max-width:100%;text-align:center;line-height:0}',
      '#gorselLightbox .gb-kapat{position:absolute;top:12px;right:12px;z-index:2;background:rgba(255,255,255,.95);color:#222;',
      'border:none;border-radius:999px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer;line-height:1;',
      'box-shadow:0 2px 8px rgba(0,0,0,.4);font-family:inherit}',
      '#gorselLightbox .gb-kapat:hover{background:#fff}',
      '#gorselLightbox .gb-lb-ipucu{position:absolute;left:0;right:0;bottom:10px;text-align:center;color:rgba(255,255,255,.85);',
      'font-size:13px;pointer-events:none;padding:0 12px;line-height:1.3;font-family:inherit}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { /* yoksay */ }

  function pencere() { return document.getElementById('gorselLightbox'); }
  function kapat() {
    if (typeof window.gorselKapat === 'function') { window.gorselKapat(); return; }
    var lb = pencere(); if (lb) lb.style.display = 'none';
  }
  function kur() {
    var lb = pencere();
    if (!lb || lb.getAttribute('data-gb')) return;
    lb.setAttribute('data-gb', '1');
    var dokunmatik = false;
    try { dokunmatik = window.matchMedia && window.matchMedia('(hover: none)').matches; } catch (e) { dokunmatik = false; }
    var k = document.createElement('button');
    k.type = 'button';
    k.className = 'gb-kapat';
    k.textContent = '✕ Kapat';
    k.setAttribute('aria-label', 'Büyütülmüş görseli kapat');
    k.addEventListener('click', function (e) { e.stopPropagation(); kapat(); });
    lb.appendChild(k);
    var ip = document.createElement('div');
    ip.className = 'gb-lb-ipucu';
    ip.textContent = dokunmatik ? 'Kapatmak için herhangi bir yere dokunun' : 'Kapatmak için herhangi bir yere tıklayın veya Esc tuşuna basın';
    lb.appendChild(ip);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var lb = pencere();
    if (lb && lb.style.display && lb.style.display !== 'none') kapat();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur);
  else kur();
})();
