class_name Player
extends Node2D
## 主人公。移動・斬撃・回避ダッシュ。ビルドの数値がそのまま操作感に効く。

signal hurt_taken(amount: float)
signal died()

var hero: HeroState
var profile: Dictionary = {}
var radius: float = 8.0

var _attack_cd: float = 0.0
var _dash_cd: float = 0.0
var _iframe: float = 0.0
var _aim: Vector2 = Vector2.RIGHT
var _sprite: Sprite2D
var _slash_time: float = 0.0
var _slash_dir: Vector2 = Vector2.RIGHT
var _slash_range: float = 0.0
var _slash_arc: float = 0.0

const DASH_TIME := 0.16
var _dash_time: float = 0.0


func setup(h: HeroState) -> void:
	hero = h
	profile = h.action_profile()
	_sprite = Sprite2D.new()
	_sprite.texture = GameData.sprite("classes", h.class_id)
	_sprite.scale = Vector2(2.5, 2.5)
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_sprite)


func refresh_profile() -> void:
	profile = hero.action_profile()


func is_invulnerable() -> bool:
	return _iframe > 0.0


func tick(delta: float) -> void:
	_attack_cd = maxf(0.0, _attack_cd - delta)
	_dash_cd = maxf(0.0, _dash_cd - delta)
	_iframe = maxf(0.0, _iframe - delta)
	_dash_time = maxf(0.0, _dash_time - delta)
	_slash_time = maxf(0.0, _slash_time - delta)

	var dir := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))
			- float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))
			- float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	if dir.length() > 0.0:
		dir = dir.normalized()
		_aim = dir

	var spd: float = float(profile.get("move_speed", 150.0))
	if _dash_time > 0.0:
		spd *= 3.2
	global_position += dir * spd * delta

	## ダッシュ（回避率が高いほど無敵時間が伸びる）
	if Input.is_key_pressed(KEY_SHIFT) and _dash_cd <= 0.0 and dir.length() > 0.0:
		_dash_cd = 1.1
		_dash_time = DASH_TIME
		_iframe = DASH_TIME + float(hero.stats["evade"]) * 0.5

	if is_instance_valid(_sprite):
		_sprite.modulate = Color(1, 1, 1, 0.45) if _iframe > 0.0 else Color.WHITE
		if _aim.x != 0.0:
			_sprite.flip_h = _aim.x < 0.0
	queue_redraw()


## 斬撃が出せるなら、扇形の判定範囲を返す。出せないなら null。
func try_attack() -> Dictionary:
	if _attack_cd > 0.0:
		return {}
	_attack_cd = float(profile.get("attack_cooldown", 0.5))
	_slash_range = 34.0 + float(profile.get("splash_radius", 16.0)) * 0.55
	_slash_arc = deg_to_rad(70.0 + float(hero.stats["aoe_ratio"]) * 130.0)
	_slash_dir = _aim
	_slash_time = 0.14
	return {"dir": _slash_dir, "range": _slash_range, "arc": _slash_arc}


func take_damage(amount: float) -> float:
	if _iframe > 0.0:
		return 0.0
	if randf() < float(hero.stats["evade"]):
		return -1.0                       ## 回避
	var dealt := amount
	if hero.active_flags.has("wardAll"):
		dealt *= 0.85
	if hero.active_flags.has("lastStand") and hero.hp / float(hero.stats["max_hp"]) <= 0.5:
		dealt *= 0.75
	dealt = maxf(1.0, dealt * (1.0 - float(hero.stats["dr"])))
	hero.hp -= dealt
	_iframe = 0.35
	hurt_taken.emit(dealt)
	if hero.hp <= 0.0:
		hero.hp = 0.0
		died.emit()
	return dealt


func _draw() -> void:
	if _slash_time <= 0.0:
		return
	## 斬撃の扇。範囲ビルドほど広く長くなるので、ビルドが見た目で分かる
	var pts := PackedVector2Array()
	pts.append(Vector2.ZERO)
	var steps := 10
	var base := _slash_dir.angle()
	for i in range(steps + 1):
		var a := base - _slash_arc * 0.5 + _slash_arc * (float(i) / float(steps))
		pts.append(Vector2(cos(a), sin(a)) * _slash_range)
	var alpha: float = clampf(_slash_time / 0.14, 0.0, 1.0) * 0.45
	draw_colored_polygon(pts, Color(0.75, 0.9, 1.0, alpha))
