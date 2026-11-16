import { useMemo } from 'react';
import * as THREE from 'three';
import type { Esya } from '../oyun/dekorasyon';
import { renk } from './renkler';

// İç süsler (C4, belge 0.11): halılar ve tablolar. Desenler kodla çizilir;
// tablolarda kurgu ya da Düzada'ya özel bir yer yok: soyut desen, dondurma,
// genel bir deniz ve tekneler. Boş çerçeve Kemal'in resmini bekler.

const dokular = new Map<string, THREE.CanvasTexture>();
function cizilmisDoku(ad: string, en: number, boy: number, ciz: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const var_ = dokular.get(ad);
  if (var_) return var_;
  const c = document.createElement('canvas');
  c.width = en;
  c.height = boy;
  ciz(c.getContext('2d')!, en, boy);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  dokular.set(ad, t);
  return t;
}

// ---- Halılar ----
function paspasDokusu() {
  return cizilmisDoku('paspas', 256, 128, (g, w, h) => {
    g.fillStyle = renk.krem;
    g.fillRect(0, 0, w, h);
    const seritler = [renk.mor, renk.sari, renk.mor];
    seritler.forEach((r, i) => {
      g.fillStyle = r;
      g.fillRect(0, 24 + i * 32, w, 16);
    });
    g.strokeStyle = renk.morKoyu;
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  });
}

function yuvarlakDokusu() {
  return cizilmisDoku('haliYuvarlak', 256, 256, (g, w) => {
    const halkalar = [renk.mor, renk.krem, renk.sari, renk.krem, renk.morAcik, renk.krem];
    halkalar.forEach((r, i) => {
      g.fillStyle = r;
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - i * 20, 0, Math.PI * 2);
      g.fill();
    });
  });
}

function kilimDokusu() {
  return cizilmisDoku('haliKilim', 384, 256, (g, w, h) => {
    g.fillStyle = renk.kiremit;
    g.fillRect(0, 0, w, h);
    g.fillStyle = renk.krem;
    g.fillRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#b4614d';
    g.fillRect(28, 28, w - 56, h - 56);
    // Ortada baklava sırası
    const renkler = [renk.krem, renk.sari, '#5f8fa8'];
    for (let i = 0; i < 5; i++) {
      const x = 70 + i * 61;
      g.fillStyle = renkler[i % 3];
      g.beginPath();
      g.moveTo(x, h / 2 - 50);
      g.lineTo(x + 26, h / 2);
      g.lineTo(x, h / 2 + 50);
      g.lineTo(x - 26, h / 2);
      g.closePath();
      g.fill();
      g.fillStyle = '#b4614d';
      g.fillRect(x - 6, h / 2 - 6, 12, 12);
    }
  });
}

function Hali({ esya }: { esya: Esya }) {
  if (esya === 'haliYuvarlak')
    return (
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <cylinderGeometry args={[0.92, 0.92, 0.02, 32]} />
        <meshStandardMaterial attach="material-0" color={renk.mor} roughness={1} />
        <meshStandardMaterial attach="material-1" map={yuvarlakDokusu()} roughness={1} />
        <meshStandardMaterial attach="material-2" color={renk.mor} roughness={1} />
      </mesh>
    );
  const [en, boy, doku] = esya === 'haliKilim' ? [2.8, 1.8, kilimDokusu()] : [1.7, 0.8, paspasDokusu()];
  return (
    <mesh position={[0, 0.012, 0]} receiveShadow>
      <boxGeometry args={[en, 0.02, boy]} />
      <meshStandardMaterial map={doku} roughness={1} />
    </mesh>
  );
}

// ---- Tablolar ----
// Dondurma ve deniz tabloları hazır resim (Kems Ajans, Kemal onaylı, 14 Kasım 2026;
// docs/lisanslar.md). Resimler çerçevenin resim yüzeyiyle aynı oranda (14:11)
// kırpıldı ve telefon için 512 piksele küçültüldü: tablo ekranda küçük görünür,
// daha büyüğü yalnız belleği doldurur.
const RESIMLI_TABLOLAR: Partial<Record<Esya, string>> = {
  tabloDondurma: 'gorseller/tablolar/dondurma.webp',
  tabloDeniz: 'gorseller/tablolar/deniz.webp',
};
const resimDokulari = new Map<string, THREE.Texture>();
function resimDokusu(yol: string) {
  const var_ = resimDokulari.get(yol);
  if (var_) return var_;
  const t = new THREE.TextureLoader().load(import.meta.env.BASE_URL + yol);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  resimDokulari.set(yol, t);
  return t;
}

function tabloDokusu(esya: Esya) {
  const resim = RESIMLI_TABLOLAR[esya];
  if (resim) return resimDokusu(resim);
  return cizilmisDoku(esya, 256, 200, (g, w, h) => {
    if (esya === 'tabloSoyut') {
      g.fillStyle = renk.krem;
      g.fillRect(0, 0, w, h);
      g.fillStyle = renk.mor;
      g.beginPath();
      g.arc(90, 110, 62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = renk.sari;
      g.fillRect(140, 30, 70, 140);
      g.fillStyle = renk.kiremit;
      g.beginPath();
      g.arc(170, 150, 34, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#5f8fa8';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(20, 40);
      g.bezierCurveTo(70, 0, 110, 80, 160, 30);
      g.stroke();
    } else {
      // Boş çerçeve: Kemal'in resmini bekler
      g.fillStyle = '#f7f3ea';
      g.fillRect(0, 0, w, h);
    }
  });
}

export const TABLO_YUKSEKLIGI = 1.75;
function Tablo({ esya }: { esya: Esya }) {
  const doku = useMemo(() => tabloDokusu(esya), [esya]);
  return (
    <group position={[0, TABLO_YUKSEKLIGI, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.82, 0.66, 0.05]} />
        <meshStandardMaterial color={esya === 'tabloBos' ? renk.ahsapAcik : renk.ahsapKoyu} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.027]}>
        <planeGeometry args={[0.7, 0.55]} />
        <meshStandardMaterial map={doku} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Duvar lambası: pirinç kol, krem abajur, sıcak ampul; zayıf, yakına vuran ışık
// (telefonda ağır olmasın diye kısa menzil)
function Aplik() {
  return (
    <group position={[0, TABLO_YUKSEKLIGI + 0.25, 0]}>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.12, 0.18, 0.03]} />
        <meshStandardMaterial color="#b98a3e" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
        <meshStandardMaterial color="#b98a3e" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0.24]}>
        <cylinderGeometry args={[0.07, 0.12, 0.14, 12, 1, true]} />
        <meshStandardMaterial color="#fbefd8" emissive="#ffd99a" emissiveIntensity={0.5} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.01, 0.24]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#fff3c4" emissive="#ffd98a" emissiveIntensity={1.4} />
      </mesh>
      <pointLight position={[0, -0.05, 0.35]} color="#ffd9a0" intensity={1.2} distance={3.2} decay={2} />
    </group>
  );
}

export function IcSus({ esya }: { esya: Esya }) {
  if (esya === 'aplik') return <Aplik />;
  return esya.startsWith('tablo') ? <Tablo esya={esya} /> : <Hali esya={esya} />;
}
