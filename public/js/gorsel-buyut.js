/* public/js/gorsel-buyut.js — v4.17.30
 * Gorsel buyutme yardimcilari (soru cozme ekrani, ogretmen ornek soru, "Soruyu Gor" penceresi, admin onizleme):
 *  1) ".gb-sar" / ".gb-rozet" stilleri: gorselin kosesinde her cihazda gorunen "🔍 Büyüt" etiketi.
 *     Siklarda etiket (".gb-dugme") parmakla rahat dokunulacak buyuklukte bir dugmedir; gorselin kendisine dokunmak
 *     sikki isaretler (cevap verir), dugmeye dokunmak yalniz buyutur. Metin + gorsel siklarda gorsel metnin altinda
 *     kendi satirina iner (".gb-tam"); onceden sikkin disina tasiyordu.
 *  2) Buyutme penceresi (#gorselLightbox): "✕ Kapat" dugmesi, "kapatmak icin dokunun" yazisi ve Esc ile kapanma.
 *  3) v4.17.37-1: GERCEK BUYUTME. Eskiden pencere gorseli yalniz kendi boyutuna kadar gosteriyordu; telefonda zaten ekran
 *     genisligindeki gorsel AYNI BOYUTTA kaliyordu, kucuk gorseller hic buyumuyordu. Artik:
 *     - Gorsel acilinca ekrani dolduracak kadar buyutulur (kucuk gorseller de).
 *     - Telefonda genis/basik gorseller (ekrana sigdirinca yine kucuk kalanlar) dogrudan 2 kata kadar buyuk acilir.
 *     - Gorsele dokununca 2,5 kat yakinlasir (dokunulan yer ortalanir), surukleyerek/kaydirarak gezilir;
 *       tekrar dokununca ekrana sigar. ➕ / ➖ dugmeleriyle 1x–5x arasi. Bos alana dokunmak veya Esc kapatir.
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
      '#gorselLightbox{justify-content:flex-start!important;align-items:flex-start!important;overflow:auto;-webkit-overflow-scrolling:touch}',
      '#gorselLightbox #gorselLightboxImg{margin:auto;max-width:none!important;max-height:none!important;background-color:transparent!important;cursor:zoom-in;flex-shrink:0}',
      '#gorselLightbox.gb-yakin #gorselLightboxImg{cursor:zoom-out}',
      '#gorselLightbox .gb-lb-araclar{position:fixed;top:12px;left:12px;z-index:3;display:flex;gap:8px}',
      '#gorselLightbox .gb-lb-araclar button{background:rgba(255,255,255,.95);color:#222;border:none;border-radius:999px;width:44px;height:40px;font-size:20px;font-weight:700;cursor:pointer;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.4);font-family:inherit}',
      '#gorselLightbox .gb-kapat{position:fixed;top:12px;right:12px;z-index:2;background:rgba(255,255,255,.95);color:#222;',
      'border:none;border-radius:999px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer;line-height:1;',
      'box-shadow:0 2px 8px rgba(0,0,0,.4);font-family:inherit}',
      '#gorselLightbox .gb-kapat:hover{background:#fff}',
      '#gorselLightbox .gb-lb-ipucu{position:fixed;left:0;right:0;bottom:10px;z-index:3;text-shadow:0 1px 3px #000;text-align:center;color:rgba(255,255,255,.85);',
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
    ip.textContent = dokunmatik ? 'Görsele dokun: yakınlaştır / küçült · Kaydırarak gez · Boş alana dokun: kapat' : 'Görsele tıkla: yakınlaştır / küçült · Boş alana tıkla veya Esc: kapat';
    lb.appendChild(ip);

    // v4.17.37-1: yakinlastirma
    var img = document.getElementById('gorselLightboxImg');
    if (!img) return;
    var kat = 1;
    function sigdirmaOrani() {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return 1;
      var gw = Math.max(window.innerWidth - 32, 50), gh = Math.max(window.innerHeight - 90, 50); // ust dugmeler + alt yazi payi
      return Math.min(gw / w, gh / h);
    }
    function acilisKati() {
      // telefonda genis gorsel: ekrana sigdirinca yuksekligi ekranin yarisina bile varmiyorsa 2 kata kadar buyuk ac
      var h = img.naturalHeight;
      if (!h || window.innerWidth >= 700) return 1;
      var gh = Math.max(window.innerHeight - 90, 50), yuk = h * sigdirmaOrani();
      if (yuk >= gh * 0.45) return 1;
      return Math.min(2, (gh * 0.45) / yuk);
    }
    function ac() { kat = acilisKati(); uygula(); lb.scrollLeft = 0; lb.scrollTop = 0; }
    function uygula() {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      var oran = sigdirmaOrani() * kat;
      img.style.width = Math.round(w * oran) + 'px';
      img.style.height = Math.round(h * oran) + 'px';
      if (kat > 1) lb.classList.add('gb-yakin'); else lb.classList.remove('gb-yakin');
      if (kat === 1) { lb.scrollLeft = 0; lb.scrollTop = 0; }
    }
    function katAyarla(yeni, x, y) {
      var once = img.getBoundingClientRect();
      var ox = (x != null) ? x : window.innerWidth / 2, oy = (y != null) ? y : window.innerHeight / 2;
      var gx = (ox - once.left) / (once.width || 1), gy = (oy - once.top) / (once.height || 1); // gorsel uzerindeki oran
      kat = Math.max(1, Math.min(5, yeni));
      uygula();
      var sonra = img.getBoundingClientRect();
      lb.scrollLeft += (sonra.left + gx * sonra.width) - ox;
      lb.scrollTop += (sonra.top + gy * sonra.height) - oy;
    }
    img.addEventListener('load', ac);
    img.addEventListener('click', function (e) {
      e.stopPropagation();
      katAyarla(kat > 1 ? 1 : 2.5, e.clientX, e.clientY);
    });
    window.addEventListener('resize', function () { if (lb.style.display && lb.style.display !== 'none') uygula(); });
    var ar = document.createElement('div');
    ar.className = 'gb-lb-araclar';
    [['−', -1, 'Uzaklaştır'], ['+', 1, 'Yakınlaştır']].forEach(function (d) {
      var bt = document.createElement('button');
      bt.type = 'button'; bt.textContent = d[0]; bt.title = d[2]; bt.setAttribute('aria-label', d[2]);
      bt.addEventListener('click', function (e) { e.stopPropagation(); katAyarla(kat + d[1]); });
      ar.appendChild(bt);
    });
    lb.appendChild(ar);
    // acilista (onbellekteki gorselde load tetiklenmeyebilir) bir kez sigdir
    new MutationObserver(function () {
      if (lb.style.display && lb.style.display !== 'none' && img.complete && img.naturalWidth) ac();
    }).observe(lb, { attributes: true, attributeFilter: ['style'] });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var lb = pencere();
    if (lb && lb.style.display && lb.style.display !== 'none') kapat();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur);
  else kur();
})();
