/* check-town.js - 町まわりのデータが、実際に目に入るかを見る
 *
 * 書いたのに一度も出ない会話は、書いていないのと同じ。
 * ここでは「条件を満たす機会が来るか」を通しで確かめる。
 */
const { load } = require('./load-data.js');

function main() {
  const G = load();
  const bad = [], warn = [];

  /* --- 町の台詞 --- */
  let towns = 0, withAfter = 0;
  G.STORY.CHAPTERS.forEach(c => c.places.forEach(p => {
    if (p.kind !== 'town') return;
    towns++;
    if (!p.talks || !p.talks.length) bad.push(`${p.name}: 街の声が無い`);
    if (p.talksAfter && p.talksAfter.length) withAfter++;
    else warn.push(`${p.name}: 踏破後の台詞が無い（章が進んでも町が変わらない）`);
  }));

  /* --- 宿の夜 --- */
  /* 加入は章で決まる。各話が、条件のそろう章に置かれているか。 */
  const joinCh = {};
  G.ALLY_LIST.forEach(a => { joinCh[a.id] = a.join; });
  let reach = 0;
  (G.INN_TALKS || []).forEach(x => {
    if (!x.lines || !x.lines.length) { bad.push(`${x.id}: 台詞が無い`); return; }
    const needCh = Math.max(0, ...(x.need || []).map(id => {
      if (joinCh[id] == null) { bad.push(`${x.id}: 仲間 ${id} が居ない`); return 99; }
      /* 加入は「その章の目標を踏破した直後」。章を跨ぐ前に入るので、
       * その章の町に戻った時点でもう揃っている（main.js の加入処理と同じ前提）。 */
      return joinCh[id];
    }));
    if (needCh > G.STORY.CHAPTERS.length) { bad.push(`${x.id}: 顔ぶれが最後まで揃わない`); return; }
    if (x.ch < needCh) bad.push(`${x.id}: 第${x.ch}章の話だが、顔ぶれが揃うのは第${needCh}章から`);
    else reach++;
  });

  /* 宿に泊まれる回数のほうが話の数より少ないと、書いたぶんが出ない。
   * 町は章ごとに一つ。少なくとも章の数だけは泊まれる。 */
  if ((G.INN_TALKS || []).length > G.STORY.CHAPTERS.length * 3) {
    warn.push(`宿の話が ${G.INN_TALKS.length} 本。章あたり3泊でも出しきれない`);
  }

  /* --- 分かれ道 --- */
  const depths = [];
  G.STORY.CHAPTERS.forEach(c => c.places.forEach(p => {
    if (p.kind === 'dungeon') depths.push({ name: p.name, depth: p.depth });
  }));
  const minDepth = Math.min(...depths.map(d => d.depth));
  (G.PATHS || []).forEach(p => {
    if (!p.desc) bad.push(`道 ${p.id}: 説明が無い`);
    if (p.id === 'main') return;
    /* when を最短のダンジョンで試して、一度も出られない道が無いか見る */
    let ok = false;
    depths.forEach(d => {
      for (let at = 0; at < d.depth - 1; at++) {
        if (!p.when || p.when({ at: at, depth: d.depth, lv: 1 })) ok = true;
      }
    });
    if (!ok) bad.push(`道 ${p.id}: どのダンジョンでも出ない`);
  });

  console.log('町', towns, '（踏破後の台詞あり', withAfter + '）');
  console.log('宿の夜', (G.INN_TALKS || []).length, '本 ／ 顔ぶれの揃う章に置けている', reach);
  console.log('分かれ道', (G.PATHS || []).length, '種 ／ 最短のダンジョン', minDepth, '層');
  console.log('');
  warn.forEach(w => console.log('△ ' + w));
  if (bad.length) { bad.forEach(b => console.log('✗ ' + b)); process.exit(1); }
  console.log('町の会話・宿の夜・分かれ道は、いずれも実際に目に入る');
}
main();
