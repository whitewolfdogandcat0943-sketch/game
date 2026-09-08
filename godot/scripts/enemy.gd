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

var _hit_flash: float = 0.0
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
	_sprite.scale = Vector2(3.0, 3.0) if is_boss else Vector2(2.0, 2.0)
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_sprite)


func hurt(amount: float) -> void:
	hp -= amount
	_hit_flash = 0.16
	if hp <= 0.0:
		died.emit(self)
		queue_free()


func can_touch() -> bool:
	return _contact_cd <= 0.0


func touched() -> void:
	_contact_cd = 0.7


func tick(delta: float, target: Vector2) -> void:
	_contact_cd = maxf(0.0, _contact_cd - delta)
	_hit_flash = maxf(0.0, _hit_flash - delta)
	var dir := (target - global_position)
	if dir.length() > 1.0:
		global_position += dir.normalized() * speed * delta
	if is_instance_valid(_sprite):
		_sprite.modulate = Color(2.4, 2.4, 2.4) if _hit_flash > 0.0 else Color.WHITE
		## 待機の微揺れ（Web版と同じく控えめに）
		_sprite.position.y = sin(float(Time.get_ticks_msec()) * 0.004 + global_position.x) * 1.5


func stat_block() -> Dictionary:
	return {"def": defense, "res": res, "weak": weak, "resist": resist, "dr": 0.0}
