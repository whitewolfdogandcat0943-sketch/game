class_name Combat
extends RefCounted
## ダメージ計算。js/core/battle.js の strike() を移植したもの。
## 会心・属性相性・耐性貫通・防御・被ダメ軽減の順序を Web版と揃えてある。

## atk: {atk, mag, crit_rate, crit_dmg, pierce, dmg_up, el_*}
## tgt: {def, res, weak, resist, dr}
## opt: {power, kind("phys"/"mag"), el, crit_bonus, crit_bonus_dmg, always_crit,
##       def_ignore, is_aoe, aoe_bonus, extra_dmg_up}
static func resolve(atk: Dictionary, flags: Dictionary, tgt: Dictionary, opt: Dictionary) -> Dictionary:
	var kind: String = opt.get("kind", "phys")
	var el: String = opt.get("el", "phys")
	var power: float = float(opt.get("power", 100.0))

	var atk_stat: float = float(atk.get("mag", 0)) if kind == "mag" else float(atk.get("atk", 0))
	var def_stat: float = float(tgt.get("res", 0)) if kind == "mag" else float(tgt.get("def", 0))

	var dmg: float = atk_stat * (power / 100.0)
	dmg *= 1.0 + float(atk.get("el_" + el, 0.0))

	var e_mult := GameData.element_mult(
		el, tgt.get("weak", []), tgt.get("resist", []),
		float(atk.get("pierce", 0.0)), flags.has("guardBreak"))
	if e_mult > 1.0 and flags.has("weakHunter"):
		e_mult *= 1.30
	dmg *= e_mult

	dmg *= 1.0 + float(atk.get("dmg_up", 0.0)) + float(opt.get("extra_dmg_up", 0.0))
	if opt.get("is_aoe", false):
		dmg *= 1.0 + float(atk.get("aoe_power", 0.0)) + float(opt.get("aoe_bonus", 0.0))

	var crit_rate: float = float(atk.get("crit_rate", 0.0)) + float(opt.get("crit_bonus", 0.0))
	var is_crit: bool = opt.get("always_crit", false) or randf() < crit_rate
	var def_ignore: float = float(opt.get("def_ignore", 0.0))
	if is_crit:
		dmg *= float(atk.get("crit_dmg", 1.5)) + float(opt.get("crit_bonus_dmg", 0.0))
		if flags.has("critPierce"):
			def_ignore = maxf(def_ignore, 0.5)

	dmg *= 100.0 / (100.0 + maxf(0.0, def_stat) * (1.0 - clampf(def_ignore, 0.0, 1.0)))
	dmg *= randf_range(0.93, 1.07)
	dmg *= 1.0 - float(tgt.get("dr", 0.0))

	return {"damage": maxi(1, int(round(dmg))), "crit": is_crit, "element": el}


## 状況によって乗る与ダメージ補正（js側の damageMods 相当）
static func situational_bonus(flags: Dictionary, self_hp_ratio: float,
		target_hp_ratio: float, target_is_boss: bool, target_has_status: bool,
		enemy_count: int, mythic_count: int, kill_stacks: int, mp_ratio: float) -> float:
	var extra := 0.0
	if flags.has("lowHpRage") and self_hp_ratio <= 0.30:
		extra += 0.60
	if flags.has("mythicScaling"):
		extra += 0.10 * float(mythic_count)
	if flags.has("stackAtkOnKill"):
		extra += 0.06 * float(kill_stacks)
	if flags.has("manaPower"):
		extra += 0.30 * clampf(mp_ratio, 0.0, 1.0)
	if flags.has("executeLow") and target_hp_ratio <= 0.25:
		extra += 0.60
	if flags.has("bossSlayer") and target_is_boss:
		extra += 0.25
	if flags.has("statusDamage") and target_has_status:
		extra += 0.35
	if flags.has("hordeSlayer") and enemy_count >= 3:
		extra += 0.22
	if flags.has("soloFocus") and enemy_count == 1:
		extra += 0.40
	return extra
