class_name StatusFx
extends RefCounted
## 敵に乗る状態異常。Web版と同じ4種（火傷・毒・凍結・麻痺）。

const NAMES := {
	"burn": "火傷", "poison": "毒", "freeze": "凍結", "shock": "麻痺",
}
const COLORS := {
	"burn": Color(1.0, 0.48, 0.27), "poison": Color(0.75, 0.55, 1.0),
	"freeze": Color(0.39, 0.85, 1.0), "shock": Color(1.0, 0.88, 0.4),
}


## 継続ダメージと鈍化を処理し、発生したダメージを返す
static func tick(target: Object, delta: float) -> float:
	var total := 0.0
	var expired: Array = []
	for k in target.statuses:
		var st: Dictionary = target.statuses[k]
		st["t"] = float(st["t"]) - delta
		if k == "burn" or k == "poison":
			st["acc"] = float(st.get("acc", 0.0)) + delta
			if st["acc"] >= 1.0:
				st["acc"] = float(st["acc"]) - 1.0
				total += maxf(1.0, target.max_hp * float(st.get("v", 0.05)))
		if float(st["t"]) <= 0.0:
			expired.append(k)
	for k in expired:
		target.statuses.erase(k)
	return total


static func speed_mult(target: Object) -> float:
	if target.statuses.has("freeze"):
		return 0.4
	if target.statuses.has("shock"):
		return 0.0            ## 麻痺中は動けない
	return 1.0


static func apply(target: Object, kind: String, turns: float, value: float = 0.06,
		lingering: bool = false) -> void:
	var dur := turns + (1.0 if lingering else 0.0)
	if target.statuses.has(kind):
		target.statuses[kind]["t"] = maxf(float(target.statuses[kind]["t"]), dur)
	else:
		target.statuses[kind] = {"t": dur, "v": value, "acc": 0.0}
