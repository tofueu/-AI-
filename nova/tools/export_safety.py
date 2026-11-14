"""Reject export paths that could overwrite source MOD assets."""
from pathlib import Path


def validate_export_destination(mod_dir, destination):
    source = Path(mod_dir).resolve(strict=True)
    if not source.is_dir():
        raise NotADirectoryError(source)
    target = Path(destination).resolve(strict=False)
    if target == source or source in target.parents:
        raise ValueError("export destination must be outside the source MOD directory")
    return Path(destination)
