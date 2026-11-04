// Yardımcı adaylarının hazır adları (Kemal, 15 Ekim akşam: "adayların
// hepsine sen bir isim yaz, ben değiştirebileyim istersem"). Kanon değil;
// işe alırken kutuda yazar, Kemal silip kendi adını yazabilir.
// Dönem 2020 sonrası: 2020'lerde yirmili yaşlarındakilerin sık adları (NVİ verisi,
// 1991–2010 doğumlular) ile önceki listeden yaşı tutanlar; Kemal 4 Kasım 2026.
const KADIN = ['Elif', 'Zeynep', 'Merve', 'Esra', 'Büşra', 'Kübra', 'İrem', 'Yağmur', 'Gamze', 'Tuğba', 'Ayşe', 'Rabia', 'Gizem', 'Deniz', 'Ebru'];
const ERKEK = ['Emre', 'Burak', 'Murat', 'Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Ömer', 'Yusuf', 'Furkan', 'Enes', 'Emirhan', 'Mert', 'Onur', 'Hakan'];

// Aynı aday her açılışta aynı adı alır; dükkânda zaten olan adlar atlanır
export function adOner(tohum: number, kadin: boolean, kullanilan: string[]) {
  const liste = kadin ? KADIN : ERKEK;
  for (let i = 0; i < liste.length; i++) {
    const ad = liste[(tohum + i) % liste.length];
    if (!kullanilan.includes(ad)) return ad;
  }
  return liste[tohum % liste.length];
}
