// v4.3.56: soruOnizle ve adminMathRender mod bloğundan ÇIKARILDI.
// Artık zorluk raporu, soru listesi, başka tüm admin sayfalarında çalışır.
function _soruOnizleHtml(s){
      var harfler = ['A','B','C','D'];
      var html = '';
      if (s.soruOnculu1) html += '<div style="background:transparent; padding:10px; border-radius:6px; margin-bottom:8px; font-size:14px; white-space:pre-wrap;">' + s.soruOnculu1 + '</div>';
      if (s.soruOnculu1Resmi) html += '<div style="text-align:center; margin-bottom:8px;"><img src="' + s.soruOnculu1Resmi + '" onclick="event.stopPropagation();gorselBuyut(this.src)" style="max-width:100%; max-height:65vh; border-radius:8px; cursor:zoom-in;"></div>';
      if (s.soruOnculu2) html += '<div style="background:transparent; padding:10px; border-radius:6px; margin-bottom:8px; font-size:14px; white-space:pre-wrap;">' + s.soruOnculu2 + '</div>';
      if (s.soruOnculu2Resmi) html += '<div style="text-align:center; margin-bottom:8px;"><img src="' + s.soruOnculu2Resmi + '" onclick="event.stopPropagation();gorselBuyut(this.src)" style="max-width:100%; max-height:65vh; border-radius:8px; cursor:zoom-in;"></div>';
      if (s.soruOnculu3) html += '<div style="background:transparent; padding:10px; border-radius:6px; margin-bottom:8px; font-size:14px; white-space:pre-wrap;">' + s.soruOnculu3 + '</div>';
      if (s.soruOnculu3Resmi) html += '<div style="text-align:center; margin-bottom:10px;"><img src="' + s.soruOnculu3Resmi + '" onclick="event.stopPropagation();gorselBuyut(this.src)" style="max-width:100%; max-height:65vh; border-radius:8px; cursor:zoom-in;"></div>';
      html += '<h3 style="font-size:17px; margin:12px 0; white-space:pre-wrap;">' + s.soruMetni + '</h3>';
      if (s.tabloBaslik && s.tabloBaslik.length > 0) {
        html += '<div style="margin-bottom:4px;"><table style="border-collapse:collapse; font-size:13px; table-layout:fixed;"><tr><td style="padding:3px 0; width:48px;"></td>';
        for (var tb = 0; tb < s.tabloBaslik.length; tb++) {
          html += '<td style="padding:3px 0; width:90px; border-bottom:1px solid #999; font-weight:500; text-align:center;">' + s.tabloBaslik[tb] + '</td>';
        }
        html += '</tr></table></div>';
      }
      var dizilim = s.sikDizilimi || 'dikey';
      var gridCols = dizilim === 'yatay' ? '1fr 1fr 1fr 1fr' : dizilim === 'ikili' ? '1fr 1fr' : '1fr';
      html += '<div class="secenekler" style="display:grid; grid-template-columns:' + gridCols + '; gap:8px;">';
      for (var i = 0; i < 4; i++) {
        if (!s.secenekler[i]) continue;
        var sikMetin = (s.secenekler[i].metin || '').trim();
        var sikGorsel = s.secenekler[i].gorsel || '';
        if (!sikMetin && !sikGorsel) continue;
        var tabloMu = sikMetin.indexOf('<table') !== -1;
        var dogruMu = s.dogruCevapIndex === i;
        var bgRenk = dogruMu ? '#d4edda' : 'white';
        var border = dogruMu ? '2px solid #28a745' : '2px solid #ddd';
        var sadeceGorsel = !sikMetin && sikGorsel;
        if (sadeceGorsel) {
          html += '<div style="padding:10px 14px; border:' + border + '; border-radius:8px; background:' + bgRenk + '; text-align:left; display:flex; flex-direction:column; align-items:flex-start;">';
          html += '<b style="font-size:14px; margin-bottom:8px;">' + harfler[i] + ')</b>';
          html += '<img src="' + sikGorsel + '" onclick="event.stopPropagation();gorselBuyut(this.src)" style="max-width:100%; max-height:50vh; align-self:center; cursor:zoom-in;">';
          html += '</div>';
        } else {
          html += '<div style="padding:10px 14px; border:' + border + '; border-radius:8px; background:' + bgRenk + '; text-align:left;">';
          if (tabloMu) html += '<b style="display:block; margin-bottom:6px;">' + harfler[i] + ')</b>';
          else html += '<b>' + harfler[i] + ')</b>' + (sikMetin ? ' ' : '');
          if (sikMetin) html += sikMetin;
          if (sikGorsel) html += (sikMetin ? '<br>' : '') + '<img src="' + sikGorsel + '" onclick="event.stopPropagation();gorselBuyut(this.src)" style="max-width:100%; max-height:300px; cursor:zoom-in;' + (sikMetin ? ' margin-top:5px;' : '') + '">';
          html += '</div>';
        }
      }
      html += '</div>';
      html += '<p style="margin-top:12px; font-size:12px; color:#28a745;"><b>Doğru Cevap:</b> ' + harfler[s.dogruCevapIndex] + '</p>';
  return html;
}

function soruOnizle(id) {
  var icerik = document.getElementById('soruOnizlemeIcerik');
  var modal = document.getElementById('soruOnizlemeModal');
  icerik.innerHTML = 'Yükleniyor...';
  modal.style.display = 'flex';
  fetch('/api/soru/' + id, { credentials: 'same-origin' })
    .then(function(r){
      if (!r.ok) {
        return r.text().then(function(txt){
          throw new Error('HTTP ' + r.status + ' — ' + (txt.length > 200 ? txt.substring(0,200) + '...' : txt));
        });
      }
      return r.json();
    })
    .then(function(s){
      var html = _soruOnizleHtml(s);
      icerik.innerHTML = html;
      adminMathRender(icerik);
    })
    .catch(function(e){ icerik.innerHTML = '<p style="color:red;">Hata: ' + e.message + '</p>'; });
}
function adminMathRender(el) {
  try {
    if (typeof ciftBackslashNormalize === 'function') {
      ciftBackslashNormalize(el);
    }
  } catch(e) {}
  if (window.MathJaxReady && window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([el]).catch(function(err){ console.warn('MathJax render hatası:', err); });
  } else if (window.MathJax && MathJax.typesetPromise) {
    setTimeout(function(){ MathJax.typesetPromise([el]).catch(function(){}); }, 700);
  } else {
    setTimeout(function(){
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([el]).catch(function(){});
      } else {
        console.warn('MathJax CDN yüklenmedi, formüller ham görünüyor.');
      }
    }, 2000);
  }
}

// v4.8.5: Soru listesi — kart seçimi/işaretleme + sol panelde önizleme
var _aktifSoruKart = null;
function soruPanelOnizle(id){
  var hedef = document.getElementById('soruListePanel');
  if (!hedef) return;
  hedef.innerHTML = '<div class="soru-onizleme-panel-ic">Yükleniyor...</div>';
  fetch('/api/soru/' + id, { credentials: 'same-origin' })
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(s){
      var meta = (s.soruNo ? '#' + s.soruNo + ' · ' : '') + (s.sinif ? s.sinif + '. Sınıf' : '') + (s.ders ? ' · ' + s.ders : '') + (s.konu ? ' · ' + s.konu : '');
      var ic = document.createElement('div');
      ic.className = 'soru-onizleme-panel-ic';
      ic.innerHTML = '<div style="font-size:12px; color:#8a93a3; margin-bottom:10px; font-weight:600;">' + meta + '</div>' + _soruOnizleHtml(s);
      hedef.innerHTML = '';
      hedef.appendChild(ic);
      adminMathRender(ic);
    })
    .catch(function(e){ hedef.innerHTML = '<div class="soru-onizleme-panel-ic" style="color:#c62828;">Önizleme hatası: ' + e.message + '</div>'; });
}
function soruKartiAktifYap(el){
  if (_aktifSoruKart && _aktifSoruKart !== el) _aktifSoruKart.classList.remove('aktif');
  el.classList.add('aktif');
  _aktifSoruKart = el;
}
function soruKartiSec(el, id){
  if (!el) return;
  var cb = el.querySelector('.soru-sec-kutu');
  if (cb) { cb.checked = true; el.classList.add('isaretli'); }
  soruKartiAktifYap(el);
  soruPanelOnizle(id);
}
function soruKutuToggle(cb, id){
  var el = cb.closest('.admin-soru-item');
  if (!el) return;
  el.classList.toggle('isaretli', cb.checked);
  if (cb.checked) { soruKartiAktifYap(el); soruPanelOnizle(id); }
}
