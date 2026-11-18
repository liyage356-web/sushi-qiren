from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from docx import Document


STORY_CONFIG = {
    "hei-tou": {"title": "黑头", "paragraph_index": 2, "count": 24},
    "ni-ren-zhang": {
        "title": "泥人张",
        "paragraph_index": 4,
        "count": 12,
    },
    "gou-bu-li": {"title": "狗不理", "paragraph_index": 6, "count": 14},
    "si-shi-ba-yang": {
        "title": "四十八样",
        "paragraph_index": 8,
        "count": 34,
    },
}


def load_data(path: Path) -> dict:
    text = path.read_text(encoding="utf-8").strip()
    prefix = "window.SUSHI_QIREN_ORIGINAL_TEXT = "
    if not text.startswith(prefix) or not text.endswith(";"):
        raise ValueError("Original-text data file has an unexpected wrapper.")
    return json.loads(text[len(prefix) : -1])


def source_paragraphs(document_path: Path, story: dict) -> list[str]:
    document = Document(document_path)
    text = document.paragraphs[story["paragraph_index"]].text
    paragraphs = [
        part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()
    ]
    title, first_paragraph = paragraphs[0].split("：", 1)
    if title != story["title"]:
        raise ValueError(
            f"{story['title']}: unexpected title prefix {title!r}",
        )
    return [first_paragraph.strip(), *paragraphs[1:]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("document", type=Path)
    parser.add_argument(
        "data",
        type=Path,
        nargs="?",
        default=Path("web/data/original-text.js"),
    )
    args = parser.parse_args()

    data = load_data(args.data)
    expected_hash = hashlib.sha256(args.document.read_bytes()).hexdigest()
    if data["source"]["sha256"] != expected_hash:
        raise AssertionError("Source hash differs from the data manifest.")

    results = {}
    all_ids = []
    all_content = []
    for story_id, config in STORY_CONFIG.items():
        paragraphs = source_paragraphs(args.document, config)
        stored = data["stories"][story_id]["paragraphs"]
        if len(paragraphs) != config["count"] or len(stored) != config["count"]:
            raise AssertionError(f"{story_id}: paragraph count mismatch.")
        if [item["content"] for item in stored] != paragraphs:
            raise AssertionError(f"{story_id}: stored text differs from source.")
        if [item["order"] for item in stored] != list(
            range(1, len(stored) + 1),
        ):
            raise AssertionError(f"{story_id}: unstable paragraph order.")
        if not all(
            item["sourceVerified"] and item["paragraphId"]
            for item in stored
        ):
            raise AssertionError(f"{story_id}: verification metadata missing.")
        all_ids.extend(item["paragraphId"] for item in stored)
        all_content.extend(item["content"] for item in stored)
        results[story_id] = len(stored)

    if len(all_ids) != len(set(all_ids)):
        raise AssertionError("Paragraph IDs are not unique.")
    if len(all_content) != len(set(all_content)):
        raise AssertionError("Duplicate paragraph content was imported.")
    print(
        json.dumps(
            {
                "sourceSha256": expected_hash,
                "paragraphCounts": results,
                "uniqueParagraphIds": len(all_ids),
                "uniqueParagraphContents": len(all_content),
            },
            ensure_ascii=False,
            indent=2,
        ),
    )


if __name__ == "__main__":
    main()
