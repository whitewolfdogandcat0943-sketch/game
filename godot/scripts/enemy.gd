class_name Enemy
extends Node2D
## 敵。物理エンジンは使わず、距離判定だけで当たりを取る（挙動が読みやすく壊れにくい）。

signal died(enemy: Enemy)

var def_data: Dictionary = {}
var max_hp: float = 10.0
var hp: float = 10.0
var atk: float = 10.0
var mag: float = 10.0
var defense: float = 0.0
var res: float = 0.0
var speed: float = 40.0
var weak: Array = []
var resist: Array = []
var is_boss: bool = false
var exp_value: int = 0
var gold_value: int = 0
var radius: float = 9.0

var statuses: Dictionary = {}
var debuffs: Array = []                    ## [{k, v, t}] 攻撃/防御/素早さの弱体
var knockback: Vector2 = Vector2.ZERO
var attack_cd: float = 2.0
var pending_shot: bool = false
var _hit_flash: float = 0.0
var _telegraph: float = 0.0
var _impact: float = 0.0
var _time: float = 0.0
var _base_scale: Vector2 = Vector2(2.0, 2.0)
var _move_dir: Vector2 = Vector2.ZERO
var _contact_cd: float = 0.0
var _sprite: Sprite2D


## 階層に応じたスケール。js/core/battle.js の enemyScale と同じ考え方
## （敵ごとの「適正階層」からの差分でスケールさせ、急な跳ね上がりを防ぐ）。
const HOME_MOB := {1: 1, 2: 6, 3: 13}
const HOME_BOSS := {1: 5, 2: 10, 3: 15}


static func scale_for(d: Dictionary, floor_no: int) -> Dictionary:
	var tier: int = int(d.get("tier", 1))
	var home: int = int((HOME_BOSS if d.get("boss", false) else HOME_MOB).get(tier, 1))
	var rel: float = maxf(-1.0, float(floor_no - home))
	var r: float = maxf(0.0, rel)
	return {
		"hp": maxf(0.6, 1.0 + rel * 0.20 + pow(r, 1.45) * 0.018),
		"pw": (1.0 if d.get("boss", false) else 0.88) * maxf(0.7, 1.0 + rel * 0.10 + pow(r, 1.30) * 0.006),
		"df": maxf(0.7, 1.0 + rel * 0.11),
		"rw": 1.0 + maxf(0.0, float(floor_no - 1)) * 0.26,
	}


func setup(d: Dictionary, floor_no: int) -> void:
	def_data = d
	var s := scale_for(d, floor_no)
	max_hp = round(float(d.get("hp", 10)) * s["hp"])
	hp = max_hp
	atk = round(float(d.get("atk", 10)) * s["pw"])
	mag = round(float(d.get("mag", 10)) * s["pw"])
	defense = round(float(d.get("def", 0)) * s["df"])
	res = round(float(d.get("res", 0)) * s["df"])
	speed = 26.0 + float(d.get("spd", 10)) * 1.6
	weak = d.get("weak", [])
	resist = d.get("resist", [])
	is_boss = d.get("boss", false)
	exp_value = int(round(float(d.get("exp", 5)) * s["rw"]))
	gold_value = int(round(float(d.get("gold", 5)) * s["rw"]))
	radius = 14.0 if is_boss else 9.0

	_sprite = Sprite2D.new()
	_sprite.texture = GameData.sprite("enemies", d.get("id", ""))
	_base_scale = Vector2(3.0, 3.0) if is_boss else Vector2(2.0, 2.0)
	_sprite.scale = _base_scale
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_sprite)


func hurt(amount: float, push: Vector2 = Vector2.ZERO) -> void:
	hp -= amount
	_hit_flash = 0.16
	_impact = 1.0
	knockback += push
	if hp <= 0.0:
		died.emit(self)
		queue_free()


func has_status() -> bool:
	return not statuses.is_empty()


## 攻撃の予備動作に入る（プレイヤーに避ける猶予を与えるための予告）
func begin_telegraph() -> void:
	_telegraph = 0.45


func is_telegraphing() -> bool:
	return _telegraph > 0.0


func can_touch() -> bool:
	return _contact_cd <= 0.0


func touched() -> void:
	_contact_cd = 0.7


## 継続ダメージが出たらその値を返す（撃破判定は呼び出し側）
func tick(delta: float, target: Vector2) -> float:
	_time += delta
	_contact_cd = maxf(0.0, _contact_cd - delta)
	_hit_flash = maxf(0.0, _hit_flash - delta)
	_telegraph = maxf(0.0, _telegraph - delta)
	_impact = maxf(0.0, _impact - delta * 6.0)
	attack_cd = maxf(0.0, attack_cd - delta)

	var dot := StatusFx.tick(self, delta)

	for d in debuffs:
		d["t"] = float(d["t"]) - delta
	debuffs = debuffs.filter(func(d: Dictionary) -> bool: return float(d["t"]) > 0.0)

	## ノックバック（減衰させながら押される）
	if knockback.length() > 1.0:
		global_position += knockback * delta
		knockback = knockback.lerp(Vector2.ZERO, minf(1.0, delta * 7.0))
	else:
		knockback = Vector2.ZERO

	var mult := StatusFx.speed_mult(self)
	if _telegraph > 0.0:
		mult *= 0.2
	var dir := (target - global_position)
	_move_dir = Vector2.ZERO
	if dir.length() > 1.0 and mult > 0.0:
		_move_dir = dir.normalized()
		global_position += _move_dir * speed * mult * delta

	if is_instance_valid(_sprite):
		if _hit_flash > 0.0:
			_sprite.modulate = Color(2.4, 2.4, 2.4)
		elif _telegraph > 0.0:
			_sprite.modulate = Color(1.6, 0.9, 0.9)
		elif statuses.has("freeze"):
			_sprite.modulate = Color(0.7, 0.9, 1.3)
		elif statuses.has("shock"):
			_sprite.modulate = Color(1.3, 1.25, 0.7)
		elif statuses.has("poison") or statuses.has("burn"):
			_sprite.modulate = Color(1.2, 0.95, 1.05)
		else:
			_sprite.modulate = Color.WHITE
		## 1枚絵なので、傾きと伸縮で歩いているように見せる
		if _impact > 0.0:
			Visual.impact(_sprite, _impact, _base_scale, 0.32)
		else:
			Visual.locomotion(_sprite, _move_dir, _move_dir.length() * mult, _time, _base_scale)
		if _telegraph > 0.0:
			## 撃つ直前だけ大きく膨らませる（予告が目で分かるように）
			var k := 1.0 + sin(_time * 34.0) * 0.10
			_sprite.scale = _base_scale * k
		if _move_dir.x != 0.0:
			_sprite.flip_h = _move_dir.x < 0.0
	queue_redraw()
	return dot


func add_debuff(key: String, value: float, duration: float) -> void:
	debuffs.append({"k": key, "v": value, "t": duration})


func _debuff_sum(key: String) -> float:
	var v := 0.0
	for d in debuffs:
		if d["k"] == key:
			v += float(d["v"])
	return v


func _draw() -> void:
	Visual.draw_shadow(self, radius + 4.0, radius * 0.95, 0.38)
	## 予備動作中は足元に赤い輪を出す（何か来ると分かる）
	if _telegraph > 0.0:
		draw_arc(Vector2(0, radius + 4.0), radius * 1.6, 0.0, TAU, 20,
			Color(1.0, 0.35, 0.35, 0.7), 2.0)


func stat_block() -> Dictionary:
	var dm := 1.0 + _debuff_sum("defPct")
	return {
		"def": maxf(0.0, defense * dm),
		"res": maxf(0.0, res * (1.0 + _debuff_sum("resPct"))),
		"weak": weak, "resist": resist, "dr": 0.0,
	}


## 弱体を含めた実効攻撃力（プレイヤーへのダメージに使う）
func effective_atk() -> float:
	return maxf(1.0, atk * (1.0 + _debuff_sum("atkPct")))
