"""Consistent SQLite + upload backup. Run while the application's writer is stopped."""
import argparse
import hashlib
import json
import shutil
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def contained(root, relative):
    relative = Path(relative.replace("\\", "/"))
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Invalid relative storage path")
    target = root / relative
    if target.is_symlink() or not target.resolve().is_relative_to(root.resolve()):
        raise ValueError("Storage path escapes data directory")
    return target


def database_check(database, uploads):
    with closing(sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("Database integrity check failed")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Database contains foreign key violations")
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        rows = db.execute("SELECT StoredPath,SizeBytes FROM StoredFiles").fetchall() if "StoredFiles" in tables else []
        for relative, size in rows:
            file = contained(uploads, relative)
            if not file.is_file() or file.stat().st_size != size:
                raise ValueError("A stored file is missing or has the wrong size")
        duplicates = 0
        if "Submissions" in tables:
            columns = {r[1] for r in db.execute("PRAGMA table_info(Submissions)")}
            group = "AssignmentId,StudentId" + (",AttemptNumber" if "AttemptNumber" in columns else "")
            duplicates = db.execute(f"SELECT COUNT(*) FROM (SELECT 1 FROM Submissions GROUP BY {group} HAVING COUNT(*)>1)").fetchone()[0]
        return {"stored_files": len(rows), "duplicate_submission_groups": duplicates}


def verify(bundle):
    if bundle.is_symlink():
        raise ValueError("Backup directory cannot be a symlink")
    manifest = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("format") != 1:
        raise ValueError("Unsupported backup format")
    declared = manifest["files"]
    if "tfrench.db" not in declared:
        raise ValueError("Backup lacks a database")
    if any(p.is_symlink() for p in bundle.rglob("*")):
        raise ValueError("Backup contains symlinks")
    actual = {p.relative_to(bundle).as_posix() for p in bundle.rglob("*") if p.is_file() and p != bundle / "manifest.json"}
    if actual != set(declared):
        raise ValueError("Backup file inventory does not match manifest")
    for relative, expected in declared.items():
        file = contained(bundle, relative)
        if not file.is_file() or digest(file) != expected:
            raise ValueError("Backup hash verification failed")
    return database_check(bundle / "tfrench.db", bundle / "uploads")


def backup(database, uploads, destination, service_stopped=False):
    if not service_stopped:
        raise ValueError("Stop the application first, then pass --service-stopped to freeze DB and upload writes together")
    if destination.exists() or destination.resolve().is_relative_to(uploads.resolve()):
        raise ValueError("Destination must be new and outside upload storage")
    database_check(database, uploads)
    if uploads.is_symlink():
        raise ValueError("Upload root cannot be a symlink")
    sources = list(uploads.rglob("*")) if uploads.exists() else []
    if any(p.is_symlink() for p in sources):
        raise ValueError("Symlinks are not allowed in upload storage")
    destination.mkdir(parents=True)
    with closing(sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)) as source:
        with closing(sqlite3.connect(destination / "tfrench.db")) as target:
            source.backup(target)
            # The offline bundle must not create WAL/SHM files merely on verify.
            target.execute("PRAGMA journal_mode=DELETE").fetchone()
    (destination / "uploads").mkdir()
    for source in sources:
        if source.is_file():
            relative = source.relative_to(uploads)
            target = contained(destination / "uploads", relative.as_posix())
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    files = {p.relative_to(destination).as_posix(): digest(p) for p in destination.rglob("*") if p.is_file()}
    manifest = {"format": 1, "created_at": datetime.now(timezone.utc).isoformat(), "files": files}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return verify(destination)


def restore(bundle, destination):
    # Verify the entire snapshot before creating any destination files.
    result = verify(bundle)
    if destination.exists():
        raise ValueError("Restore destination must not exist; restore never overwrites a live directory")
    destination.mkdir(parents=True)
    shutil.copy2(bundle / "tfrench.db", destination / "tfrench.db")
    shutil.copytree(bundle / "uploads", destination / "uploads")
    database_check(destination / "tfrench.db", destination / "uploads")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("backup")
    create.add_argument("--database", type=Path, required=True)
    create.add_argument("--uploads", type=Path, required=True)
    create.add_argument("--destination", type=Path, required=True)
    create.add_argument("--service-stopped", action="store_true")
    for command in ("verify", "restore"):
        item = sub.add_parser(command)
        item.add_argument("--bundle", type=Path, required=True)
        if command == "restore":
            item.add_argument("--destination", type=Path, required=True)
    audit = sub.add_parser("audit")
    audit.add_argument("--database", type=Path, required=True)
    audit.add_argument("--uploads", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "backup":
            result = backup(args.database, args.uploads, args.destination, args.service_stopped)
        elif args.command == "restore":
            result = restore(args.bundle, args.destination)
        elif args.command == "verify":
            result = verify(args.bundle)
        else:
            result = database_check(args.database, args.uploads)
        print(json.dumps(result))
    except (ValueError, OSError, sqlite3.Error, KeyError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
