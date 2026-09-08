class_name SelfTest
extends RefCounted
## 起動時の自己診断。
##
## 開発環境の都合でGDScriptを実行しながら書けなかったため、
## 「起動した瞬間に、どこが壊れているかが分かる」ことを重視している。
## 失敗があれば main が画面に出す。デバッグ実行時のみ走る。

static func run() -> Array:
	var errors: Array = []

	if GameData.classes.size() != 25:
		errors.append("職業が25件でなく %d 件（data/classes.json）" % GameData.classes.size())
	if GameData.accessories.size() != 138:
		errors.append("アクセサリが138件でなく %d 件" % GameData.accessories.size())
	if GameData.skills.is_empty():
		errors.append("スキルが読み込めていない")

	## 25職すべてでビルド集計が通るか
	for cid in GameData.classes:
		var h := HeroState.new()
		h.class_id = cid
		h.level = 12
		var s: Dictionary = {}
		s = h.recompute()
		for key in ["max_hp", "atk", "mag", "def", "res", "spd"]:
			var v: float = float(s.get(key, -1.0))
			if v <= 0.0 or not is_finite(v):
				errors.append("%s: %s が異常な値 (%s)" % [cid, key, v])
		## 職業のスキルが実在するか
		for sk in GameData.klass(cid).get("skills", []):
			if GameData.skill(sk).is_empty():
				errors.append("%s: スキル %s が存在しない" % [cid, sk])
		## スプライトが読めるか
		if GameData.sprite("classes", cid) == null:
			errors.append("%s: スプライトが読めない（エディタでインポートし直してください）" % cid)

	## 全アクセサリを装備しても集計が壊れないか
	var probe := HeroState.new()
	probe.class_id = "swordsman"
	probe.level = 10
	for a in GameData.accessories:
		probe.bag_acc = [a["id"]]
		probe.acc_ids = [a["id"], "", "", ""]
		var st: Dictionary = probe.recompute()
		if not is_finite(float(st["max_hp"])) or float(st["max_hp"]) <= 0.0:
			errors.append("アクセサリ %s を装備すると最大HPが異常" % a["id"])

	## 全武器・防具
	probe.acc_ids = ["", "", "", ""]
	for g in GameData.weapons + GameData.armors:
		probe.weapon_id = g["id"] if g.get("slot", "") == "weapon" else ""
		probe.armor_id = g["id"] if g.get("slot", "") == "armor" else ""
		probe.recompute()

	## ダメージ計算の煙テスト
	probe.weapon_id = "w_shortsword"
	probe.armor_id = "a_chain"
	probe.recompute()
	var r := Combat.resolve(probe.stats, probe.active_flags,
		{"def": 20.0, "res": 20.0, "weak": ["fire"], "resist": ["dark"], "dr": 0.0},
		{"power": 100.0, "kind": "phys", "el": "phys"})
	if int(r["damage"]) <= 0:
		errors.append("ダメージ計算が0以下を返した")

	## 敵のスケーリング
	for e in GameData.enemies:
		var sc := Enemy.scale_for(e, 10)
		if not is_finite(float(sc["hp"])) or float(sc["hp"]) <= 0.0:
			errors.append("敵 %s のスケーリングが異常" % e.get("id", "?"))

	## 職業ツリーの整合
	for cid2 in GameData.classtree:
		var rows: Array = GameData.classtree[cid2]
		if rows.size() != 3:
			errors.append("職業ツリー %s が3段でない" % cid2)
		for row in rows:
			for w in ["a", "b"]:
				var nd: Dictionary = row.get(w, {})
				if nd.is_empty():
					errors.append("職業ツリー %s 段%s の %s がない" % [cid2, row.get("tier", "?"), w])
				elif nd.get("skill", "") != "" and GameData.skill(str(nd["skill"])).is_empty():
					errors.append("職業ツリー %s: スキル %s が存在しない" % [cid2, nd["skill"]])

	if errors.is_empty():
		print("[SelfTest] 全項目パス（職業 %d / アクセ %d / 敵 %d）"
			% [GameData.classes.size(), GameData.accessories.size(), GameData.enemies.size()])
	else:
		push_error("[SelfTest] %d 件の問題" % errors.size())
		for e2 in errors:
			push_error("  - " + str(e2))
	return errors
