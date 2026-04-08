159 app.get('/admin', async (req, res) => {
160     const authHeader = req.headers.authorization || '';
161     if (!authHeader.startsWith('Basic ')) { res.setHeader('WWW-Authenticate', 'Basic realm="Admin"'); return res.status(401).send('Giriş gerekli!'); }
162     const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
163     const [user, pass] = credentials.split(':');
164     if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASSWORD || '1234')) {
165         let editSoru = null; if (req.query.duzenle) editSoru = await Soru.findById(req.query.duzenle);
166         const tumSorular = await Soru.find();
167         const dersler = ["Matematik", "Türkçe", "Fen Bilimleri", "T.C. İnkılâp Tarihi", "İngilizce", "Din Kültürü"];
168         const mod = req.query.mod || (req.query.duzenle ? 'soruEkle' : 'soruListesi');
169         let icerik = "";
170         if (mod === 'soruEkle') {
171             icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>${editSoru ? 'Soru Düzenle' : 'Yeni Soru Ekle'}</h3><form action="${editSoru ? '/soru-guncelle' : '/soru-ekle'}" method="POST">${editSoru ? `<input type="hidden" name="id" value="${editSoru._id}">` : ''}Sınıf: <select name="sinif">${[1,2,3,4,5,6,7,8,9,10,11,12].map(s => `<option value="${s}" ${(editSoru ? editSoru.sinif == s : s == 8) ? 'selected' : ''}>${s}. Sınıf</option>`).join('')}</select> Ders: <select name="ders">${dersler.map(d => `<option value="${d}" ${editSoru && editSoru.ders === d ? 'selected' : ''}>${d}</option>`).join('')}</select><br><br><input name="konu" placeholder="Konu" value="${editSoru ? editSoru.konu : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruOnculu" placeholder="Öncül (Opsiyonel)" style="width:98%; height:60px; padding:10px; margin-bottom:10px; border:1px solid #ddd;">${editSoru ? editSoru.soruOnculu : ''}</textarea><input name="soruResmi" placeholder="Soru Görsel URL (Opsiyonel)" value="${editSoru ? editSoru.soruResmi : ''}" style="width:98%; padding:10px; margin-bottom:10px; border:1px solid #ddd;"><textarea name="soruMetni" placeholder="Soru Metni" style="width:98%; height:80px; padding:10px; margin-bottom:10px; border:1px solid #ddd;" required>${editSoru ? editSoru.soruMetni : ''}</textarea><div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;"><p>Şıklar:</p>${[0,1,2,3].map(i => `<div style="margin-bottom:8px; display:flex; align-items:center; gap:10px;"><b>${String.fromCharCode(65+i)}:</b> <input name="metin${i}" placeholder="Metin" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].metin : ''}" style="flex:2;"> <input name="gorsel${i}" placeholder="Görsel URL" value="${editSoru && editSoru.secenekler[i] ? editSoru.secenekler[i].gorsel : ''}" style="flex:1;"> <input type="radio" name="dogruCevap" value="${i}" ${editSoru && editSoru.dogruCevapIndex === i ? 'checked' : ''} required></div>`).join('')}</div><button style="background:#34a853; color:white; padding:12px 30px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">KAYDET</button></form></div>`;
172         } else {
173             icerik = `<div style="background:white; padding:25px; border:1px solid #e0e0e0; border-radius:12px;"><h3>Tüm Sorular</h3><div style="display:grid; gap:10px;">${tumSorular.map((s, i) => `<div style="padding:15px; background:#fff; border:1px solid #eee; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i+1}.</b> [${s.sinif}. Sınıf - ${s.ders}] ${s.soruMetni.substring(0,50)}...</span><div><a href="/admin?duzenle=${s._id}&mod=soruEkle" style="color:#1a73e8; font-weight:bold; text-decoration:none; margin-right:10px;">DÜZENLE</a><form action="/soru-sil" method="POST" style="display:inline;"><input type="hidden" name="id" value="${s._id}"><button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">SİL</button></form></div></div>`).join('')}</div></div>`;
174         }
175         res.send(`<div style="display:flex; min-height:100vh; font-family:sans-serif; background:#f0f2f5;"><div style="width:250px; background:#202124; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin-bottom:30px; text-align:center;">🛠️ Admin</h2><a href="/admin?mod=soruListesi" style="display:block; color:white; text-decoration:none; padding:15px; margin-bottom:10px; border-radius:8px; background:${mod==='soruListesi'?'#3c4043':''};">📋 Soruları Listele</a><a href="/admin?mod=soruEkle" style="display:block; color:white; text-decoration:none; padding:15px; border-radius:8px; background:${mod==='soruEkle'?'#3c4043':''};">➕ Yeni Soru Ekle</a><hr style="margin:20px 0; opacity:0.3;"><a href="/" style="display:block; color:#ffcccc; text-decoration:none; padding:15px;">Çıkış Yap</a></div><div style="flex:1; padding:30px; overflow-y:auto;">${icerik}</div></div>`);
176     } else { res.status(401).send('Yetkisiz!'); }
177 });
178 
179 app.post('/soru-ekle', async (req, res) => {
180     await new Soru({ sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) }).save();
181     res.redirect('/admin?mod=soruListesi');
182 });
183 
184 app.post('/soru-guncelle', async (req, res) => {
185     await Soru.findByIdAndUpdate(req.body.id, { sinif: req.body.sinif, ders: req.body.ders, konu: req.body.konu, soruOnculu: req.body.soruOnculu, soruResmi: req.body.soruResmi, soruMetni: req.body.soruMetni, secenekler: [{ metin: req.body.metin0, gorsel: req.body.gorsel0 }, { metin: req.body.metin1, gorsel: req.body.gorsel1 }, { metin: req.body.metin2, gorsel: req.body.gorsel2 }, { metin: req.body.metin3, gorsel: req.body.gorsel3 }], dogruCevapIndex: parseInt(req.body.dogruCevap) });
186     res.redirect('/admin?mod=soruListesi');
187 });
188 
189 app.post('/soru-sil', async (req, res) => {
190     await Soru.findByIdAndDelete(req.body.id);
191     res.redirect('/admin?mod=soruListesi');
192 });
193 
194 app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda v2.3 olarak hazır!`));
