// Sinh lại file dữ liệu đơn vị hành chính VN (2 cấp) cho module location.
// Chạy: node scripts/gen-locations.mjs
// Nguồn: thanglequoc/vietnamese-provinces-database (MIT), cập nhật theo NĐ 30/2026.
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/vn_only_simplified_json_generated_data_vn_units_minified.json';
const OUT = path.resolve('src/location/data/vn-units.ts');

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Tải dữ liệu thất bại: ${res.status}`);
const raw = await res.json();

const provinces = raw
  .map((p) => ({ code: p.Code, name: p.FullName }))
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

const wards = [];
for (const p of raw) {
  for (const w of p.Wards ?? []) {
    wards.push({ code: w.Code, name: w.FullName, provinceCode: p.Code });
  }
}

const header =
  `// AUTO-GENERATED — dữ liệu đơn vị hành chính VN (2 cấp: Tỉnh → Phường/Xã)\n` +
  `// Nguồn: https://github.com/thanglequoc/vietnamese-provinces-database (MIT)\n` +
  `// Cập nhật theo nghị định 30/2026. KHÔNG sửa tay — chạy scripts/gen-locations.mjs.\n\n` +
  `export interface ProvinceRecord { code: string; name: string }\n` +
  `export interface WardRecord { code: string; name: string; provinceCode: string }\n\n`;
const body =
  `export const PROVINCES: ProvinceRecord[] = ${JSON.stringify(provinces)};\n\n` +
  `export const WARDS: WardRecord[] = ${JSON.stringify(wards)};\n`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + body);
console.log(`Đã ghi ${OUT}: ${provinces.length} tỉnh, ${wards.length} phường/xã.`);
