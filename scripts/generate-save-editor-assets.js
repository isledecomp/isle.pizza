#!/usr/bin/env node
// Scans LEGO Island SI files to extract embedded assets into a packed binary bundle.
// Writes save-editor.bin: [U32LE index length][JSON index][fragment data].

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// [name, objectId, size, md5]
const ANIMATIONS = [
  ['CNs001Bd', 223, 657, 'eec976da0035968ee65cde2444d66fdd'],
  ['CNs001Br', 207, 1617, 'ca07df295c5146da01efd57aa42e6f43'],
  ['CNs001La', 179, 1335, '2f3c2d17a404e3ee06e24c9b79a5bc93'],
  ['CNs001Ma', 117, 1545, '6d7eb4527cab9d589f61e931f76a7ccf'],
  ['CNs001Ni', 145, 1233, '8777efe8556288cedba7ac67ae5b8e75'],
  ['CNs001Pa', 131, 1277, '222c7c997e79d77228c3607ed6ff9754'],
  ['CNs001Pe', 107, 1209, 'f0057004a852fb8a6385c075bcb425f8'],
  ['CNs001Pg', 224, 657, 'c9293ae1cadcd769c57f16d721189cbe'],
  ['CNs001Rd', 225, 657, 'cb6c0ec1203b644f16451f7caf5538e9'],
  ['CNs001Sk', 227, 1590, 'b9e19a58b4a6d8bb9e63a12af08ce5ee'],
  ['CNs001Sy', 226, 657, '986645d7598ba921113aef9d72ff74fd'],
  ['CNs001xx', 80, 1101, '79a32fb54e881403cf785caf2f07fb99'],
  ['CNs002Br', 208, 1393, 'f489e8ae4ed591f35738a9f4d1259450'],
  ['CNs002La', 196, 1447, '0738817ecc1ed6afc8c605537afbcbc9'],
  ['CNs002Ma', 118, 1461, 'b8b1a40dd9ee102de0724fa4f0fa4047'],
  ['CNs002Ni', 146, 1201, '6e761fa60aea9e5c8d37ffa39a3aaf24'],
  ['CNs002Pa', 132, 1149, '7774a58da0fc3d3dd9bdaec4a4feebcb'],
  ['CNs002Pe', 108, 1065, '1bcb02590f35c2fc7a248fcfb00e6e58'],
  ['CNs002xx', 87, 1472, '9541d8c34615d28998985de01cbc7dfd'],
  ['CNs003Br', 209, 1497, 'a2d6094d7f4da36772d7d4a739a2831c'],
  ['CNs003La', 197, 1675, '7687af38a09b16be8028e73b39b99981'],
  ['CNs003Ma', 119, 1749, '5ca15ea1f1fd84a775b044c6ca068ba1'],
  ['CNs003Ni', 147, 1369, 'd2533306f8ce771d958e2839a0fc0ae9'],
  ['CNs003Pa', 133, 1369, '1fef78d548e65839093d2ff0b1a4460f'],
  ['CNs003Pe', 109, 1373, 'f9815a0266a1c63a3f3518cca85beb49'],
  ['CNs003xx', 88, 1377, 'f61d8fd473121bface739c7a557c05ec'],
  ['CNs004Br', 210, 1741, 'e777c1dabff4f0c756445c588b7c2ef2'],
  ['CNs004La', 198, 2139, '8dc93c005ebcedecbea0db2bdf351434'],
  ['CNs004Ma', 120, 2597, '332eaac68b2fb4244fd62789bc2c5508'],
  ['CNs004Ni', 148, 1853, '8a209f3790a1d9b7b58f8909151de2bf'],
  ['CNs004Pa', 134, 1961, '80bb689a754f174ead41f5b01019a00e'],
  ['CNs004Pe', 110, 1577, '70bf03ce873583554dcc8955ff307975'],
  ['CNs004xx', 89, 1581, '65d27ca748b437676c4a162e7d5a599c'],
  ['CNs005Br', 211, 1373, '837455903a2d23ea77833e9d96697b18'],
  ['CNs005La', 199, 1427, '9b4d20d1bbca5a81ec5805ac768b3f70'],
  ['CNs005Ma', 121, 2117, '8d5bb9ec4905efbc0a0d29b700eeee0d'],
  ['CNs005Ni', 149, 1245, '2696c22fa69a403e5a07406d9425400a'],
  ['CNs005Pa', 135, 1545, '8217a905ce20b4958695c9e5de3fc372'],
  ['CNs005Pe', 111, 1249, 'ed5a06a87baf507ccd35c96407af1da7'],
  ['CNs005xx', 90, 1253, 'bfe52167e229966987552da768ab5e44'],
  ['CNs006Br', 213, 1269, '1d451aee9a06118c5a944750ddf4fedc'],
  ['CNs006La', 201, 1587, '99f0f187b6128626ac2106e010a30373'],
  ['CNs006Ma', 123, 1445, '13f5e003ff05a3d87a7866bcb195fbfc'],
  ['CNs006Ni', 157, 1365, 'e76dbff6c14206cc20bbe02be377ee2f'],
  ['CNs006Pa', 137, 1665, '831badb8a5065d1f64b6123891b7907e'],
  ['CNs006Pe', 113, 1369, '619630dec24433c8f4863c16d09ebc14'],
  ['CNs006xx', 101, 1373, '18a8f17d235c89b5365e6f7a83dc9311'],
  ['CNs007Br', 212, 1353, 'b7ae9c9eb305e75572a472d65683f040'],
  ['CNs007La', 200, 1567, '0a0da9bf5043c1dcb537069f9febbeae'],
  ['CNs007Ma', 122, 1501, '81f94684fb3f508b697ba47af1c6079a'],
  ['CNs007Ni', 156, 1205, 'b228c9b6fce5ce909963b614cd2e4163'],
  ['CNs007Pa', 136, 1293, '2708a4b6e72f62ae96da476e6d67210e'],
  ['CNs007Pe', 112, 1249, '2b2aba18edb8945800203a1c4d985c34'],
  ['CNs007xx', 100, 2144, 'b4be30f4c60a1ecc8b01f4414af14455'],
  ['CNs008Br', 214, 1113, 'b11de30162588dfcc0bf1512469dd72a'],
  ['CNs008La', 202, 1047, '1bad27d6ff48c93bf5c9d476e5d64fbb'],
  ['CNs008Ma', 124, 1045, '4a12974aee2e9f81aa995120b5efd54b'],
  ['CNs008Ni', 158, 1005, 'ad3f7af37af89fe1b29175943cee52c2'],
  ['CNs008Pa', 138, 1305, '075566a5c2905b0126761750488a5f8d'],
  ['CNs008Pe', 114, 1009, 'ea176943a17569bea30695e10e6277f4'],
  ['CNs008xx', 102, 1013, 'b5610e2318eb760a9d6ecd915026edfa'],
  ['CNs009Br', 215, 1005, '4e8633be87a0d3e86018bb79d6df6647'],
  ['CNs009La', 203, 1179, '172d6534981dc3c82a6edf46b0a46a90'],
  ['CNs009Ma', 125, 917, '122d10aceea520188e614f4100cff493'],
  ['CNs009Ni', 159, 1269, 'd075ca06d9bca5509cd01367282d6322'],
  ['CNs009Pa', 139, 1757, '85ee3e3915ed3a81470b30da9985ee94'],
  ['CNs009Pe', 115, 941, '368209e2db8b682b9f5ee8c2449b3c14'],
  ['CNs009xx', 103, 945, '8a15d1553d6d81a0d741c1e11adb5b29'],
  ['CNs010Br', 216, 1469, 'b7c1a5844f0a4710d15c67eed8c19418'],
  ['CNs010La', 204, 1543, '77347221f51e10470ea06d514430663a'],
  ['CNs010Ma', 126, 1493, '846a971fe79f314ef9eb4788776d337d'],
  ['CNs010Ni', 168, 1541, '6e25bd94e5cb76e0acb642d4a52a922f'],
  ['CNs010Pa', 140, 1637, '94be270722ab8a69c6c81c9e0467a97c'],
  ['CNs010Pe', 116, 1465, 'ba3abad56fb12c025840df86ea5ea7b1'],
  ['CNs010xx', 104, 1469, 'aebf4eb621c5eb4b202751c11383d3c9'],
  ['CNs011Br', 217, 1161, '2e0e6495387746460c66a37f6ea4d9b3'],
  ['CNs011La', 205, 798, 'ce98ce48a5396559ee55fb786f122fcc'],
  ['CNs011Ma', 127, 1561, '1a4f6b4d89c9bd867d4433a81423d178'],
  ['CNs011Ni', 169, 699, '0b24eb57d4225b8737bf959aecf14430'],
  ['CNs011Pa', 141, 3747, '94cb14868ed2957db9a156f832221637'],
  ['CNs011xx', 105, 990, '5b09efc169a758325b76e6654f9777e0'],
  ['CNs012Br', 218, 2245, 'b83f53d4361a980de9abb186c3a2806b'],
  ['CNs012Ma', 128, 1593, '17e75f084d52d712012adeb92f7cda54'],
  ['CNs012Pa', 142, 6900, 'e61e78454d7ff3e7bae7def8b3dfa9d6'],
  ['CNs012xx', 106, 1830, '17ab918c42f311064f4e4c3560c93f51'],
  ['CNs013Br', 219, 3417, '8b7482f00475111add6829dcb6434d96'],
  ['CNs013Ma', 129, 3169, '8f017d5092a216d2a32a33e1de4ac118'],
  ['CNs013Pa', 143, 3647, '3e3cf7409b766b80653f8571801ebf71'],
  ['CNs014Br', 220, 3174, '1a47cb0ebd2c812273a5338b8495204f'],
  ['CNs0x4Ma', 130, 2657, '81e016edfb3acdd25fe4cb3a1b74d376'],
  ['CNs0x4Pa', 144, 2005, 'a7272eb818e1cd00d9b5ee65f5b592f4'],
  ['CNs900Br', 221, 3617, 'd9d4c57e6ec4061a464b45bb0560fd47'],
  ['CNs901BR', 222, 3917, '6378d58ab123dd09a0ca5460ef2a1112'],
  ['CNsx11La', 206, 881, 'b1ac6017e17a0f93e6af3962a8c3ae66'],
  ['CNsx11Ni', 178, 879, '0e09f9119f37308af94956c38527e758'],
];

// Click animations from SNDANIM.SI (objectId = m_move + 10)
// [name, objectId, size, md5]
const CLICK_ANIMATIONS = [
  ['ClickAnim0', 10, 1898, 'e8bb524cc29c6bdc9416ae3a95727dd1'],
  ['ClickAnim1', 11, 2038, '21444b8952df188cb338e830a8ee1e00'],
  ['ClickAnim2', 12, 2606, '5b49aeb7dcd7e52f22febc6502b9f8a2'],
  ['ClickAnim3', 13, 4218, 'e25f074d7012f89868011dc2bd5c0586'],
];

// Click sounds from SNDANIM.SI (objectId = m_sound + 50)
// [name, objectId, size, md5]
const CLICK_SOUNDS = [
  ['ClickSound0', 50, 10078, '928eeb70f8dadbc400f5c150727fde69'],
  ['ClickSound1', 51, 15988, '9c8aa04b0e4683976c3f2c2be868b37e'],
  ['ClickSound2', 52, 4114, 'a94a6dc7ae24fc42b1b9be962bbf3bf1'],
  ['ClickSound3', 53, 7741, '96bd26dc212ffd31da365ea1d088bfa3'],
  ['ClickSound4', 54, 23705, 'ca79cc736729c12aed6da018725fb0e3'],
  ['ClickSound5', 55, 24179, 'b7c97cb776f0afbba40f2e21fc0b309d'],
  ['ClickSound6', 56, 17675, 'b69b07bba21c6667d0af651c89828815'],
  ['ClickSound7', 57, 18953, '65d9cc0d09e3bfb831cee014a84085f7'],
  ['ClickSound8', 58, 7344, '7bbc41251b750835989cb3b35c8546a4'],
];

// Mood sounds from SNDANIM.SI (objectId = m_mood + 66)
// [name, objectId, size, md5]
const MOOD_SOUNDS = [
  ['MoodSound0', 66, 11534, '91379f36012f600a4b7432e003e16c3a'],
  ['MoodSound1', 67, 11534, '91379f36012f600a4b7432e003e16c3a'],
  ['MoodSound2', 68, 11534, '91379f36012f600a4b7432e003e16c3a'],
  ['MoodSound3', 69, 11534, '91379f36012f600a4b7432e003e16c3a'],
];

// [name, siFile, objectId, size, md5]
const TEXTURES = [
  ['CHJETL1', 'Scripts/Build/COPTER.SI', 112, 4235, 'af5010e9de08240c1ff7ad08ae90087e'],
  ['CHJETL2', 'Scripts/Build/COPTER.SI', 118, 4235, '130322a91a293b85551f59e1b5fb1c6f'],
  ['CHJETL3', 'Scripts/Build/COPTER.SI', 115, 4235, 'a922a1cf56da0ab47426cc3d0f581339'],
  ['CHJETL4', 'Scripts/Build/COPTER.SI', 121, 4235, '624b3aa949f2e2db5c8820caffbe8f58'],
  ['CHJETR1', 'Scripts/Build/COPTER.SI', 127, 4235, '924b8ae4db6c60003aba9994720ad0d6'],
  ['CHJETR2', 'Scripts/Build/COPTER.SI', 133, 4235, 'b4edeba59b44b2b37124a8da02693a10'],
  ['CHJETR3', 'Scripts/Build/COPTER.SI', 130, 4235, '18b50ad01a7aee7cf47f378d278be9eb'],
  ['CHJETR4', 'Scripts/Build/COPTER.SI', 136, 4235, 'f6874aec4931186782aa2e360fe1861f'],
  ['CHWIND1', 'Scripts/Build/COPTER.SI', 97, 4235, '860a0c8cacf27d3e2faed9030cc1be69'],
  ['CHWIND2', 'Scripts/Build/COPTER.SI', 103, 4235, 'b99fec10adf4660aa19b067483970f8f'],
  ['CHWIND3', 'Scripts/Build/COPTER.SI', 100, 4235, '05d7068d58105292632cdab56d3f67e4'],
  ['CHWIND4', 'Scripts/Build/COPTER.SI', 106, 4235, '24eb83a84cad5e5926fc2db010bd93d8'],
  ['Dbfrfn1', 'Scripts/Build/DUNECAR.SI', 96, 16524, '255fd145075b02d16fee2ac8bfeab3de'],
  ['Dbfrfn2', 'Scripts/Build/DUNECAR.SI', 99, 16524, 'a6b3e5a02bb1ab0b139cb76b8cc00e9b'],
  ['Dbfrfn3', 'Scripts/Build/DUNECAR.SI', 102, 16524, '60b6758fd34a74abf868fca98be3a3fa'],
  ['Dbfrfn4', 'Scripts/Build/DUNECAR.SI', 105, 16524, 'b57ff13872e67c8e52953b943d4244a8'],
  ['JSWNSH1', 'Scripts/Build/JETSKI.SI', 124, 16511, 'faf25d963756e335bd3e97b5383ed3a4'],
  ['JSWNSH2', 'Scripts/Build/JETSKI.SI', 130, 16484, 'bce7b364358238f8adf15a2f7242ed1b'],
  ['JSWNSH3', 'Scripts/Build/JETSKI.SI', 136, 16484, 'c502a5ca2f43f73320960c201ecef96a'],
  ['JSWNSH4', 'Scripts/Build/JETSKI.SI', 142, 16511, '9dbddced239fe2e6f04704116a6dc98c'],
  ['jsfrnt1', 'Scripts/Build/JETSKI.SI', 100, 8325, '3bc6cee56e1b282e1271d823c932b140'],
  ['jsfrnt2', 'Scripts/Build/JETSKI.SI', 106, 8331, 'f0b3ba901b7302d6ea72fdadaee5def0'],
  ['jsfrnt3', 'Scripts/Build/JETSKI.SI', 112, 8325, '13431821186bb466fce71c34ecc008e7'],
  ['jsfrnt4', 'Scripts/Build/JETSKI.SI', 118, 8331, 'a173f79e05be78fba888d89aa5ee5ed1'],
  ['rcback1', 'Scripts/Build/RACECAR.SI', 110, 16524, '97c1c6f3673bcceb340149627a5d656c'],
  ['rcback2', 'Scripts/Build/RACECAR.SI', 113, 16524, 'd730986dc5a0b4f3199dcd31246c32a3'],
  ['rcback3', 'Scripts/Build/RACECAR.SI', 116, 16524, 'a2574a6c6d9c16d41f001fb0eb908726'],
  ['rcback4', 'Scripts/Build/RACECAR.SI', 119, 16512, '37291480ea6c96145c99e659d4d6cbd4'],
  ['rcfrnt1', 'Scripts/Build/RACECAR.SI', 95, 16524, '8962ce972e6122ab7f7b87efa40591c2'],
  ['rcfrnt2', 'Scripts/Build/RACECAR.SI', 98, 16524, 'ca235a1cdd432f6cc5b64610e62eb94f'],
  ['rcfrnt3', 'Scripts/Build/RACECAR.SI', 101, 16524, '017301e33ff6dc8dfe41afc6558055f1'],
  ['rcfrnt4', 'Scripts/Build/RACECAR.SI', 104, 16512, '3064a4627325d2325ee07b98b49f4a58'],
  ['rctail1', 'Scripts/Build/RACECAR.SI', 125, 4227, '5c28aa88d5971f73575315b09359ce57'],
  ['rctail2', 'Scripts/Build/RACECAR.SI', 128, 4236, 'a69ae67432ecccfd88a567ce2d8973c0'],
  ['rctail3', 'Scripts/Build/RACECAR.SI', 131, 4230, '55d628507bf0968037422aefb3494184'],
  ['rctail4', 'Scripts/Build/RACECAR.SI', 134, 4236, '614cb9aa532ee85c119cc1432e6d65e9'],
];

// [name, siFile, objectId, size, md5]
const BITMAPS = [
  ['globe1', 'Scripts/Isle/ISLE.SI', 1130, 5824, '12554d2a7d38bdc0e6bc1709f8404293'],
  ['globe2', 'Scripts/Isle/ISLE.SI', 1131, 5824, 'b0b39a4b959b4bf1605a6c695d9e3dd0'],
  ['globe3', 'Scripts/Isle/ISLE.SI', 1132, 5824, '71672bff19044f7df059c87a0759d950'],
  ['globe4', 'Scripts/Isle/ISLE.SI', 1133, 5824, 'f5421e06ae9997d9cbfc774942f097d4'],
  ['globe5', 'Scripts/Isle/ISLE.SI', 1134, 5824, '47974b0577cab1c3775175eab074e5b5'],
  ['globe6', 'Scripts/Isle/ISLE.SI', 1135, 5824, '65237421063fa993167ed4af9be9180c'],
  ['pepper', 'Scripts/Infocntr/INFOMAIN.SI', 80, 2904, '4143f58632135089b7bc695bff406077'],
  ['pepper-selected', 'Scripts/Infocntr/INFOMAIN.SI', 81, 2904, '01f57a3a32f7aea6bc48a78a8c95ee1b'],
  ['mama', 'Scripts/Infocntr/INFOMAIN.SI', 76, 2904, 'ad68ae8fe78c368cac026ae09f1ad8c4'],
  ['mama-selected', 'Scripts/Infocntr/INFOMAIN.SI', 77, 2904, '72f041d1080b20f713d39f7ae00d966d'],
  ['papa', 'Scripts/Infocntr/INFOMAIN.SI', 78, 2904, '0cd5ef1c6d68198862c102b36b2f04fe'],
  ['papa-selected', 'Scripts/Infocntr/INFOMAIN.SI', 79, 2904, 'ec7d3d87d796dd824dfd5110911d4aa4'],
  ['nick', 'Scripts/Infocntr/INFOMAIN.SI', 82, 2904, 'c29ecdce0ffae81a71b973b8af26c26c'],
  ['nick-selected', 'Scripts/Infocntr/INFOMAIN.SI', 83, 2904, '8db4e63632c6f90e543832e6c92c89fa'],
  ['laura', 'Scripts/Infocntr/INFOMAIN.SI', 84, 2904, '99abd3415870285d487da20882f3bbf3'],
  ['laura-selected', 'Scripts/Infocntr/INFOMAIN.SI', 85, 2904, 'f56c2efb4f744d306d5a3d4ac8d332ca'],
];

const MXCH_SIGNATURE = Buffer.from('MxCh');
const MXCH_HEADER_SIZE = 22; // MxCh(4) + chunkSize(4) + flags(2) + objectId(4) + time(4) + dataSize(4)

const LEGO_DIR = path.join(process.cwd(), 'LEGO');
const BIN_PATH = path.join(process.cwd(), 'save-editor.bin');

const siCache = new Map();

async function loadSI(siRelPath) {
  if (siCache.has(siRelPath)) return siCache.get(siRelPath);
  const buf = await fs.readFile(path.join(LEGO_DIR, siRelPath));
  siCache.set(siRelPath, buf);
  return buf;
}

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

/**
 * Scan a SI buffer for all MxCh chunks and group data ranges by objectId.
 * Clips each chunk's data to the physical space before the next MxCh header,
 * since interleaving can split a logical chunk across sector boundaries.
 * Returns Map<objectId, [[dataOffset, dataSize], ...]>.
 */
function findMxChByObjectId(siBuf, targetIds) {
  // First pass: collect all MxCh header positions
  const allPositions = [];
  let pos = 0;
  while (pos <= siBuf.length - MXCH_HEADER_SIZE) {
    const idx = siBuf.indexOf(MXCH_SIGNATURE, pos);
    if (idx === -1) break;
    allPositions.push(idx);
    pos = idx + 4;
  }

  // Second pass: extract data ranges for target objectIds
  const result = new Map();
  for (const id of targetIds) result.set(id, []);

  for (let i = 0; i < allPositions.length; i++) {
    const idx = allPositions[i];
    const dataSize = siBuf.readUInt32LE(idx + 18);
    const objectId = siBuf.readUInt32LE(idx + 10);

    if (dataSize > 0 && result.has(objectId)) {
      const dataStart = idx + MXCH_HEADER_SIZE;
      const physicalEnd = i + 1 < allPositions.length ? allPositions[i + 1] : siBuf.length;
      const actualSize = Math.min(dataSize, physicalEnd - dataStart);
      if (actualSize > 0) {
        result.get(objectId).push([dataStart, actualSize]);
      }
    }
  }

  return result;
}

/**
 * Assemble MxCh data from ranges, verify against expected size and md5.
 * Only assembles up to `size` bytes (objectIds can be reused across streams).
 * Returns the assembled Buffer, or null on failure.
 */
function extractAndVerify(siBuf, ranges, size, expectedMd5) {
  if (!ranges || ranges.length === 0) return null;

  const assembled = Buffer.alloc(size);
  let writePos = 0;
  for (const [rOff, rLen] of ranges) {
    if (writePos >= size) break;
    const take = Math.min(rLen, size - writePos);
    siBuf.copy(assembled, writePos, rOff, rOff + take);
    writePos += take;
  }

  if (writePos !== size || md5(assembled) !== expectedMd5) return null;
  return assembled;
}

async function main() {
  console.log('Generating asset fragment bundle...\n');

  const fragments = []; // [{type, name, data: Buffer}, ...]
  let found = 0;
  let failed = 0;

  // --- Animations (all in ISLE.SI) ---
  const isleSI = await loadSI('Scripts/Isle/ISLE.SI');
  console.log(`Loaded ISLE.SI (${(isleSI.length / 1024 / 1024).toFixed(1)} MB)`);

  const aniObjectIds = new Set(ANIMATIONS.map(([, objectId]) => objectId));
  const aniRanges = findMxChByObjectId(isleSI, aniObjectIds);

  for (const [name, objectId, size, expectedMd5] of ANIMATIONS) {
    const data = extractAndVerify(isleSI, aniRanges.get(objectId), size, expectedMd5);
    if (data) {
      fragments.push({ type: 'animations', name, data });
      found++;
    } else {
      console.error(`  FAILED: ${name}.ani (objectId ${objectId})`);
      failed++;
    }
  }
  console.log(`  ${found}/${ANIMATIONS.length} walking animations found\n`);

  // --- Click Animations (in SNDANIM.SI) ---
  const sndanimSI = await loadSI('Scripts/SNDANIM.SI');
  console.log(`Loaded SNDANIM.SI (${(sndanimSI.length / 1024 / 1024).toFixed(1)} MB)`);

  const clickObjectIds = new Set(CLICK_ANIMATIONS.map(([, objectId]) => objectId));
  const clickRanges = findMxChByObjectId(sndanimSI, clickObjectIds);

  let clickFound = 0;
  for (const [name, objectId, size, expectedMd5] of CLICK_ANIMATIONS) {
    const data = extractAndVerify(sndanimSI, clickRanges.get(objectId), size, expectedMd5);
    if (data) {
      fragments.push({ type: 'animations', name, data });
      clickFound++;
      found++;
    } else {
      console.error(`  FAILED: ${name} (objectId ${objectId})`);
      failed++;
    }
  }
  console.log(`  ${clickFound}/${CLICK_ANIMATIONS.length} click animations found\n`);

  // --- Sounds (in SNDANIM.SI) ---
  const allSounds = [...CLICK_SOUNDS, ...MOOD_SOUNDS];
  const soundObjectIds = new Set(allSounds.map(([, objectId]) => objectId));
  const soundRanges = findMxChByObjectId(sndanimSI, soundObjectIds);

  let soundFound = 0;
  for (const [name, objectId, size, expectedMd5] of allSounds) {
    const data = extractAndVerify(sndanimSI, soundRanges.get(objectId), size, expectedMd5);
    if (data) {
      fragments.push({ type: 'sounds', name, data });
      soundFound++;
      found++;
    } else {
      console.error(`  FAILED: ${name} (objectId ${objectId})`);
      failed++;
    }
  }
  console.log(`  ${soundFound}/${allSounds.length} sounds found\n`);

  // --- Textures (across Build SI files) ---
  const texBySI = new Map();
  for (const entry of TEXTURES) {
    const siFile = entry[1];
    if (!texBySI.has(siFile)) texBySI.set(siFile, []);
    texBySI.get(siFile).push(entry);
  }

  let texFound = 0;
  for (const [siFile, entries] of texBySI) {
    const siBuf = await loadSI(siFile);
    const objectIds = new Set(entries.map(([, , objectId]) => objectId));
    const texRanges = findMxChByObjectId(siBuf, objectIds);
    console.log(`Loaded ${siFile} (${(siBuf.length / 1024).toFixed(0)} KB)`);

    for (const [name, , objectId, size, expectedMd5] of entries) {
      const data = extractAndVerify(siBuf, texRanges.get(objectId), size, expectedMd5);
      if (data) {
        fragments.push({ type: 'textures', name, data });
        texFound++;
        found++;
      } else {
        console.error(`  FAILED: ${name}.tex in ${siFile} (objectId ${objectId})`);
        failed++;
      }
    }
  }
  console.log(`  ${texFound}/${TEXTURES.length} textures found\n`);

  // --- Bitmaps (across SI files) ---
  const bmpBySI = new Map();
  for (const entry of BITMAPS) {
    const siFile = entry[1];
    if (!bmpBySI.has(siFile)) bmpBySI.set(siFile, []);
    bmpBySI.get(siFile).push(entry);
  }

  let bmpFound = 0;
  for (const [siFile, entries] of bmpBySI) {
    const siBuf = await loadSI(siFile);
    const objectIds = new Set(entries.map(([, , objectId]) => objectId));
    const bmpRanges = findMxChByObjectId(siBuf, objectIds);

    for (const [name, , objectId, size, expectedMd5] of entries) {
      const data = extractAndVerify(siBuf, bmpRanges.get(objectId), size, expectedMd5);
      if (data) {
        fragments.push({ type: 'bitmaps', name, data });
        bmpFound++;
        found++;
      } else {
        console.error(`  FAILED: ${name} (objectId ${objectId})`);
        failed++;
      }
    }
  }
  console.log(`  ${bmpFound}/${BITMAPS.length} bitmaps found\n`);

  if (failed > 0) {
    console.error(`Failed to find ${failed} assets. Bundle not written.`);
    process.exit(1);
  }

  // --- Write single bundle: [U32LE indexLen][JSON index][data] ---
  const index = {};
  let offset = 0;
  for (const { type, name, data } of fragments) {
    index[`${type}/${name}`] = [offset, data.length];
    offset += data.length;
  }

  const indexBuf = Buffer.from(JSON.stringify(index));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(indexBuf.length);
  const dataBuf = Buffer.concat(fragments.map(f => f.data));
  const bundle = Buffer.concat([header, indexBuf, dataBuf]);
  await fs.writeFile(BIN_PATH, bundle);
  console.log(`Wrote ${BIN_PATH} (${(bundle.length / 1024).toFixed(1)} KB, ${Object.keys(index).length} entries)`);

  console.log(`Total: ${found} assets (${ANIMATIONS.length} walking + ${CLICK_ANIMATIONS.length} click animations, ${allSounds.length} sounds, ${TEXTURES.length} textures, ${BITMAPS.length} bitmaps)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
