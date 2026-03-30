import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft, Layers, AlertCircle, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight,
  Info, Trash2, Loader2, Box, Home, Link as LinkIcon
} from 'lucide-react';
import api from '../api/axios';

/* === CONSTANTS === */
const REAL_WIDTH_M = 12;
const REAL_DEPTH_M = 9;
const WALL_HEIGHT_M = 3;
const WALL_THICK_M = 0.18;

/* === THREE.JS SCENE COMPONENTS === */

/**
 * Wall3D — renders as segmented boxes with real physical gaps where
 * openings (doors/windows) are placed. Lintels and window sills are kept.
 */
function Wall3D({ wall, openings, selected, onClick }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.emissiveIntensity = selected
          ? 0.25 + 0.18 * Math.sin(clock.elapsedTime * 3)
          : 0;
      }
    });
  });

  const color = selected ? '#3b82f6' : (wall.material_color_hex || '#8B5E3C');
  const emissive = selected ? '#3b82f6' : '#000000';
  const wallLen = wall.geometry.width * REAL_WIDTH_M;
  const wallH = wall.geometry.height * WALL_HEIGHT_M;
  const wallD = Math.max(wall.geometry.depth * REAL_DEPTH_M, WALL_THICK_M);
  const px = wall.position[0] * REAL_WIDTH_M;
  const py = wall.position[1] * WALL_HEIGHT_M;
  const pz = wall.position[2] * REAL_DEPTH_M;

  const myOpenings = useMemo(() =>
    (openings || [])
      .filter(o => o.wall_id === wall.id)
      .map(o => ({
        t: o.t_along_wall ?? 0.5,
        halfW: Math.max(0.4, (o.width || 0) * REAL_WIDTH_M / 2),
        type: o.type,
      }))
      .sort((a, b) => a.t - b.t),
    [openings, wall.id]);

  const segments = useMemo(() => {
    const segs = [];
    let cur = 0;
    for (const { t, halfW } of myOpenings) {
      const ht = halfW / wallLen;
      const s = Math.max(0, t - ht);
      const e = Math.min(1, t + ht);
      if (s > cur + 0.01) segs.push([cur, s]);
      cur = e;
    }
    if (cur < 0.99) segs.push([cur, 1.0]);
    return segs.length ? segs : [[0, 1]];
  }, [myOpenings, wallLen]);

  const mat = { color, emissive, emissiveIntensity: 0, roughness: 0.72, metalness: 0.04 };

  return (
    <group
      ref={groupRef}
      position={[px, py, pz]}
      rotation={[0, wall.rotation_y, 0]}
      onClick={e => { e.stopPropagation(); onClick(wall.id); }}
    >
      {segments.map(([t0, t1], i) => (
        <mesh key={i} position={[((t0 + t1) / 2 - 0.5) * wallLen, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[(t1 - t0) * wallLen, wallH, wallD]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}

      {/* Lintel over every opening */}
      {myOpenings.map(({ t, halfW, type }, i) => {
        const capY = type === 'door' ? 0.733 : 0.833;
        const lH = type === 'door' ? 0.18 : 0.14;
        const offY = capY * wallH - wallH / 2 + lH / 2;
        return (
          <mesh key={`l${i}`} position={[(t - 0.5) * wallLen, offY, 0]} castShadow>
            <boxGeometry args={[halfW * 2 + 0.04, lH, wallD + 0.01]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        );
      })}

      {/* Sill under window openings */}
      {myOpenings.filter(o => o.type === 'window').map(({ t, halfW }, i) => (
        <mesh key={`s${i}`} position={[(t - 0.5) * wallLen, 0.333 * wallH - wallH / 2 - 0.07, 0]} castShadow>
          <boxGeometry args={[halfW * 2 + 0.04, 0.12, wallD + 0.01]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
    </group>
  );
}

/** Door3D — wooden panel with recessed detail, brass handle, and jamb frames */
function Door3D({ opening }) {
  const px = opening.position[0] * REAL_WIDTH_M;
  const pz = opening.position[2] * REAL_DEPTH_M;
  const ry = opening.wall_orient === 'horizontal' ? 0 : Math.PI / 2;
  const doorW = Math.max(0.8, (opening.width || 0) * REAL_WIDTH_M);
  const doorH = Math.max(2.1, ((opening.height_end || 0.733) - (opening.height_start || 0)) * WALL_HEIGHT_M);

  return (
    <group position={[px, 0, pz]} rotation={[0, ry, 0]}>
      {/* Main slab */}
      <mesh position={[0, doorH / 2, WALL_THICK_M * 0.12]} castShadow>
        <boxGeometry args={[doorW - 0.06, doorH - 0.04, 0.04]} />
        <meshStandardMaterial color="#7c5c3e" roughness={0.6} metalness={0.02} />
      </mesh>
      {/* Upper recess */}
      <mesh position={[0, doorH * 0.62, WALL_THICK_M * 0.12 + 0.021]}>
        <boxGeometry args={[doorW * 0.72, doorH * 0.3, 0.01]} />
        <meshStandardMaterial color="#5e3e22" roughness={0.7} />
      </mesh>
      {/* Lower recess */}
      <mesh position={[0, doorH * 0.22, WALL_THICK_M * 0.12 + 0.021]}>
        <boxGeometry args={[doorW * 0.72, doorH * 0.3, 0.01]} />
        <meshStandardMaterial color="#5e3e22" roughness={0.7} />
      </mesh>
      {/* Handle knob */}
      <mesh position={[doorW * 0.36, doorH * 0.45, WALL_THICK_M * 0.12 + 0.045]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#c8a832" roughness={0.15} metalness={0.9} />
      </mesh>
      {/* Handle bar */}
      <mesh position={[doorW * 0.36, doorH * 0.42, WALL_THICK_M * 0.12 + 0.045]}>
        <boxGeometry args={[0.02, 0.13, 0.025]} />
        <meshStandardMaterial color="#c8a832" roughness={0.15} metalness={0.9} />
      </mesh>
      {/* Left jamb */}
      <mesh position={[-doorW / 2 - 0.045, doorH / 2, 0]} castShadow>
        <boxGeometry args={[0.08, doorH + 0.08, WALL_THICK_M + 0.02]} />
        <meshStandardMaterial color="#5a3e28" roughness={0.75} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[doorW / 2 + 0.045, doorH / 2, 0]} castShadow>
        <boxGeometry args={[0.08, doorH + 0.08, WALL_THICK_M + 0.02]} />
        <meshStandardMaterial color="#5a3e28" roughness={0.75} />
      </mesh>
    </group>
  );
}

/** Window3D — aluminium frame + centre mullion + blue glass pane */
function Window3D({ opening }) {
  const px = opening.position[0] * REAL_WIDTH_M;
  const pz = opening.position[2] * REAL_DEPTH_M;
  const ry = opening.wall_orient === 'horizontal' ? 0 : Math.PI / 2;
  const winW = Math.max(0.6, (opening.width || 0) * REAL_WIDTH_M);
  const sillY = (opening.height_start || 0.333) * WALL_HEIGHT_M;
  const topY = (opening.height_end || 0.833) * WALL_HEIGHT_M;
  const winH = topY - sillY;
  const midY = sillY + winH / 2;
  const fm = { color: '#9ca3af', roughness: 0.35, metalness: 0.6 };

  return (
    <group position={[px, 0, pz]} rotation={[0, ry, 0]}>
      <mesh position={[0, midY, 0]}>
        <boxGeometry args={[winW - 0.1, winH - 0.1, 0.015]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.32} roughness={0.04} metalness={0.12} />
      </mesh>
      <mesh position={[-winW / 2 + 0.03, midY, 0]}><boxGeometry args={[0.06, winH, WALL_THICK_M + 0.02]} /><meshStandardMaterial {...fm} /></mesh>
      <mesh position={[winW / 2 - 0.03, midY, 0]}><boxGeometry args={[0.06, winH, WALL_THICK_M + 0.02]} /><meshStandardMaterial {...fm} /></mesh>
      <mesh position={[0, topY - 0.03, 0]}><boxGeometry args={[winW, 0.06, WALL_THICK_M + 0.02]} /><meshStandardMaterial {...fm} /></mesh>
      <mesh position={[0, sillY + 0.03, 0]}><boxGeometry args={[winW, 0.06, WALL_THICK_M + 0.02]} /><meshStandardMaterial {...fm} /></mesh>
      <mesh position={[0, midY, 0.005]}><boxGeometry args={[0.04, winH, 0.03]} /><meshStandardMaterial {...fm} /></mesh>
    </group>
  );
}

/** Room floor slab */
function Room3D({ room }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    room.geometry.vertices.forEach(([x, , z], i) => {
      i === 0 ? shape.moveTo(x * REAL_WIDTH_M, z * REAL_DEPTH_M)
        : shape.lineTo(x * REAL_WIDTH_M, z * REAL_DEPTH_M);
    });
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [room]);
  return (
    <mesh geometry={geo} receiveShadow position={[0, 0.01, 0]}>
      <meshStandardMaterial color="#f0ebe3" roughness={0.9} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** BuildingPerimeter3D — extrudes the outer building boundary polygon into walls */
function BuildingPerimeter3D({ perimeter }) {
  const segments = useMemo(() => {
    if (!perimeter || perimeter.length < 3) return [];
    const segs = [];
    for (let i = 0; i < perimeter.length; i++) {
      const [x1, , z1] = perimeter[i];
      const [x2, , z2] = perimeter[(i + 1) % perimeter.length];
      const wx = x1 * REAL_WIDTH_M;
      const wz = z1 * REAL_DEPTH_M;
      const ex = x2 * REAL_WIDTH_M;
      const ez = z2 * REAL_DEPTH_M;
      const len = Math.hypot(ex - wx, ez - wz);
      if (len < 0.1) continue;
      const cx = (wx + ex) / 2;
      const cz = (wz + ez) / 2;
      const angle = Math.atan2(ez - wz, ex - wx);
      segs.push({ cx, cz, len, angle });
    }
    return segs;
  }, [perimeter]);

  return (
    <group>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={[seg.cx, WALL_HEIGHT_M / 2, seg.cz]}
          rotation={[0, -seg.angle, 0]}
          castShadow receiveShadow
        >
          <boxGeometry args={[seg.len, WALL_HEIGHT_M, WALL_THICK_M]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.72} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

/** Building ground slab */
function GroundSlab({ walls }) {
  const pos = useMemo(() => {
    if (!walls.length) return null;
    const xs = walls.map(w => w.position[0]);
    const zs = walls.map(w => w.position[2]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2 * REAL_WIDTH_M, 0,
    (Math.min(...zs) + Math.max(...zs)) / 2 * REAL_DEPTH_M];
  }, [walls]);
  if (!pos) return null;
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[REAL_WIDTH_M * 1.2, REAL_DEPTH_M * 1.2]} />
      <meshStandardMaterial color="#e2dbd0" roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Full 3D scene */
function FloorPlanScene({ sceneJson, selectedWall, onWallClick }) {
  const walls = sceneJson?.walls || [];
  const rooms = sceneJson?.rooms || [];
  const openings = sceneJson?.openings || [];
  const perimeter = sceneJson?.perimeter || [];
  const doors = openings.filter(o => o.type === 'door');
  const windows = openings.filter(o => o.type === 'window');

  // Only render non-boundary walls as Wall3D (boundary walls handled by BuildingPerimeter3D)
  const interiorWalls = perimeter.length > 2
    ? walls.filter(w => !w.id?.startsWith('bw'))
    : walls;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 18, 10]} intensity={1.4} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-8, 12, -8]} intensity={0.4} />
      <hemisphereLight skyColor="#dbeafe" groundColor="#78716c" intensity={0.3} />
      <color attach="background" args={['#111827']} />
      <GroundSlab walls={walls} />
      <Grid
        position={[REAL_WIDTH_M / 2, -0.01, REAL_DEPTH_M / 2]}
        args={[REAL_WIDTH_M * 1.5, REAL_DEPTH_M * 1.5]}
        cellSize={1} cellThickness={0.4} cellColor="#374151"
        sectionSize={5} sectionThickness={0.8} sectionColor="#4b5563"
        fadeDistance={60} infiniteGrid
      />
      {/* Building perimeter — contour-based exact outline */}
      {perimeter.length > 2 && <BuildingPerimeter3D perimeter={perimeter} />}
      {rooms.map(r => <Room3D key={r.id} room={r} />)}
      {interiorWalls.map(w => (
        <Wall3D key={w.id} wall={w} openings={openings}
          selected={selectedWall === w.id} onClick={onWallClick} />
      ))}
      {doors.slice(0, 40).map(o => <Door3D key={o.id} opening={o} />)}
      {windows.slice(0, 40).map(o => <Window3D key={o.id} opening={o} />)}
    </>
  );
}

const SEVERITY_STYLE = {
  critical: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', Icon: AlertCircle },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', Icon: AlertTriangle },
  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', Icon: Info },
};

function FlagCard({ flag }) {
  const s = SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.info;
  const { Icon } = s;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
    }}>
      <Icon style={{ width: 15, height: 15, color: s.text, marginTop: 2, flexShrink: 0 }} />
      <div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: s.text,
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {flag.severity}
        </span>
        <p style={{ margin: 0, fontSize: 12.5, color: '#374151', lineHeight: 1.5, marginTop: 2 }}>
          {flag.message}
        </p>
      </div>
    </div>
  );
}

function WallCard({ wall, material, explanation, selected, onClick }) {
  const typeColor = {
    load_bearing_outer: '#78350f',
    load_bearing_spine: '#92400e',
    partition: '#1e3a5f',
  }[wall.structural_type] || '#374151';

  const typeBg = {
    load_bearing_outer: '#fef3c7',
    load_bearing_spine: '#ffedd5',
    partition: '#dbeafe',
  }[wall.structural_type] || '#f3f4f6';

  const rankedOptions = material?.ranked_options || [];

  return (
    <div
      onClick={onClick}
      style={{
        border: `1.5px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: 10, marginBottom: 8,
        background: selected ? '#eff6ff' : '#fff',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px #bfdbfe' : 'none',
        transition: 'all .15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '10px 12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: wall.material_color_hex || '#8B5E3C', flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(0,0,0,.1)',
            }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
              Wall {wall.id}
            </span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: typeColor,
            background: typeBg, borderRadius: 4, padding: '2px 7px',
          }}>
            {wall.structural_type.replace(/_/g, ' ')}
          </span>
          {material?.span_m && (
            <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 6 }}>
              ~{material.span_m} m
            </span>
          )}
        </div>
        {selected
          ? <ChevronDown style={{ width: 16, color: '#3b82f6' }} />
          : <ChevronRight style={{ width: 16, color: '#9ca3af' }} />}
      </div>

      {selected && (
        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          {/* Plain-language explanation */}
          {explanation && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 6, padding: '8px 10px', marginBottom: 10,
              fontSize: 11.5, color: '#1e3a8a', lineHeight: 1.6,
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#3b82f6' }}>
                Why this material?
              </p>
              {explanation}
            </div>
          )}

          {/* Ranked material options table */}
          {rankedOptions.length > 0 ? (
            <>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px'
              }}>
                Ranked Material Options
              </p>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#9ca3af', fontSize: 10, textAlign: 'left' }}>
                    <th style={{ paddingBottom: 3 }}>#</th>
                    <th>Material</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'center' }}>S/D/C</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedOptions.map((opt, i) => (
                    <tr key={opt.name} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '3px 4px 3px 0', color: i === 0 ? '#059669' : '#9ca3af', fontWeight: 700 }}>
                        {i === 0 ? '⭐' : `${i + 1}.`}
                      </td>
                      <td style={{ fontWeight: i === 0 ? 700 : 400, color: '#111827', paddingRight: 6 }}>{opt.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>{opt.tradeoff_score}</td>
                      <td style={{ textAlign: 'center', color: '#6b7280' }}>{opt.strength}/{opt.durability}/{opt.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 9.5, color: '#9ca3af', margin: '6px 0 0', fontStyle: 'italic' }}>
                Score = w·Strength + w·Durability − w·Cost (weights vary by type)
              </p>
            </>
          ) : material && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#6b7280' }}>Strength / Durability / Cost</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>
                {material.score.strength} / {material.score.durability} / {material.score.cost}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function AnalysisViewer() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWall, setSelectedWall] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [camTarget, setCamTarget] = useState([REAL_WIDTH_M / 2, 0, REAL_DEPTH_M / 2]);

  // ── Fetch analysis from backend ──────────────────────────────────
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data } = await api.get(`/analysis/${id}`);
        if (data.success) {
          setAnalysis(data.analysis);
        } else {
          setError('Analysis not found.');
        }
      } catch {
        setError('Failed to load analysis from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  // ── Derive data sources ──────────────────────────────────────────
  const report = analysis?.report || {};
  const sceneJson = report?.sceneJson || {};
  const walls = sceneJson?.walls || [];
  const materials = report?.materials || [];
  const flags = analysis?.structuralFlags || report?.structuralFlags || [];
  const explainability = report?.explainability || {};
  const wallExplanationMap = useMemo(() => {
    const map = {};
    (explainability.wall_explanations || []).forEach(e => { map[e.wallId] = e.explanation; });
    return map;
  }, [explainability]);
  const imageUrl = analysis?.imageUrl
    ? `http://localhost:5010${analysis.imageUrl}`
    : null;

  // Camera target: centroid of all walls
  useEffect(() => {
    if (walls.length > 0) {
      let sumX = 0, sumZ = 0;
      walls.forEach(w => { sumX += w.position[0]; sumZ += w.position[2]; });
      setCamTarget([
        (sumX / walls.length) * REAL_WIDTH_M,
        0,
        (sumZ / walls.length) * REAL_DEPTH_M,
      ]);
    }
  }, [walls]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/analysis/${id}`);
      navigate('/dashboard');
    } catch {
      alert('Delete failed.');
      setDeleting(false);
    }
  };

  const toggleWall = (wid) => setSelectedWall(prev => prev === wid ? null : wid);

  // ── Loading / error states ───────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid #1e3a5f', borderTopColor: '#3b82f6',
        animation: 'spin .8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) }}`}</style>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff'
    }}>
      <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', marginBottom: 12 }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{error}</h2>
      <button onClick={() => navigate('/dashboard')} style={{
        marginTop: 8, color: '#60a5fa', background: 'none',
        border: 'none', cursor: 'pointer', fontSize: 14,
      }}>← Back to Dashboard</button>
    </div>
  );

  const selectedMat = materials.find(m => m.wallId === selectedWall);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', overflow: 'hidden', background: '#0f172a'
    }}>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header style={{
        height: 56, background: '#0f172a', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
          }}>
            <ArrowLeft style={{ width: 16 }} /> Dashboard
          </button>
          <span style={{ color: '#334155', fontSize: 16 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers style={{ width: 15, color: '#3b82f6' }} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>
              Analysis #{id?.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {analysis?.stellarTxHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${analysis.stellarTxHash}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none'
              }}
            >
              <LinkIcon style={{ width: 12 }} /> Immutable Proof
            </a>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: 20, background: '#022c22', color: '#34d399',
            border: '1px solid #064e3b',
          }}>
            <CheckCircle2 style={{ width: 10, display: 'inline', marginRight: 4 }} />
            Completed
          </span>
          <button onClick={handleDelete} disabled={deleting} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#7f1d1d', color: '#fca5a5', border: 'none',
            borderRadius: 6, padding: '5px 10px', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>
            {deleting
              ? <Loader2 style={{ width: 13, animation: 'spin .8s linear infinite' }} />
              : <Trash2 style={{ width: 13 }} />}
            Delete
          </button>
        </div>
      </header>

      {/* ── Main Layout ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left Panel */}
        <aside style={{
          width: 340, background: '#0f172a', borderRight: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ padding: '16px 14px', overflowY: 'auto', flex: 1 }}>

            {/* Floor plan thumbnail */}
            {imageUrl && (
              <div style={{
                borderRadius: 10, overflow: 'hidden', marginBottom: 16,
                border: '1px solid #1e293b'
              }}>
                <img src={imageUrl} alt="Floor plan"
                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8, marginBottom: 16
            }}>
              {[
                { label: 'Walls', value: walls.length, icon: Box },
                { label: 'Rooms', value: sceneJson?.rooms?.length || 0, icon: Home },
                { label: 'Openings', value: sceneJson?.openings?.length || 0, icon: Layers },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{
                  background: '#1e293b', borderRadius: 8, padding: '10px 8px',
                  textAlign: 'center', border: '1px solid #334155',
                }}>
                  <Icon style={{ width: 14, color: '#60a5fa', marginBottom: 4 }} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Structural Flags */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{
                fontSize: 10, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <AlertTriangle style={{ width: 12 }} /> Structural Flags
              </h3>
              {flags.length === 0 ? (
                <div style={{
                  background: '#022c22', border: '1px solid #064e3b',
                  borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CheckCircle2 style={{ width: 14, color: '#34d399' }} />
                  <span style={{ fontSize: 12.5, color: '#6ee7b7', fontWeight: 500 }}>
                    No structural anomalies detected
                  </span>
                </div>
              ) : (
                flags.map((f, i) => <FlagCard key={i} flag={f} />)
              )}
            </div>

            {/* Wall breakdown */}
            <h3 style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Box style={{ width: 12 }} /> Wall Breakdown
            </h3>
            {/* Structure-level summary from explainability */}
            {explainability.summary && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '1px solid #86efac', borderRadius: 8,
                padding: '10px 12px', marginBottom: 10,
                fontSize: 11.5, color: '#14532d', lineHeight: 1.6,
              }}>
                <p style={{
                  margin: '0 0 4px', fontWeight: 700, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a'
                }}>
                  Structure Summary
                </p>
                {explainability.summary}
              </div>
            )}
            {walls.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No walls in this analysis
              </p>
            ) : (
              walls.map(w => {
                const mat = materials.find(m => m.wallId === w.id);
                return (
                  <WallCard
                    key={w.id}
                    wall={w}
                    material={mat}
                    explanation={wallExplanationMap[w.id]}
                    selected={selectedWall === w.id}
                    onClick={() => toggleWall(w.id)}
                  />
                );
              })
            )}
          </div>
        </aside>

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Overlay legend */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            background: 'rgba(15,23,42,.75)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>Legend</span>
            {[
              { color: '#8B5E3C', label: 'Load-bearing outer' },
              { color: '#A0714F', label: 'Load-bearing spine' },
              { color: '#D4C5A9', label: 'Partition' },
              { color: '#34d399', label: 'Door opening' },
              { color: '#60a5fa', label: 'Window opening' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: color, flexShrink: 0
                }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Controls hint */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 10,
            background: 'rgba(15,23,42,.75)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 6,
            padding: '5px 10px', fontSize: 11, color: '#475569', fontFamily: 'monospace',
          }}>
            Drag: Orbit · Scroll: Zoom · Right-drag: Pan
          </div>

          {walls.length === 0 && !loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#475569', fontSize: 14, gap: 8,
            }}>
              <Layers style={{ width: 32, color: '#334155' }} />
              <span>No 3D geometry to display</span>
              <span style={{ fontSize: 11, color: '#334155' }}>
                The parser returned no walls for this image
              </span>
            </div>
          )}

          <Canvas
            shadows
            camera={{
              position: [
                camTarget[0],
                WALL_HEIGHT_M * 3,
                camTarget[2] + REAL_DEPTH_M * 0.9,
              ],
              fov: 50,
              near: 0.1,
              far: 500,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <FloorPlanScene
              sceneJson={sceneJson}
              selectedWall={selectedWall}
              onWallClick={toggleWall}
            />
            <OrbitControls
              target={camTarget}
              makeDefault
              enableDamping
              dampingFactor={0.06}
              minDistance={2}
              maxDistance={80}
            />
          </Canvas>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
