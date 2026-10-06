import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path
from data_backup import backup, restore, verify


class BackupTests(unittest.TestCase):
    def test_restore_keeps_database_and_file_bytes_and_rejects_corruption(self):
        with tempfile.TemporaryDirectory(prefix="tfrench-backup-tests-") as directory:
            root = Path(directory)
            uploads = root / "uploads"
            uploads.mkdir()
            data = b"Original learner answer"
            (uploads / "answer.txt").write_bytes(data)
            database = root / "source.db"
            with closing(sqlite3.connect(database)) as db, db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("CREATE TABLE StoredFiles (Id INTEGER PRIMARY KEY, StoredPath TEXT, SizeBytes INTEGER)")
                db.execute("INSERT INTO StoredFiles VALUES (1, 'answer.txt', ?)", (len(data),))
                db.execute("CREATE TABLE Submissions (Id INTEGER PRIMARY KEY,AssignmentId INTEGER,StudentId INTEGER,AttemptNumber INTEGER)")
                db.execute("INSERT INTO Submissions VALUES (1, 10, 20, 1)")
            bundle = root / "bundle"
            with self.assertRaises(ValueError):
                backup(database, uploads, bundle)
            backup(database, uploads, bundle, service_stopped=True)
            verify(bundle)
            verify(bundle)
            restored = root / "restored"
            self.assertEqual(1, restore(bundle, restored)["stored_files"])
            self.assertEqual(data, (restored / "uploads/answer.txt").read_bytes())
            with closing(sqlite3.connect(restored / "tfrench.db")) as db:
                self.assertEqual((10, 20, 1), db.execute("SELECT AssignmentId,StudentId,AttemptNumber FROM Submissions").fetchone())
            with self.assertRaises(ValueError):
                restore(bundle, restored)
            (bundle / "uploads/answer.txt").write_bytes(b"Damaged")
            with self.assertRaises(ValueError):
                restore(bundle, root / "must-not-exist")
            self.assertFalse((root / "must-not-exist").exists())

    def test_missing_or_escaping_file_is_rejected_before_backup(self):
        with tempfile.TemporaryDirectory(prefix="tfrench-backup-tests-") as directory:
            root = Path(directory)
            uploads = root / "uploads"
            uploads.mkdir()
            with closing(sqlite3.connect(root / "source.db")) as db, db:
                db.execute("CREATE TABLE StoredFiles (StoredPath TEXT,SizeBytes INTEGER)")
                db.execute("INSERT INTO StoredFiles VALUES ('../outside.txt',1)")
            with self.assertRaises(ValueError):
                backup(root / "source.db", uploads, root / "bundle", service_stopped=True)
            self.assertFalse((root / "bundle").exists())


if __name__ == "__main__":
    unittest.main()
