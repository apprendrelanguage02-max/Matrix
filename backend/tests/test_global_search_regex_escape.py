import pytest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    async def to_list(self, *_args, **_kwargs):
        return self._docs


class _FakeCollection:
    def __init__(self, docs):
        self.docs = docs
        self.last_query = None

    def find(self, query, *_args, **_kwargs):
        self.last_query = query
        return _FakeCursor(self.docs)


class _FakeDB:
    def __init__(self):
        self.articles = _FakeCollection([{"id": "a1", "title": "A"}])
        self.properties = _FakeCollection([
            {"id": "p1", "title": "P", "images": ["img1.jpg"]}
        ])
        self.procedures = _FakeCollection([{"id": "pr1", "title": "PR"}])


@pytest.mark.asyncio
async def test_global_search_escapes_regex_characters(monkeypatch):
    fake_db = _FakeDB()
    monkeypatch.setattr(server, "db", fake_db)

    result = await server.global_search("[")

    assert result["articles"]
    assert result["properties"][0]["image"] == "img1.jpg"
    assert result["procedures"]

    expected_regex = {"$regex": r"\[", "$options": "i"}
    assert fake_db.articles.last_query["$or"][0]["title"] == expected_regex
    assert fake_db.properties.last_query["$or"][0]["title"] == expected_regex
    assert fake_db.procedures.last_query["$or"][0]["title"] == expected_regex
