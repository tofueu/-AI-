"""Safely package or import NOVA MOD folders without changing source assets.

A .nova-mod archive contains mod.json, rig.json and full-canvas PNG layers.
This is a transport format, not a finished character or PSD exporter.
"""
import argparse
import json
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILES = 64
MAX_UNCOMPRESSED = 128 * 1024 * 1024
REQUIRED = {'mod.json', 'rig.json'}


def _members(archive):
    files = archive.infolist()
    if len(files) > MAX_FILES:
        raise ValueError('Too many archive entries')
    total = 0
    seen = set()
    for info in files:
        name = info.filename
        p = PurePosixPath(name)
        if (not name or '\\' in name or p.is_absolute() or
                len(p.parts) != 1 or p.name in ('.', '..') or
                info.is_dir() or p.name.casefold() in seen or
                (info.flag_bits & 0x1) or
                (info.external_attr >> 16) & 0o170000 == 0o120000):
            raise ValueError(f'Unsafe MOD member: {name}')
        if p.suffix.lower() not in ('.png', '.json', '.txt'):
            raise ValueError(f'Unsupported MOD member: {name}')
        seen.add(p.name.casefold())
        total += info.file_size
        if total > MAX_UNCOMPRESSED:
            raise ValueError('MOD archive exceeds size limit')
    if not REQUIRED.issubset(seen):
        raise ValueError('MOD archive missing required manifests')
    return files


def import_mod(archive_path, destination):
    """Validate and extract to a new directory; never overwrite a MOD."""
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError(destination)
    with zipfile.ZipFile(archive_path) as archive:
        members = _members(archive)
        for name in REQUIRED:
            with archive.open(name) as source:
                if not isinstance(json.load(source), dict):
                    raise ValueError(f'Invalid {name}')
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.nova_import_') as tmp:
            stage = Path(tmp) / 'mod'
            stage.mkdir()
            for info in members:
                with archive.open(info) as source, (stage / info.filename).open('wb') as target:
                    shutil.copyfileobj(source, target)
            stage.rename(destination)
    return destination


def export_mod(source_dir, archive_path):
    """Archive a MOD without touching the original directory."""
    source_dir, archive_path = Path(source_dir), Path(archive_path)
    if archive_path.exists():
        raise FileExistsError(archive_path)
    if not source_dir.is_dir():
        raise FileNotFoundError(source_dir)
    entries = list(source_dir.iterdir())
    if any(not p.is_file() for p in entries):
        raise ValueError('MOD directory contains unsupported entries')
    files = sorted(entries)
    if len(files) > MAX_FILES or not REQUIRED.issubset({p.name for p in files}):
        raise ValueError('Invalid MOD directory')
    names = [p.name.casefold() for p in files]
    if len(names) != len(set(names)):
        raise ValueError('Case-colliding MOD filenames')
    total = 0
    for p in files:
        if p.is_symlink() or p.suffix.lower() not in ('.png', '.json', '.txt'):
            raise ValueError(f'Unsupported MOD file: {p.name}')
        total += p.stat().st_size
        if total > MAX_UNCOMPRESSED:
            raise ValueError('MOD exceeds size limit')
    for name in REQUIRED:
        if not isinstance(json.loads((source_dir / name).read_text(encoding='utf-8')), dict):
            raise ValueError(f'Invalid {name}')
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(archive_path, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
            for p in files:
                archive.write(p, arcname=p.name)
    except BaseException:
        archive_path.unlink(missing_ok=True)
        raise
    return archive_path


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('import', 'export'))
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    print(import_mod(args.source, args.destination) if args.action == 'import' else export_mod(args.source, args.destination))
