class_name Visual
extends RefCounted
## 絵を描き足さずに生きて見せるための小道具。
## 1枚絵しか無いので、拡縮・傾き・影で動きを作る。

const SHADOW := Color(0, 0, 0, 0.35)


## 足元の楕円の影。これが有るか無いかで「浮いている／立っている」が変わる
static func draw_shadow(ci: CanvasItem, y: float, radius: float, squash: float = 0.38,
		alpha: float = 1.0) -> void:
	var c := SHADOW
	c.a *= alpha
	ci.draw_set_transform(Vector2(0, y), 0.0, Vector2(1.0, squash))
	ci.draw_circle(Vector2.ZERO, radius, c)
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


## 移動の勢いを、傾き＋縦横の伸縮に変換する
## speed_ratio: 0=停止 1=全速 / bob: 上下の歩行揺れ
static func locomotion(spr: Node2D, vel: Vector2, speed_ratio: float, time: float,
		base_scale: Vector2) -> void:
	var r: float = clampf(speed_ratio, 0.0, 1.0)
	## 走るほど前傾する
	spr.rotation = lerp(spr.rotation, clampf(vel.x, -1.0, 1.0) * 0.16 * r, 0.25)
	## 歩行の上下動と、それに合わせた縦の伸縮
	var phase := sin(time * (8.0 + 6.0 * r))
	var bob := phase * 2.0 * r
	var stretch := 1.0 + phase * 0.06 * r
	spr.position.y = bob
	spr.scale = Vector2(base_scale.x * (2.0 - stretch), base_scale.y * stretch)


## 被弾や踏み込みの一瞬のつぶれ。t は 1→0 で減衰させる
static func impact(spr: Node2D, t: float, base_scale: Vector2, amount: float = 0.35) -> void:
	var k: float = clampf(t, 0.0, 1.0) * amount
	spr.scale = Vector2(base_scale.x * (1.0 + k), base_scale.y * (1.0 - k))
