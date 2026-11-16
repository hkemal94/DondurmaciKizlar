import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BuzdolabiModeli, KasaYiginiModeli, MutfakRafiModeli, MutfakTezgahiModeli } from './Mutfak';
import {
  esyaSolmasi,
  birimDolu,
  birimDuvarlari,
  birimEngelliKatman,
  birimIcMi,
  dokunmaKatmani,
  durumuOku,
  esyaBirakildi,
  esyaTutuldu,
  noktadakiEsya,
  noktayaKoy,
  suruklemeSuruyor,
  suruklemeyeBasla,
  suruklemeyiBitir,
  suruklemeyiGuncelle,
  useDurum,
  yerlesimiKaldir,
  type Yerlesim,
} from '../oyun/durum';
import { ekrandanSahneye } from './ekranNoktasi';
import {
  DUKKAN_PARSELLERI,
  ESYALAR,
  PARSEL,
  birimCoz,
  birimParseli,
  birimOrtasi,
  esyaOlcusu,
  kapladigiBirimler,
  esyaKatmani,
  esyaRengi,
  esyaOrtasi,
  kenarYeri,
  parselCoz,
  parselSiniri,
  type Esya,
  type Yon,
} from '../oyun/dekorasyon';
import { IcSus, TABLO_YUKSEKLIGI } from './IcSusler';
import { renk } from './renkler';
import { HazirModel } from './HazirModel';
import type { Boya } from './tasarimDili';
import { Bisiklet, CicekKasasi, Flama, IsikliTabela, KaraTahta, KulahFiguru, SeyyarAraba, SokakLambasi } from './DisSusler';

// Dekorasyon (belge bölüm 4; 13 Ekim): ışıklandırma seviyeleri ve
// oyuncunun kareli zemine yerleştirdiği taşınabilir eşyalar.
// Kodla çizilmiş geçici parçalar.

function Fener({ konum }: { konum: [number, number, number] }) {
  return (
    <group position={konum}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#3d3a45" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.28, 0.34, 0.28]} />
        <meshStandardMaterial color="#fff3c4" emissive="#ffd98a" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 2.72, 0]}>
        <coneGeometry args={[0.24, 0.18, 4]} />
        <meshStandardMaterial color="#3d3a45" flatShading />
      </mesh>
    </group>
  );
}

function Semsiye({ renkAdi = renk.mor }: { renkAdi?: string }) {
  // Seçilen renk sarıysa öbür dilimler mor (sarı-sarı olmasın)
  const ikinci = renkAdi === renk.sari || renkAdi === '#ffc928' ? renk.mor : renk.sari;
  const dilimler = 8;
  return (
    <group>
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.5, 6]} />
        <meshStandardMaterial color="#efe6d6" />
      </mesh>
      {Array.from({ length: dilimler }, (_, i) => (
        <mesh key={i} position={[0, 2.35, 0]} rotation={[0, (i / dilimler) * Math.PI * 2, 0]} castShadow>
          <coneGeometry args={[1.25, 0.45, 2, 1, true, 0, (Math.PI * 2) / dilimler]} />
          <meshStandardMaterial color={i % 2 ? ikinci : renkAdi} roughness={0.9} side={2} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// Hazır paketlerden eşyalar (belge 0.7): masa Tiny Treats'ten, örtüsünün
// kareleri bizim mor; sandalyeler eski masadaki yerlerinde (müşteri oturur).
// Örtü ve minder rengi oyuncunun seçtiği renk (belge 0.15e; varsayılan mor)
const ortu = (r: string): Boya[] => [['#3f7fc0', r, 38]];
const minder = (r: string): Boya[] => [['#f9a39e', r, 40]];
function KafeMasasi({ renkAdi = renk.mor }: { renkAdi?: string }) {
  return (
    <group>
      <HazirModel yol="pastane/table_round_B" ayar={{ grup: 'dukkan', yukseklik: 0.72, boya: ortu(renkAdi) }} />
      {[-0.53, 0.53].map((x) => (
        <HazirModel
          key={x}
          yol="pastane/chair"
          ayar={{ grup: 'dukkan', yukseklik: 0.85 }}
          konum={[x, 0, 0]}
          donus={x > 0 ? -Math.PI / 2 : Math.PI / 2}
        />
      ))}
    </group>
  );
}

// Solgunluk (belge 0.15f): eşyanın renkleri güneşte ağarmış bir tona kayar.
// Modeller yüklendikten sonra da tutsun diye arada bir bakılır; malzemeler
// eşyaya özel kopyalanır (öbür eşyalar etkilenmesin).
const SOLGUN = new THREE.Color('#d9d2c4');
function Solgun({ miktar, children }: { miktar: number; children: ReactNode }) {
  const grup = useRef<THREE.Group>(null);
  const sayac = useRef(0);
  useFrame(() => {
    const g = grup.current;
    if (!g || sayac.current++ % 30 !== 0) return;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const liste = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Solmamış ve hiç kopyalanmamış eşyaya dokunulmaz
      if (miktar === 0 && !liste.some((m) => m.userData.solgunKopya)) return;
      const yeni = liste.map((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        if (!mm.color) return m;
        // İlk kez: kopyala, asıl rengi sakla
        const k = mm.userData.solgunKopya ? mm : (mm.clone() as THREE.MeshStandardMaterial);
        if (!k.userData.solgunKopya) {
          k.userData.solgunKopya = true;
          k.userData.asil = mm.color.clone();
        }
        if (k.userData.miktar !== miktar) {
          k.color.copy(k.userData.asil as THREE.Color).lerp(SOLGUN, miktar);
          k.userData.miktar = miktar;
        }
        return k;
      });
      mesh.material = Array.isArray(mesh.material) ? yeni : yeni[0];
    });
  });
  return <group ref={grup}>{children}</group>;
}

export function EsyaModeli({ esya, renkId }: { esya: Esya; renkId?: string }) {
  const secilen = esyaRengi(renkId);
  if (esyaKatmani(esya) !== 'esya') return <IcSus esya={esya} />;
  if (esya === 'saksi') return <HazirModel yol="mobilya/pottedPlant" ayar={{ grup: 'dukkan', yukseklik: 0.95 }} />;
  if (esya === 'masa') return <KafeMasasi renkAdi={secilen} />;
  if (esya === 'bank') return <HazirModel yol="mobilya/benchCushion" ayar={{ grup: 'dukkan', en: 1.15, boya: minder(secilen) }} donus={Math.PI} />;
  if (esya === 'karaTahta') return <KaraTahta />;
  if (esya === 'isikliTabela') return <IsikliTabela />;
  if (esya === 'kulahFiguru') return <KulahFiguru />;
  if (esya === 'flama') return <Flama />;
  if (esya === 'cicekKasasi') return <CicekKasasi />;
  if (esya === 'bisiklet') return <Bisiklet />;
  if (esya === 'copKutusu') return <HazirModel yol="mobilya/trashcan" ayar={{ grup: 'dukkan', yukseklik: 0.8 }} />;
  if (esya === 'sokakLambasi') return <SokakLambasi />;
  if (esya === 'seyyarAraba') return <SeyyarAraba />;
  // Mutfak eşyaları (belge 0.14)
  if (esya === 'buzdolabi') return <BuzdolabiModeli />;
  if (esya === 'mutfakRafi') return <MutfakRafiModeli />;
  if (esya === 'kasaYigini') return <KasaYiginiModeli />;
  if (esya === 'mutfakTezgahi') return <MutfakTezgahiModeli />;
  return (
    <group>
      <KafeMasasi renkAdi={secilen} />
      <Semsiye renkAdi={secilen} />
    </group>
  );
}

// Işıklandırma 2: terasın üstünde iki direk arasında asma ampuller
function AsmaAmpuller() {
  const direkler = [-9, -3, 3, 9];
  const ampuller = [];
  for (let k = 0; k < direkler.length - 1; k++) {
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const x = direkler[k] + (direkler[k + 1] - direkler[k]) * t;
      const y = 2.9 - Math.sin(t * Math.PI) * 0.5;
      ampuller.push(
        <mesh key={`${k}-${i}`} position={[x, y, -6.9]}>
          <sphereGeometry args={[0.07, 6, 4]} />
          <meshStandardMaterial color="#fff3c4" emissive={i % 2 ? '#ffd98a' : '#ffb3e0'} emissiveIntensity={1.6} />
        </mesh>,
      );
    }
  }
  return (
    <group>
      {direkler.map((x) => (
        <mesh key={x} position={[x, 1.5, -6.9]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 3, 6]} />
          <meshStandardMaterial color={renk.ahsapKoyu} />
        </mesh>
      ))}
      {ampuller}
    </group>
  );
}

// Işıklandırma 3: dükkânın önünde ışıklı mor-sarı şerit
function IsikliSerit() {
  return (
    <group position={[0, 0, -2.55]}>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[-3.75 + i * 0.5, 3.0, 0]}>
          <boxGeometry args={[0.46, 0.08, 0.06]} />
          <meshStandardMaterial color={i % 2 ? '#ffc928' : '#9b5fc9'} emissive={i % 2 ? '#ffc928' : '#9b5fc9'} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

// Alınmış açık arazi karesi (dükkânın yanı ya da arkası): taş kaldırımın
// üstüne terasla aynı, 1 m genişlikte ve aynı hizada ahşap tahtalar (belge
// 0.3). Yan yana kareler tek zemin gibi görünür. Ön teras zaten ahşap.
function ParselZemini({ anahtar }: { anahtar: string }) {
  const { i, j } = parselCoz(anahtar);
  const { solX, onZ, arkaZ } = parselSiniri(i, j);
  return (
    <group>
      {Array.from({ length: PARSEL }, (_, n) => {
        const x = solX + n;
        return (
          <mesh key={n} position={[x + 0.5, 0, (onZ + arkaZ) / 2]} receiveShadow>
            <boxGeometry args={[0.96, 0.12, PARSEL]} />
            <meshStandardMaterial color={((x % 2) + 2) % 2 ? renk.ahsapAcik : renk.ahsapOrta} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

// Yerleştirme kareleri (1×1 m): alınmış arazideki boş yerler yeşil görünür.
// Dokunma tek bir görünmez zeminden alınır: konmuş eşyaya dokunulursa o
// kalkar (taşımak için), değilse seçili eşya en yakın sığdığı yere konur.
const yesilKare = new THREE.PlaneGeometry(0.86, 0.86);
const yesilMalzeme = new THREE.MeshBasicMaterial({ color: '#8fe36b', transparent: true, opacity: 0.35, depthWrite: false });

function Kareler() {
  const durum = useDurum();
  // Sürüklenirken yeşil kareler sürüklenen eşyaya göre; eşyanın kendi eski yeri boş sayılır
  const haric = durum.surukleme?.y;
  const esya = haric?.esya ?? durum.seciliEsya;
  const tanim = ESYALAR.find((e) => e.id === esya);
  const disariya = !!tanim?.disari;
  const iceriye = !!tanim?.iceri;
  const katman = esya ? esyaKatmani(esya) : 'esya';
  const kareler: { c: number; r: number; ic: boolean }[] = [];
  if (esya)
    for (const p of durum.parseller) {
      const { i, j } = parselCoz(p);
      for (let a = 0; a < PARSEL; a++)
        for (let b = 0; b < PARSEL; b++) {
          const c = i * PARSEL + a;
          const r = j * PARSEL + b;
          const ic = birimIcMi(c, r, durum);
          // Mutfak eşyası yalnız mutfak karelerinde (belge 0.14)
          const mutfakta = durum.mutfakParseller.includes(birimParseli(c, r));
          if (tanim?.mutfak) {
            if (!mutfakta || birimDolu(c, r, durum, haric, katman)) continue;
            kareler.push({ c, r, ic });
            continue;
          }
          if ((ic && disariya) || (!ic && iceriye) || birimEngelliKatman(c, r, katman, durum) || birimDolu(c, r, durum, haric, katman)) continue;
          // Tablo: yalnız düz duvarın dibindeki kareler
          if (katman === 'duvar' && !birimDuvarlari(c, r, durum).length) continue;
          kareler.push({ c, r, ic });
        }
    }
  return (
    <group>
      {kareler.map(({ c, r, ic }) => {
        const o = birimOrtasi(c, r);
        if (katman === 'duvar') {
          // Tablo: yeşil işaret duvarda, tablonun asılacağı yükseklikte; dokununca oraya asılır
          const { x, z, nx, nz } = kenarYeri(birimDuvarlari(c, r, durum)[0]);
          return (
            <mesh
              key={`${c},${r}`}
              geometry={yesilKare}
              material={yesilMalzeme}
              position={[x - nx * 0.08, TABLO_YUKSEKLIGI, z - nz * 0.08]}
              rotation={[0, Math.atan2(-nx, -nz), 0]}
              onClick={(e) => {
                if (e.delta > 12 || suruklemeSuruyor()) return;
                e.stopPropagation();
                noktayaKoy(o.x, o.z);
              }}
            />
          );
        }
        return <mesh key={`${c},${r}`} geometry={yesilKare} material={yesilMalzeme} position={[o.x, ic ? 0.02 : 0.08, o.z]} rotation={[-Math.PI / 2, 0, 0]} />;
      })}
      <mesh
        position={[0, 0.1, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          if (e.delta > 12 || suruklemeSuruyor()) return; // sürükleme / yakınlaştırma değil
          e.stopPropagation();
          const y = noktadakiEsya(e.point.x, e.point.z);
          if (y) yerlesimiKaldir(y);
          else noktayaKoy(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[90, 26]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <GecersizIsaret />
    </group>
  );
}

// Sığmayan yere dokununca o kare kısa süre kırmızı yanar (16 Kasım 2026)
const kirmiziMalzeme = new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.8, depthWrite: false, depthTest: false });
function GecersizIsaret() {
  const { gecersizYer } = useDurum();
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current || !gecersizYer) return;
    const gecen = performance.now() - gecersizYer.zaman;
    ref.current.visible = gecen < 900;
    kirmiziMalzeme.opacity = 0.8 * Math.max(0, 1 - gecen / 900);
  });
  if (!gecersizYer) return null;
  const o = birimOrtasi(gecersizYer.c, gecersizYer.r);
  return <mesh ref={ref} geometry={yesilKare} material={kirmiziMalzeme} position={[o.x, 0.1, o.z]} rotation={[-Math.PI / 2, 0, 0]} />;
}

// Sürüklenen eşyanın altındaki kareler: sığıyorsa yeşil, sığmıyorsa kırmızı
const izKaresi = new THREE.PlaneGeometry(0.96, 0.96);
const izYesil = new THREE.MeshBasicMaterial({ color: '#6dff4f', transparent: true, opacity: 0.85, depthWrite: false });
const izKirmizi = new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.85, depthWrite: false });
function SurukleIzi({ y, c, r, sigar }: { y: Yerlesim; c: number; r: number; sigar: boolean }) {
  return (
    <group>
      {kapladigiBirimler(y.esya, c, r, y.yon).map((b) => {
        const o = birimOrtasi(b.c, b.r);
        return (
          <mesh key={`${b.c},${b.r}`} geometry={izKaresi} material={sigar ? izYesil : izKirmizi} position={[o.x, 0.12, o.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} />
        );
      })}
    </group>
  );
}

// Parmakla sürükleme (16 Kasım 2026, telefon denemesi): konmuş eşyaya basılan
// parmak 10 pikselden çok kayınca eşya parmakla gider. Eşya parmağın biraz
// üstünde durur ki parmak onu ve altındaki kareleri kapatmasın.
const SURUKLEME_ESIGI = 10; // piksel
const PARMAK_USTU = 44; // piksel: dokunmatikte eşya parmağın bu kadar üstünde
let tutma: { y: Yerlesim; parmak: number; x: number; yEkran: number; dokunmatik: boolean; basladi: boolean } | null = null;
function esyayaBasildi(y: Yerlesim, e: { pointerId: number; nativeEvent: PointerEvent }) {
  const p = ekrandanSahneye(e.nativeEvent.clientX, e.nativeEvent.clientY);
  tutma = { y, parmak: e.pointerId, x: p.x, yEkran: p.y, dokunmatik: e.nativeEvent.pointerType !== 'mouse', basladi: false };
  esyaTutuldu(e.pointerId);
}

function EsyaSurukleyici() {
  const kamera = useThree((s) => s.camera);
  const boyut = useThree((s) => s.size);
  const ref = useRef({ kamera, boyut });
  ref.current = { kamera, boyut };
  useEffect(() => {
    const isin = new THREE.Raycaster();
    const zemin = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const nokta = new THREE.Vector3();
    const ekran = new THREE.Vector2();
    const oynat = (e: PointerEvent) => {
      if (!tutma || e.pointerId !== tutma.parmak) return;
      const p = ekrandanSahneye(e.clientX, e.clientY);
      if (!tutma.basladi) {
        if (Math.hypot(p.x - tutma.x, p.y - tutma.yEkran) < SURUKLEME_ESIGI) return;
        tutma.basladi = true;
        suruklemeyeBasla(tutma.y);
      }
      const { kamera: k, boyut: b } = ref.current;
      const yukari = tutma.dokunmatik ? PARMAK_USTU : 0;
      ekran.set((p.x / b.width) * 2 - 1, -((p.y - yukari) / b.height) * 2 + 1);
      isin.setFromCamera(ekran, k);
      if (isin.ray.intersectPlane(zemin, nokta)) suruklemeyiGuncelle(nokta.x, nokta.z);
    };
    const birak = (e: PointerEvent) => {
      if (!tutma || e.pointerId !== tutma.parmak) return;
      const basladi = tutma.basladi;
      tutma = null;
      esyaBirakildi();
      if (basladi) suruklemeyiBitir(e.type === 'pointercancel');
    };
    window.addEventListener('pointermove', oynat);
    window.addEventListener('pointerup', birak);
    window.addEventListener('pointercancel', birak);
    return () => {
      window.removeEventListener('pointermove', oynat);
      window.removeEventListener('pointerup', birak);
      window.removeEventListener('pointercancel', birak);
      tutma = null;
      esyaBirakildi();
      if (durumuOku().surukleme) suruklemeyiBitir(true);
    };
  }, []);
  return null;
}

// Duvar parçasının dönüşü (Dukkan.tsx ile aynı): yerel −z dışarı bakar
const DUVAR_DONUSU: Record<Yon, number> = { g: 0, k: Math.PI, b: Math.PI / 2, d: -Math.PI / 2 };

export function Dekorlar() {
  const durum = useDurum();
  const { isikSeviyesi, yerlesim, yerlestirme, parseller } = durum;
  return (
    <group>
      {parseller
        // Duvarla kapatılan karelerde iç zemin görünür (seçilen zemin, halılar)
        .filter((p) => !DUKKAN_PARSELLERI.includes(p) && parselCoz(p).j >= 0 && !durum.kapaliParseller.includes(p))
        .map((p) => (
          <ParselZemini key={p} anahtar={p} />
        ))}
      {isikSeviyesi >= 1 && (
        <>
          <Fener konum={[-4.6, 0.06, -8.0]} />
          <Fener konum={[4.6, 0.06, -8.0]} />
        </>
      )}
      {isikSeviyesi >= 2 && <AsmaAmpuller />}
      {isikSeviyesi >= 3 && <IsikliSerit />}

      {/* Yere konmuş eşyalar; yerleştirirken dokunulursa kalkar (taşımak için) */}
      {yerlesim.map((y) => {
        const { c, r } = birimCoz(y.hucre);
        const katman = esyaKatmani(y.esya);
        // Yerleştirirken yalnız seçili eşyanın katmanındakiler dokununca kalkar
        // (halının üstüne masa konurken halı kalkmasın)
        const secilen = dokunmaKatmani(durum);
        // Tablolar her zaman tutulur: elde masa seçiliyken duvardaki tablo
        // taşınamıyordu (Kemal, 15 Ekim akşam); duvarda başka katman yok
        const tutulur = yerlestirme && (secilen === null || secilen === katman || katman === 'duvar');
        const tikla = (e: { delta: number; stopPropagation: () => void }) => {
          if (!tutulur || e.delta > 12 || suruklemeSuruyor()) return;
          e.stopPropagation();
          yerlesimiKaldir(y);
        };
        // Basılı tutup kaydırınca sürüklenir (tablolar duvarda, dokunarak taşınır)
        const bas = (e: { pointerId: number; nativeEvent: PointerEvent; stopPropagation: () => void }) => {
          if (!tutulur || katman === 'duvar' || durum.surukleme) return;
          e.stopPropagation();
          esyayaBasildi(y, e);
        };
        const suruklenen = durum.surukleme?.y === y ? durum.surukleme : null;
        if (katman === 'duvar') {
          // Tablo: karenin dibindeki düz duvara asılır; köşede yön hangi duvar olduğunu seçer
          const duvarlar = birimDuvarlari(c, r, durum);
          if (!duvarlar.length) return null;
          const k = duvarlar[y.yon % duvarlar.length];
          const { x, z, nx, nz } = kenarYeri(k);
          return (
            <group key={`${y.hucre}:${y.esya}`} position={[x - nx * 0.06, 0, z - nz * 0.06]} rotation={[0, DUVAR_DONUSU[k.y], 0]} onClick={tikla}>
              <group position={[0, 0, 0.03]}>
                <EsyaModeli esya={y.esya} />
              </group>
              {tutulur && (
                <mesh position={[0, TABLO_YUKSEKLIGI, 0.2]}>
                  <boxGeometry args={[0.9, 0.8, 0.4]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </group>
          );
        }
        // Sürüklenen eşya parmağın götürdüğü karede, biraz havada
        const yc = suruklenen ? suruklenen.c : c;
        const yr = suruklenen ? suruklenen.r : r;
        const o = esyaOrtasi(y.esya, yc, yr, y.yon);
        const { en, boy } = esyaOlcusu(y.esya, y.yon);
        const ic = birimIcMi(yc, yr, durum);
        return (
          <group key={`${y.hucre}:${y.esya}`}>
            {suruklenen && <SurukleIzi y={y} c={suruklenen.c} r={suruklenen.r} sigar={suruklenen.sigar} />}
            <group position={[o.x, (ic ? 0 : 0.06) + (suruklenen ? 0.25 : 0), o.z]} onClick={tikla} onPointerDown={bas}>
              <Solgun miktar={esyaSolmasi(y, durum)}>
                <group rotation={[0, (y.yon * Math.PI) / 2, 0]}>
                  <EsyaModeli esya={y.esya} renkId={y.renk} />
                </group>
              </Solgun>
              {/* Yerleştirirken eşyayı kolay tutmak için görünmez kutu (halıda yassı) */}
              {tutulur && (
                <mesh position={[0, katman === 'zemin' ? 0.05 : 0.8, 0]}>
                  <boxGeometry args={[en * 0.98, katman === 'zemin' ? 0.1 : 1.6, boy * 0.98]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}

      {yerlestirme && <Kareler />}
      {yerlestirme && <EsyaSurukleyici />}
    </group>
  );
}
