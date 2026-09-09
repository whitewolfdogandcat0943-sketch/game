class_name SkillRunner
extends RefCounted
## スキルの発動。data/skills.json をアクションの文脈で解釈する。
##
## ターン制の「単体／全体／自分」を、アクションでは
##   単体   → 狙っている方向の最寄りの敵
##   全体   → 画面内の全ての敵
##   ランダム→ 画面内からランダムに hits 回
## と読み替える。威力や効果の数値はWeb版のまま使う。

var main: Node2D


func setup(m: Node2D) -> void:
	main = m


func can_cast(skill_id: String) -> bool:
	var sk: Dictionary = GameData.skill(skill_id)
	if sk.is_empty():
		return false
	return main.hero.mp >= float(sk.get("mp", 0))


func cast(skill_id: String) -> bool:
	var sk: Dictionary = GameData.skill(skill_id)
	if sk.is_empty() or not can_cast(skill_id):
		return false

	var hero: HeroState = main.hero
	hero.mp -= float(sk.get("mp", 0))
	var eff: Dictionary = sk.get("eff", {})
	var kind: String = sk.get("kind", "phys")

	main.hud.show_toast("【%s】" % sk.get("name", skill_id))

	if kind == "phys" or kind == "mag":
		_offensive(sk, eff)
	elif kind == "heal":
		var p := float(sk.get("power", 100))
		if sk.get("special", "") == "itemScale":
			p *= 1.0 + float(hero.stats["item_power"])
		main.heal_player(float(hero.stats["mag"]) * p / 100.0 + float(hero.stats["max_hp"]) * 0.05)

	## 付随効果（攻撃・支援を問わず処理する）
	if eff.has("healMaxPct"):
		main.heal_player(float(hero.stats["max_hp"]) * float(eff["healMaxPct"]))
	if eff.has("healSelf"):
		main.heal_player(float(hero.stats["mag"]) * float(eff["healSelf"]))
	if eff.has("mpGain"):
		hero.mp = minf(float(hero.stats["max_mp"]), hero.mp + float(eff["mpGain"]))
	if eff.has("barrier"):
		main.add_barrier(float(hero.stats["mag"]) * float(eff["barrier"]) + float(hero.stats["max_hp"]) * 0.05)
	if eff.has("buffs"):
		for b in eff["buffs"]:
			hero.add_buff(str(b["k"]), float(b["v"]), float(b["t"]) * 2.0)   ## 1ターン≒2秒
	if eff.has("flagBuff"):
		var fb: Dictionary = eff["flagBuff"]
		hero.add_flag(str(fb.get("f", "")), float(fb.get("t", 3)) * 2.0)
	if eff.has("hpCost"):
		hero.hp = maxf(1.0, hero.hp - float(hero.stats["max_hp"]) * float(eff["hpCost"]))
	if eff.has("cleanse"):
		pass
	return true


func _offensive(sk: Dictionary, eff: Dictionary) -> void:
	var hero: HeroState = main.hero
	var targets := _targets(sk)
	if targets.is_empty():
		return

	var power := float(sk.get("power", 100))
	var special: String = sk.get("special", "")
	var atk_override := -1.0

	match special:
		"hybrid":
			atk_override = (float(hero.stats["atk"]) + float(hero.stats["mag"])) / 2.0 * 1.15
		"speedScale":
			atk_override = float(hero.stats["atk"]) + float(hero.stats["spd"]) * 0.8
		"reflectScale":
			atk_override = float(hero.stats["atk"]) + float(hero.stats["def"]) * 1.1
			power *= 1.0 + float(hero.stats["reflect"]) * 2.4 + float(hero.stats["reflect_pow"])
		"itemScale":
			power *= 1.0 + float(hero.stats["item_power"])
		"mythicScale":
			power *= 1.0 + 0.45 * float(hero.rarity_count("mythic"))

	var elements: Array = [sk.get("el", "phys")]
	if special == "allElem":
		elements = GameData.magic_elements.duplicate()

	var hits: int = int(sk.get("hits", 1))
	var is_aoe: bool = sk.get("target", "one") == "all"

	for el in elements:
		for h in hits:
			var cur_el: String = el
			if eff.has("altElement") and h % 2 == 1:
				cur_el = str(eff["altElement"])
			for t in targets:
				if not is_instance_valid(t):
					continue
				main.hit_enemy_with(t, power, cur_el, sk.get("kind", "phys"), is_aoe, {
					"crit_bonus": float(eff.get("critBonus", 0.0)),
					"crit_bonus_dmg": float(eff.get("critBonusDmg", 0.0)),
					"always_crit": eff.get("alwaysCrit", false),
					"def_ignore": float(eff.get("defIgnore", 0.0)),
					"aoe_bonus": float(eff.get("aoeBonus", 0.0)),
					"drain": float(eff.get("drain", 0.0)),
					"atk_override": atk_override,
					"execute": float(eff.get("execute", 0.0)),
					"full_pierce": eff.get("fullPierce", false),
				})

	## 単体スキルの波及（範囲ビルドと splashBonus を持つスキルの分）
	if not is_aoe:
		var splash := float(hero.stats["aoe_ratio"]) + float(eff.get("splashBonus", 0.0))
		if splash > 0.0 and targets.size() == 1:
			var center: Object = targets[0]
			for o in main.living_enemies():
				if o == center:
					continue
				if (o.global_position - center.global_position).length() > 90.0:
					continue
				main.hit_enemy_with(o, power * splash, str(elements[0]), sk.get("kind", "phys"), true, {})

	## 状態異常と弱体
	for t in targets:
		if not is_instance_valid(t):
			continue
		_apply_status(t, eff)
		if eff.has("debuff"):
			var db: Dictionary = eff["debuff"]
			t.add_debuff(str(db.get("k", "")), float(db.get("v", 0.0)), float(db.get("t", 3)) * 2.0)


func _apply_status(t: Object, eff: Dictionary) -> void:
	var lingering: bool = main.hero.active_flags.has("lingering")
	for key in ["burn", "poison", "freeze", "shock"]:
		if not eff.has(key):
			continue
		var e: Dictionary = eff[key]
		var chance := float(e.get("c", 1.0))
		if randf() >= chance:
			continue
		StatusFx.apply(t, key, float(e.get("t", 2)) * 2.0, float(e.get("v", 0.06)), lingering)
		main.on_status_applied()


func _targets(sk: Dictionary) -> Array:
	var mode: String = sk.get("target", "one")
	var all: Array = main.living_enemies()
	if all.is_empty():
		return []
	match mode:
		"all":
			return all
		"random":
			return [all[randi() % all.size()]]
		_:
			return [main.nearest_enemy()]
