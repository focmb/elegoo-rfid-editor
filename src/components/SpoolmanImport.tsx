import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { fuzzyMatchSubtype } from '../lib/materials';

interface SpoolmanFilament {
  name?: string;
  material?: string;
  vendor?: { name?: string };
  color_hex?: string;
  multi_color_hexes?: string;
  weight?: number;
  diameter?: number;
  settings_extruder_temp?: number;
}

interface SpoolmanSpool {
  id: number;
  filament?: SpoolmanFilament;
  remaining_weight?: number;
  location?: string;
}

export interface SpoolmanImportFields {
  material: string;
  subtype: string;
  color: { r: number; g: number; b: number };
  weight: number;
  diameter: number;
  minTemp: number;
  maxTemp: number;
}

// Reasonable default nozzle-temp ranges per material family, used when Spoolman
// doesn't give us an explicit range (only possibly a single recommended extruder temp).
const DEFAULT_TEMP_RANGES: Record<string, [number, number]> = {
  PLA: [190, 220], PETG: [230, 250], ABS: [230, 260], TPU: [210, 230], PA: [250, 280],
  CPE: [240, 260], PC: [260, 300], PVA: [190, 220], ASA: [240, 260], BVOH: [190, 220],
  EVA: [200, 230], HIPS: [220, 250], PP: [210, 240], PPA: [250, 280], PPS: [280, 310],
};

function hexToColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function mapSpoolToFields(spool: SpoolmanSpool): { fields: SpoolmanImportFields; matchedLabel: string; matched: boolean } {
  const fil = spool.filament || {};
  const match = fuzzyMatchSubtype(fil.material || '');

  const material = match?.material || 'PLA';
  const subtype = match?.subtype || 'PLA';

  const hex = (fil.multi_color_hexes ? fil.multi_color_hexes.split(',')[0] : fil.color_hex) || 'FFFFFF';

  const defaults = DEFAULT_TEMP_RANGES[material] || [190, 220];
  let minTemp = defaults[0];
  let maxTemp = defaults[1];
  if (fil.settings_extruder_temp) {
    minTemp = fil.settings_extruder_temp - 15;
    maxTemp = fil.settings_extruder_temp + 15;
  }

  return {
    fields: {
      material,
      subtype,
      color: hexToColor(hex),
      weight: fil.weight ?? 1000,
      diameter: fil.diameter ?? 1.75,
      minTemp,
      maxTemp,
    },
    matchedLabel: fil.material || 'Unbekannt',
    matched: !!match,
  };
}

const STORAGE_KEY = 'spoolman-import-base-url';

interface SpoolmanImportProps {
  onImport: (fields: SpoolmanImportFields, sourceLabel: string) => void;
  onStatusUpdate: (message: string) => void;
}

export function SpoolmanImport({ onImport, onStatusUpdate }: SpoolmanImportProps) {
  const [baseUrl, setBaseUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [open, setOpen] = useState(() => baseUrl !== '');
  const [spools, setSpools] = useState<SpoolmanSpool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpools = async () => {
    const base = baseUrl.trim().replace(/\/+$/, '');
    if (!base) {
      setError('Bitte Spoolman-URL eingeben.');
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, base);
    } catch {
      // localStorage nicht verfügbar (z.B. Privatmodus) - kein Problem, einfach ohne Persistenz weitermachen
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/v1/spool?archived=false`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SpoolmanSpool[] = await res.json();
      setSpools(data);
      if (data.length === 0) {
        setError('Keine aktiven Spulen gefunden.');
      }
      onStatusUpdate(`Spoolman: ${data.length} Spule(n) geladen`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Verbindung fehlgeschlagen: ${message}. Prüfe die URL und ob Spoolman CORS-Anfragen von dieser Seite erlaubt.`);
      onStatusUpdate(`Spoolman: Verbindung fehlgeschlagen (${message})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (spool: SpoolmanSpool) => {
    const { fields, matchedLabel, matched } = mapSpoolToFields(spool);
    const fil = spool.filament || {};
    const label = `${fil.vendor?.name ? fil.vendor.name + ' ' : ''}${fil.name || fil.material || 'Spule #' + spool.id}`;
    onImport(fields, label);
    onStatusUpdate(
      matched
        ? `Spoolman-Import: "${matchedLabel}" erkannt als ${fields.material} / ${fields.subtype}`
        : `Spoolman-Import: Material "${matchedLabel}" nicht eindeutig erkannt, PLA als Fallback gesetzt - bitte prüfen`
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-bold text-gray-800"
      >
        <span>Import from Spoolman</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://spoolman.local:7912"
              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-elegoo-orange focus:border-transparent font-mono"
            />
            <button
              onClick={loadSpools}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-elegoo-blue text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Spulen laden
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}

          {spools.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {spools.map((spool) => {
                const fil = spool.filament || {};
                const hex = (fil.multi_color_hexes ? fil.multi_color_hexes.split(',')[0] : fil.color_hex) || '999999';
                return (
                  <button
                    key={spool.id}
                    onClick={() => handleSelect(spool)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 border border-gray-200 rounded-md hover:border-elegoo-orange hover:bg-orange-50 transition-colors text-left"
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: `#${hex}` }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-gray-800 truncate">
                        {fil.vendor?.name ? `${fil.vendor.name} - ` : ''}{fil.name || fil.material || `Spule #${spool.id}`}
                      </span>
                      <span className="block text-[11px] text-gray-500 truncate">
                        {fil.material || ''} · {fil.weight ?? '?'} g · Ø {fil.diameter ?? '?'} mm
                        {spool.remaining_weight != null ? ` · noch ${Math.round(spool.remaining_weight)} g` : ''}
                        {spool.location ? ` · ${spool.location}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-500">
            Läd Spulen aus deiner Spoolman-Instanz und füllt Material, Subtyp, Farbe, Gewicht, Durchmesser und
            Temperaturbereich unten automatisch aus. Bitte danach kurz prüfen, bevor du auf einen Tag schreibst.
          </p>
        </div>
      )}
    </div>
  );
}
