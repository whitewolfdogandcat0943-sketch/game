class_name EnemyShot
extends Node2D
## 敵の飛び道具。予備動作のあとに飛んでくるので、回避に意味が生まれる。

var velocity: Vector2 = Vector2.ZERO
var damage: float = 5.0
var element: String = "phys"
var radius: float = 5.0
var life: float = 4.0


func setup(dir: Vector2, speed: float, dmg: float, el: String) -> void:
	velocity = dir.normalized() * speed
	damage = dmg
	element = el


func tick(delta: float) -> void:
	global_position += velocity * delta
	life -= delta
	queue_redraw()
	if life <= 0.0:
		queue_free()


func _draw() -> void:
	var c := Color(1.0, 0.45, 0.45)
	match element:
		"fire": c = Color(1.0, 0.48, 0.27)
		"ice": c = Color(0.39, 0.85, 1.0)
		"thunder": c = Color(1.0, 0.88, 0.4)
		"wind": c = Color(0.56, 0.94, 0.72)
		"light": c = Color(1.0, 0.95, 0.77)
		"dark": c = Color(0.75, 0.55, 1.0)
	draw_circle(Vector2.ZERO, radius, c)
	draw_circle(Vector2.ZERO, radius * 0.5, Color(1, 1, 1, 0.8))
