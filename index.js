app.post('/cevap', async (req, res) => {
    try {
        const { kullaniciAdi, soruId, secilenIndex, gecenSure } = req.body;
        const s = await Soru.findById(soruId);
        const k = await Kullanici.findOne({ kullaniciAdi });

        if (s && k) {
            // 1. Sorunun temel verilerini güncelle
            s.cozulmeSayisi = (s.cozulmeSayisi || 0) + 1;
            const dogruMu = parseInt(secilenIndex) === s.dogruCevapIndex;
            if (dogruMu) s.dogruSayisi = (s.dogruSayisi || 0) + 1;
            
            // 2. Sorunun ortalama süresini güncelle (Ağırlıklı Ortalama)
            const eskiSureToplami = (s.ortalamaSure || 0) * (s.cozulmeSayisi - 1);
            s.ortalamaSure = (eskiSureToplami + parseInt(gecenSure)) / s.cozulmeSayisi;
            await s.save();

            if (dogruMu) {
                // 3. DERS ÖZELİNDE İSTATİSTİKSEL HESAPLAMA
                const dersSorulari = await Soru.find({ ders: s.ders, cozulmeSayisi: { $gt: 0 } });
                let kazanilanPuan = 10; // Varsayılan

                if (dersSorulari.length > 1) {
                    // Başarı Oranları ve Süreler Dizisi
                    const basariOranlari = dersSorulari.map(soru => (soru.dogruSayisi / soru.cozulmeSayisi) * 100);
                    const sureler = dersSorulari.map(soru => soru.ortalamaSure || 0);
                    
                    // --- BAŞARI SAPMASI HESABI ---
                    const mBasari = basariOranlari.reduce((a, b) => a + b, 0) / basariOranlari.length;
                    const vBasari = basariOranlari.reduce((a, b) => a + Math.pow(b - mBasari, 2), 0) / basariOranlari.length;
                    const sBasari = Math.sqrt(vBasari) || 1;
                    const zBasari = (((s.dogruSayisi / s.cozulmeSayisi) * 100) - mBasari) / sBasari;

                    // --- SÜRE SAPMASI HESABI ---
                    const mSure = sureler.reduce((a, b) => a + b, 0) / sureler.length;
                    const vSure = sureler.reduce((a, b) => a + Math.pow(b - mSure, 2), 0) / sureler.length;
                    const sSure = Math.sqrt(vSure) || 1;
                    const zSure = (s.ortalamaSure - mSure) / sSure;

                    // --- BİLEŞİK ZORLUK SKORU ---
                    // Başarı düştükçe ve süre arttıkça zorluk artar.
                    // zBasari negatifse zordur, zSure pozitifse zordur.
                    const zorlukSkoru = (zSure * 0.5) - (zBasari * 0.5);

                    // 5 KADEMELİ PUANLAMA (Zorluk Skoru Aralığına Göre)
                    if (zorlukSkoru < -1.2) kazanilanPuan = 5;       // Çok Kolay
                    else if (zorlukSkoru < -0.5) kazanilanPuan = 8;  // Kolay
                    else if (zorlukSkoru < 0.5) kazanilanPuan = 12;  // Orta
                    else if (zorlukSkoru < 1.2) kazanilanPuan = 16;  // Zor
                    else kazanilanPuan = 22;                         // Çok Zor
                }
                k.puan += kazanilanPuan;
            }

            // 4. Kullanıcıyı güncelle ve kaydet
            k.toplamSure += parseInt(gecenSure);
            k.cozumSureleri.push({ soruId: soruId, sure: parseInt(gecenSure) });
            k.soruIndex += 1;
            await k.save();
        }
        res.redirect('/soru/' + encodeURIComponent(kullaniciAdi));
    } catch (err) { res.status(500).send("Hata: " + err.message); }
});
