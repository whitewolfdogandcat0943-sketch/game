class_name HeroState
extends RefCounted
## 主人公のビルド状態と、そこから派生するステータスの算出。
## js/core/stats.js の compute() を移植したもの。数式は意図的に同じにしてある。

const BASE_KEYS := ["hp", "mp", "str", "int", "vit", "agi", "luk"]

var hero_name: String = "冒険者"
var class_id: String = "swordsman"
var class_history: Array = []
var level: int = 1
var exp: int = 0
var gold: int = 120
var sp: int = 2
var hp: float = 1.0
var mp: float = 1.0

var weapon_id: String = ""
var armor_id: String = ""
var acc_ids: Array = ["", "", "", ""]      ## アクセサリ4枠
var bag_gear: Array = []                   ## 所持している武器・防具のID
var bag_acc: Array = []                    ## 所持しているアクセサリのID
var items: Dictionary = {}                 ## 消耗品 id -> 個数
var barrier: float = 0.0                   ## バリア（ダメージを肩代わりする）
var temp_buffs: Array = []                 ## 戦闘中の一時強化 [{k, v, t}]
var temp_flags: Array = []                 ## 戦闘中の一時フラグ [{f, t}]
var tree_nodes: Dictionary = {}            ## 共通ツリー: node_id -> true
var mastery: Dictionary = {}               ## 職業ツリー: class_id -> {wins:int, picks:{tier:"a"/"b"}}

## 直近の算出結果
var stats: Dictionary = {}
var active_flags: Dictionary = {}


static func create(cid: String, nm: String = "冒険者") -> HeroState:
	var h := HeroState.new()
	h.class_id = cid
	h.hero_name = nm
	var starter := {
		"swordsman": ["w_shortsword", "a_chain"],
		"mage": ["w_oakstaff", "a_robe"],
		"rogue": ["w_dagger", "a_leather"],
		"priest": ["w_mace", "a_leather"],
	}.get(cid, ["w_shortsword", "a_leather"])
	h.weapon_id = starter[0]
	h.armor_id = starter[1]
	h.bag_gear = [starter[0], starter[1]]
	h.bag_acc = ["n_luckcoin"]
	h.acc_ids[0] = "n_luckcoin"
	h.items = {"i_potion": 3, "i_herb": 2}
	h.recompute()
	h.hp = h.stats["max_hp"]
	h.mp = h.stats["max_mp"]
	return h


## ---------------- 基礎値 ----------------

func base_stats() -> Dictionary:
	var cls: Dictionary = GameData.klass(class_id)
	var base: Dictionary = cls.get("base", {})
	var grow: Dictionary = cls.get("grow", {})
	var out: Dictionary = {}
	for k in BASE_KEYS:
		out[k] = float(base.get(k, 0)) + float(grow.get(k, 0)) * float(level - 1)
	## 転職前の職業からは基礎値の15%を引き継ぐ
	for cid in class_history:
		if cid == class_id:
			continue
		var c: Dictionary = GameData.klass(cid)
		if c.is_empty():
			continue
		var cb: Dictionary = c.get("base", {})
		var cg: Dictionary = c.get("grow", {})
		for k in BASE_KEYS:
			out[k] += (float(cb.get(k, 0)) + float(cg.get(k, 0)) * float(level - 1)) * 0.15
	return out


## ---------------- ビルド集計 ----------------

func _take(mods: Dictionary, flags: Dictionary, src: Dictionary) -> void:
	if src.is_empty():
		return
	var m: Variant = src.get("mods", null)
	if m is Dictionary:
		for k in m:
			mods[k] = float(mods.get(k, 0.0)) + float(m[k])
	var f: Variant = src.get("flags", null)
	if f is Array:
		for name in f:
			flags[name] = true


func equipped_accessories() -> Array:
	var out: Array = []
	for id in acc_ids:
		if id != "" and GameData.acc_by_id.has(id):
			out.append(GameData.acc_by_id[id])
	return out


func rarity_count(rarity: String) -> int:
	var n := 0
	for a in equipped_accessories():
		if a.get("rarity", "") == rarity:
			n += 1
	return n


func class_tree_picks() -> Array:
	var rows: Array = GameData.classtree.get(class_id, [])
	var m: Dictionary = mastery.get(class_id, {})
	var picks: Dictionary = m.get("picks", {})
	var out: Array = []
	for row in rows:
		var key := str(row.get("tier", 0))
		if picks.has(key):
			out.append(row.get(picks[key], {}))
	return out


## 全ての供給源からステータスを算出する。結果は stats / active_flags に入る。
func recompute() -> Dictionary:
	var mods: Dictionary = {}
	var flags: Dictionary = {}

	_take(mods, flags, GameData.klass(class_id))
	if weapon_id != "":
		_take(mods, flags, GameData.gear.get(weapon_id, {}))
	if armor_id != "":
		_take(mods, flags, GameData.gear.get(armor_id, {}))
	for a in equipped_accessories():
		_take(mods, flags, a)
	for nid in tree_nodes:
		if tree_nodes[nid] and GameData.tree_node_by_id.has(nid):
			_take(mods, flags, GameData.tree_node_by_id[nid])
	for nd in class_tree_picks():
		_take(mods, flags, nd)
	for b in temp_buffs:
		mods[b["k"]] = float(mods.get(b["k"], 0.0)) + float(b["v"])
	for tf in temp_flags:
		flags[tf["f"]] = true

	var b := base_stats()
	var s: Dictionary = {}

	s["max_hp"] = round((b["hp"] + b["vit"] * 6.0 + _m(mods, "hp")) * (1.0 + _m(mods, "hpPct")))
	s["max_mp"] = round(b["mp"] + b["int"] * 1.5 + _m(mods, "mp"))
	s["atk"] = round((8.0 + b["str"] * 2.2 + _m(mods, "atk")) * (1.0 + _m(mods, "atkPct")))
	s["mag"] = round((8.0 + b["int"] * 2.2 + _m(mods, "mag")) * (1.0 + _m(mods, "magPct")))
	s["def"] = round((6.0 + b["vit"] * 2.6 + _m(mods, "def")) * (1.0 + _m(mods, "defPct")))
	s["res"] = round(6.0 + b["int"] * 1.3 + b["vit"] * 1.5 + _m(mods, "res"))
	s["spd"] = round(5.0 + b["agi"] * 1.2 + _m(mods, "spd"))

	s["crit_rate"] = clampf(0.05 + b["luk"] * 0.004 + _m(mods, "critRate"), 0.0, 1.0)
	s["crit_dmg"] = maxf(1.1, 1.5 + _m(mods, "critDmg"))
	s["reflect"] = maxf(0.0, _m(mods, "reflect"))
	s["reflect_pow"] = _m(mods, "reflectPow")
	s["aoe_ratio"] = maxf(0.0, _m(mods, "aoeRatio"))
	s["aoe_power"] = _m(mods, "aoePower")
	s["pierce"] = clampf(_m(mods, "pierce"), 0.0, 1.0)
	s["item_power"] = _m(mods, "itemPower")
	s["item_keep"] = clampf(_m(mods, "itemKeep"), 0.0, 0.9)
	s["lifesteal"] = maxf(0.0, _m(mods, "lifesteal"))
	s["dr"] = clampf(_m(mods, "dr"), -1.0, 0.85)
	s["dmg_up"] = _m(mods, "dmgUp")
	s["mp_regen"] = _m(mods, "mpRegen")
	s["gold_up"] = _m(mods, "goldUp")
	s["drop_up"] = _m(mods, "dropUp")
	s["evade"] = clampf(_m(mods, "evade"), 0.0, 0.6)

	for e in GameData.all_elements:
		s["el_" + e] = _m(mods, "el_" + e)

	## フラグによるステータス変換
	if flags.has("speedPower"):
		s["atk"] += round(s["spd"] * 0.40)
	if flags.has("wallPower"):
		s["atk"] += round(s["def"] * 0.35)

	stats = s
	active_flags = flags
	hp = minf(hp, s["max_hp"])
	mp = minf(mp, s["max_mp"])
	return s


func _m(mods: Dictionary, k: String) -> float:
	return float(mods.get(k, 0.0))


## ---------------- 一時強化 ----------------

func add_buff(key: String, value: float, duration: float) -> void:
	temp_buffs.append({"k": key, "v": value, "t": duration})
	recompute()


func add_flag(flag_name: String, duration: float) -> void:
	temp_flags.append({"f": flag_name, "t": duration})
	recompute()


## 期限切れがあれば再計算する。変化があったら true。
func tick_buffs(delta: float) -> bool:
	if temp_buffs.is_empty() and temp_flags.is_empty():
		return false
	for b in temp_buffs:
		b["t"] = float(b["t"]) - delta
	for f in temp_flags:
		f["t"] = float(f["t"]) - delta
	var before := temp_buffs.size() + temp_flags.size()
	temp_buffs = temp_buffs.filter(func(b: Dictionary) -> bool: return float(b["t"]) > 0.0)
	temp_flags = temp_flags.filter(func(f: Dictionary) -> bool: return float(f["t"]) > 0.0)
	if temp_buffs.size() + temp_flags.size() != before:
		recompute()
		return true
	return false


## この職業で使えるスキル（前職のぶんも保持する）
func skill_list() -> Array:
	var out: Array = []
	var ids: Array = class_history.duplicate()
	ids.append(class_id)
	for cid in ids:
		for s in GameData.klass(cid).get("skills", []):
			if not out.has(s):
				out.append(s)
	if weapon_id != "" and GameData.gear.has(weapon_id):
		var g := str(GameData.gear[weapon_id].get("grant", ""))
		if g != "" and not out.has(g):
			out.append(g)
	for nid in tree_nodes:
		var nd: Dictionary = GameData.tree_node_by_id.get(nid, {})
		var sk := str(nd.get("skill", ""))
		if sk != "" and not out.has(sk):
			out.append(sk)
	for nd2 in class_tree_picks():
		var sk2 := str(nd2.get("skill", ""))
		if sk2 != "" and not out.has(sk2):
			out.append(sk2)
	return out


## ---------------- 所持品と装備 ----------------

func add_gear(id: String) -> void:
	if GameData.gear.has(id):
		bag_gear.append(id)


func add_accessory(id: String) -> void:
	if GameData.acc_by_id.has(id):
		bag_acc.append(id)


func add_item(id: String, n: int) -> void:
	items[id] = int(items.get(id, 0)) + n
	if int(items[id]) <= 0:
		items.erase(id)


## スロットに入れられる候補。同じ個体を2箇所に付けることはできない。
func candidates_for(slot: String) -> Array:
	if slot == "weapon" or slot == "armor":
		var out: Array = []
		for id in bag_gear:
			if GameData.gear.get(id, {}).get("slot", "") == slot and not out.has(id):
				out.append(id)
		return out
	## アクセサリ枠: 所持数から他の枠で使っている分を引く
	var idx: int = int(slot.substr(3))
	var counts: Dictionary = {}
	for id in bag_acc:
		counts[id] = int(counts.get(id, 0)) + 1
	var res: Array = []
	for id in counts:
		var used := 0
		for i in acc_ids.size():
			if i != idx and acc_ids[i] == id:
				used += 1
		if int(counts[id]) - used > 0:
			res.append(id)
	return res


func equip(slot: String, id: String) -> void:
	if slot == "weapon":
		weapon_id = id
	elif slot == "armor":
		armor_id = id
	elif slot.begins_with("acc"):
		acc_ids[int(slot.substr(3))] = id
	recompute()


func equipped_in(slot: String) -> String:
	if slot == "weapon":
		return weapon_id
	if slot == "armor":
		return armor_id
	if slot.begins_with("acc"):
		return str(acc_ids[int(slot.substr(3))])
	return ""


## ---------------- 共通スキルツリー ----------------

## その系統に投じたSPの合計
func branch_spent(branch_id: String) -> int:
	var sum := 0
	for br in GameData.tree_branches:
		if str(br.get("id", "")) != branch_id:
			continue
		for nd in br.get("nodes", []):
			if tree_nodes.get(nd["id"], false):
				sum += int(nd.get("cost", 0))
	return sum


func tree_total_spent() -> int:
	var sum := 0
	for nid in tree_nodes:
		if tree_nodes[nid]:
			sum += int(GameData.tree_node_by_id.get(nid, {}).get("cost", 0))
	return sum


## ノードの取得可否を理由付きで返す
func tree_check(node_id: String) -> Dictionary:
	var nd: Dictionary = GameData.tree_node_by_id.get(node_id, {})
	if nd.is_empty():
		return {"ok": false, "owned": false, "reasons": [], "node": {}}
	var owned: bool = tree_nodes.get(node_id, false)
	var reasons: Array = []
	for r in nd.get("req", []):
		reasons.append({
			"label": "「%s」を取得している" % GameData.tree_node_by_id.get(r, {}).get("name", r),
			"ok": tree_nodes.get(r, false)})
	if nd.has("branchSpent"):
		var need := int(nd["branchSpent"])
		reasons.append({
			"label": "この系統に %d SP 以上振っている" % need,
			"ok": branch_spent(str(nd.get("branch", ""))) >= need})
	if nd.has("classes"):
		var held: Array = class_history.duplicate()
		held.append(class_id)
		var names: Array = []
		var ok := false
		for c in nd["classes"]:
			names.append(GameData.klass(str(c)).get("name", c))
			if held.has(c):
				ok = true
		reasons.append({"label": "職業: " + " / ".join(names), "ok": ok})
	reasons.append({"label": "SP %d が残っている" % int(nd.get("cost", 0)),
		"ok": sp >= int(nd.get("cost", 0))})

	var all_ok := true
	for r2 in reasons:
		if not r2["ok"]:
			all_ok = false
	return {"ok": (not owned) and all_ok, "owned": owned, "reasons": reasons, "node": nd}


func tree_take(node_id: String) -> bool:
	var c := tree_check(node_id)
	if not c["ok"]:
		return false
	tree_nodes[node_id] = true
	sp -= int(c["node"].get("cost", 0))
	recompute()
	return true


func tree_respec_cost() -> int:
	var spent := tree_total_spent()
	return 0 if spent == 0 else 60 + spent * 25


func tree_respec() -> void:
	sp += tree_total_spent()
	tree_nodes = {}
	recompute()


## ---------------- 職業ツリー（習熟） ----------------

const MASTERY_NEED := [2, 5, 9]


func mastery_wins(cid: String) -> int:
	return int(mastery.get(cid, {}).get("wins", 0))


func mastery_picks(cid: String) -> Dictionary:
	return mastery.get(cid, {}).get("picks", {})


func mastery_gain(cid: String, amount: int) -> int:
	if not mastery.has(cid):
		mastery[cid] = {"wins": 0, "picks": {}}
	mastery[cid]["wins"] = int(mastery[cid]["wins"]) + amount
	return int(mastery[cid]["wins"])


func mastery_unlocked(cid: String, tier: int) -> bool:
	return mastery_wins(cid) >= MASTERY_NEED[tier - 1]


## 各段は片方しか選べない（同じ職業でも分岐するのがこのツリーの狙い）
func mastery_pick(tier: int, which: String) -> bool:
	if not GameData.classtree.has(class_id):
		return false
	if not mastery_unlocked(class_id, tier):
		return false
	if mastery_picks(class_id).has(str(tier)):
		return false
	if not mastery.has(class_id):
		mastery[class_id] = {"wins": 0, "picks": {}}
	mastery[class_id]["picks"][str(tier)] = which
	recompute()
	return true


func mastery_respec_cost() -> int:
	var n := mastery_picks(class_id).size()
	return 0 if n == 0 else 120 + n * 90


func mastery_respec() -> void:
	if mastery.has(class_id):
		mastery[class_id]["picks"] = {}
	recompute()


## 通常攻撃の属性（武器依存）
func attack_element() -> String:
	if weapon_id != "" and GameData.gear.has(weapon_id):
		return GameData.gear[weapon_id].get("el", "phys")
	return "phys"


## ---------------- アクション用のパラメータ ----------------
## ビルドの数値を、そのまま操作感に翻訳する橋渡し。
func action_profile() -> Dictionary:
	var s := stats
	return {
		"move_speed": 130.0 + float(s["spd"]) * 0.85,
		"attack_cooldown": clampf(0.80 - float(s["spd"]) * 0.0022, 0.16, 0.90),
		"shot_speed": 240.0 + float(s["spd"]) * 0.7,
		"splash_radius": 16.0 + float(s["aoe_ratio"]) * 95.0,
		"pierce_count": int(floor(float(s["aoe_ratio"]) * 3.0)),
		"contact_reflect": float(s["reflect"]) * (1.0 + float(s["reflect_pow"])),
		"element": attack_element(),
	}
