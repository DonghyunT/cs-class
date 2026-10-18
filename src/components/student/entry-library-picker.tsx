"use client";

import { useState } from "react";
import { LIBRARY_CATEGORIES, LIBRARY_SPRITES, type LibrarySprite } from "@/lib/classroom/entry-palette";
import styles from "./entry-practice-workspace.module.css";

// Entry-like object picker for the dog-free lessons: category tabs, a name search and a thumbnail grid.
export function EntryLibraryPicker({ onPick }: { onPick: (sprite: LibrarySprite) => void }) {
  const [category, setCategory] = useState<string>(LIBRARY_CATEGORIES[0][0]);
  const [query, setQuery] = useState("");
  const words = query.trim();
  const shown = LIBRARY_SPRITES.filter((sprite) => words ? sprite.name.includes(words) : sprite.category === category);
  return <div className={styles.library}>
    <input type="search" className={styles.librarySearch} placeholder="오브젝트 이름 검색" aria-label="오브젝트 이름 검색" value={query} maxLength={20} onChange={(event) => setQuery(event.target.value)} />
    <div className={styles.libraryBody}>
      <div className={styles.libraryTabs} role="group" aria-label="오브젝트 분류">{LIBRARY_CATEGORIES.map(([id, label]) => <button key={id} type="button" aria-pressed={!words && category === id} onClick={() => { setQuery(""); setCategory(id); }}>{label}</button>)}</div>
      <ul className={styles.spriteList} aria-label={words ? `‘${words}’ 검색 결과` : `${LIBRARY_CATEGORIES.find(([id]) => id === category)![1]} 오브젝트`}>
        {shown.map((sprite) => <li key={sprite.id}><button type="button" onClick={() => onPick(sprite)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- bundled static thumbnail */}
          <img src={sprite.thumb} alt="" width={56} height={56} loading="lazy" /><span>{sprite.name}</span>{(sprite.pictures?.length ?? 1) > 1 && <small>모양 {sprite.pictures!.length}개</small>}
        </button></li>)}
        {!shown.length && <li className={styles.libraryEmpty}>찾는 오브젝트가 없어요.</li>}
      </ul>
    </div>
    <p className={styles.libraryCredit}>오브젝트 그림: 엔트리(네이버 커넥트재단), 교육용 무료 자료</p>
  </div>;
}
