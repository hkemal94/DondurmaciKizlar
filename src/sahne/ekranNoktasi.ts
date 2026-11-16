// Telefon dik tutulunca oyun CSS ile 90° çevrilir (stil.css). Parmağın
// ekrandaki yerini çevrilmiş oyunun içindeki yere dönüştürür.
export function ekrandanSahneye(x: number, y: number) {
  if (window.matchMedia('(orientation: portrait)').matches) {
    return { x: y, y: window.innerWidth - x };
  }
  return { x, y };
}
