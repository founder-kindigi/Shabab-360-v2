"""Read-only coverage/source preservation checks; not API behavior verification."""
import copy
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/delivery/consolidation'
def read(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

inventory = read('C2_02_INVENTORY.json')
register = read('C2_02_REGISTER.json')
coverage = read('C1_COVERAGE.json')
patch = read('C2_01_PATCH.json')
baseline = read('C2_01_BASELINE.json')
snapshot = read('C0_SNAPSHOT.json')
private = Path(read('C0_RELOCATION.json')['privateRoot'])
roots = {'main': private / 'integration', 'v2': Path(baseline['target'])}
clauses = set(re.findall(r'\bC\d{2}\b', (OUT / 'C2_02_CONTRACTS.md').read_text(encoding='utf-8')))

def validate(reg, inv):
    errors = []
    def check(ok, message):
        if not ok:
            errors.append(message)
    union = set().union(*(set(c['capabilities']) for c in inv['catalogues'].values()))
    actual = [r['capability'] for r in reg['capabilities']]
    check(set(actual) == union and len(actual) == len(union) == 41, 'capability coverage')
    for row in reg['capabilities']:
        name = row['capability']
        source = inv['catalogues']['v2' if name in inv['catalogues']['v2']['capabilities'] else 'main']
        expected = [r for r, caps in source['defaults'].items() if name in caps]
        check(row['canonicalDefaults'] == expected, 'default widening: ' + name)
        check(row['userOverrideAllowed'] == (name in source['userOverrides']), 'override eligibility: ' + name)
    expected = {r['path'] for key in ['mainOnlyPaths', 'changedSharedPaths'] for r in coverage[key]
                if r['path'].startswith('src/app/api/') and r['path'].endswith('/route.ts')}
    paths = [r['sourcePath'] for r in reg['endpoints']]
    check(len(paths) == len(set(paths)) == 125, 'endpoint count/duplicates')
    check(expected == {r['sourcePath'] for r in reg['endpoints'] if r['c1Conflict']} and len(expected) == 107, 'conflict coverage')
    for row in reg['endpoints']:
        check(row['contract'] in clauses and bool(row['disposition']), 'missing contract')
        source = inv['routes'][row['sourcePath']]
        check(row['sourceMethods'] == {b: [m['method'] for m in s['methods']] for b, s in source.items()}, 'method coverage')
        check(bool(row['sourceEvidence']) and not row['implementationVerified'], 'evidence semantics')
        check(row['sourceHashes'] == {b: s['sha256'] for b, s in source.items()}, 'register hash differs')
        if '/profile/' in row['sourcePath'] and '/students/' in row['sourcePath']:
            check(row['canonicalPath'] == '/api/admin/students/[id]/profile', 'dynamic profile collision')
    for p, sources in inv['routes'].items():
        for branch, source in sources.items():
            check(digest(roots[branch] / p) == source['sha256'], 'changed route source: ' + p)
    return errors

errors = validate(register, inventory)
probes = {}
bad = copy.deepcopy(register)
bad['capabilities'].pop()
probes['missingCapabilityRejected'] = bool(validate(bad, inventory))
bad = copy.deepcopy(register)
bad['endpoints'].pop()
probes['missingEndpointRejected'] = bool(validate(bad, inventory))
bad_inventory = copy.deepcopy(inventory)
first = next(iter(bad_inventory['routes'].values()))
next(iter(first.values()))['sha256'] = '0' * 64
probes['changedSourceHashRejected'] = bool(validate(register, bad_inventory))

allowed = {'.agents/memory/current.md', 'docs/delivery/state.json', 'docs/delivery/tasks/C0-01.md', 'docs/delivery/README.md'}
checks = {
    'coverageAndRouteHashes': not errors,
    'allNegativeProbes': all(probes.values()),
    'catalogueHashes': all(digest(roots[b] / c['path']) == c['sha256'] for b, c in inventory['catalogues'].items()),
    'consumerHashes': all(digest(roots[c['variant']] / c['path']) == c['sha256'] for c in inventory['consumers']),
    'c2PatchIdentity': digest(OUT / 'C2_01_PATCH.diff') == patch['patchSha256'] == inventory['c2PatchSha256'],
    'c2ChangedFiles': all(digest(roots['v2'] / p) == v['afterSha256'] for p, v in patch['files'].items()),
    'c2UnchangedBaseline': all(digest(roots['v2'] / p) == h for p, h in baseline['copied'].items() if p not in patch['modified']),
    'c2ExcludedScratchAbsent': all(not (roots['v2'] / p).exists() for p in baseline['excluded']),
    'originalPreserved': all((ROOT / p).is_file() and digest(ROOT / p) == h for p, h in snapshot['files'].items() if p not in allowed),
    'recoveryCopyPreserved': all(digest(private / 'restore-candidate' / p) == h for p, h in snapshot['files'].items()),
    'recoveryArchiveIdentity': digest(private / 'candidate.zip') == snapshot['archiveSha256'],
}
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8')
checks['headUnchanged'] = git('rev-parse', 'HEAD').strip() == snapshot['head']
checks['indexUnchanged'] = hashlib.sha256(git('ls-files', '--stage', '-z').encode()).hexdigest() == snapshot['indexStateSha256']
checks['deletionsUnchanged'] = git('ls-files', '--deleted', '-z').split('\0')[:-1] == snapshot['deletedTracked']
findings = (OUT / 'C2_02_FINDINGS.md').read_text(encoding='utf-8')
checks['all27FindingsCarried'] = set(re.findall(r'C1-F\d{2}', findings)) == {f'C1-F{i:02}' for i in range(1, 28)}
broken = []
for doc in [*OUT.glob('C2_02_*.md'), ROOT / 'docs/delivery/tasks/C2-03.md']:
    for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        if not target.startswith(('https:', 'http:', '#')) and not (doc.parent / target.split('#')[0]).is_file():
            broken.append(str(doc.relative_to(ROOT)) + ': ' + target)
checks['markdownLinks'] = not broken
result = {'date': '2026-09-12', 'passed': all(checks.values()), 'checks': checks,
          'counts': register['counts'], 'originalSnapshotFiles': len(snapshot['files']),
          'candidateUnchangedFiles': len(baseline['copied']) - len(patch['modified']),
          'negativeProbes': probes, 'errors': errors, 'brokenLinks': broken,
          'remoteFreshness': 'Refresh rejected by automatic approval review due to account usage limit; no retry/bypass. Pinned local source hashes only.',
          'meaning': 'Coverage, recorded disposition and local identity checks only; no API/browser/database behavior or release verification.'}
(OUT / 'C2_02_CHECK.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
raise SystemExit(0 if result['passed'] else 1)
