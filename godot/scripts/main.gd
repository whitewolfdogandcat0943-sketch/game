extends Node2D
## アリーナ1面ぶんの縦切り（バーティカルスライス）。
## ビルドの数値（会心・属性・範囲・反射・吸収）が、そのまま操作と手応えに反映される。
##
## 操作: WASD/矢印=移動  Space または 左クリック=斬撃  Shift=回避ダッシュ  Tab=ビルド表示

enum State { TITLE, PLAYING, GAMEOVER }

const ARENA := Rect2(Vector2(40, 70), Vector2(880, 440))

var state: int = State.TITLE
var hero: HeroState
var player: Player
var hud: Hud
var enemies: Array[Enemy] = []
var floor_no: int = 1
var kill_stacks: int = 0

var _title_root: Control
var _spawn_left: int = 0


func _ready() -> void:
	randomize()
	hud = Hud.new()
	add_child(hud)
	hud.visible = false
	_build_title()


## ---------------- タイトル（職業選択） ----------------

func _build_title() -> void:
	_title_root = Control.new()
	_title_root.size = Vector2(960, 540)
	add_child(_title_root)

	var t := Label.new()
	t.text = "相剋のビルドサーガ  ACTION"
	UiTheme.apply(t, 30, Color(1.0, 0.81, 0.42))
	t.position = Vector2(60, 60)
	_title_root.add_child(t)

	var sub := Label.new()
	sub.text = "はじまりの職を選ぶ（1〜4キー）\n移動 WASD ／ 斬撃 Space・左クリック ／ 回避 Shift ／ ビルド Tab"
	UiTheme.apply(sub, 14, Color(0.6, 0.64, 0.75))
	sub.position = Vector2(60, 108)
	_title_root.add_child(sub)

	var starters := ["swordsman", "mage", "rogue", "priest"]
	for i in starters.size():
		var cid: String = starters[i]
		var cls := GameData.klass(cid)
		var x := 70.0 + float(i) * 210.0

		var spr := Sprite2D.new()
		spr.texture = GameData.sprite("classes", cid)
		spr.scale = Vector2(5, 5)
		spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		spr.position = Vector2(x + 60.0, 260.0)
		_title_root.add_child(spr)

		var nm := Label.new()
		nm.text = "%d. %s" % [i + 1, cls.get("name", cid)]
		UiTheme.apply(nm, 18)
		nm.position = Vector2(x, 330)
		_title_root.add_child(nm)

		var ds := Label.new()
		ds.text = str(cls.get("desc", ""))
		ds.position = Vector2(x, 358)
		ds.size = Vector2(190, 120)
		ds.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		UiTheme.apply(ds, 12, Color(0.6, 0.64, 0.75))
		_title_root.add_child(ds)


func _start(cid: String) -> void:
	if is_instance_valid(_title_root):
		_title_root.queue_free()
	hero = HeroState.create(cid)
	player = Player.new()
	player.setup(hero)
	player.global_position = ARENA.get_center()
	player.hurt_taken.connect(_on_player_hurt)
	player.died.connect(_on_player_died)
	add_child(player)
	hud.visible = true
	hud.set_build_text(hero)
	state = State.PLAYING
	_start_floor(1)


## ---------------- 階層とウェーブ ----------------

func _start_floor(n: int) -> void:
	floor_no = n
	for e in enemies:
		if is_instance_valid(e):
			e.queue_free()
	enemies.clear()
	var count: int = 3 + mini(6, n / 2)
	_spawn_left = count
	for i in count:
		_spawn_enemy()
	hud.show_toast("第 %d 階層" % n)


func _enemy_pool() -> Array:
	var t: int = 1 if floor_no <= 5 else (2 if floor_no <= 12 else 3)
	var pool: Array = GameData.enemies.filter(func(e: Dictionary) -> bool:
		return int(e.get("tier", 1)) == t and not e.get("boss", false))
	return pool if pool.size() > 0 else GameData.enemies


func _spawn_enemy() -> void:
	var pool := _enemy_pool()
	var d: Dictionary = pool[randi() % pool.size()]
	var e := Enemy.new()
	e.setup(d, floor_no)
	## 画面外周のどこかから
	var side := randi() % 4
	var p := Vector2.ZERO
	match side:
		0: p = Vector2(randf_range(ARENA.position.x, ARENA.end.x), ARENA.position.y)
		1: p = Vector2(randf_range(ARENA.position.x, ARENA.end.x), ARENA.end.y)
		2: p = Vector2(ARENA.position.x, randf_range(ARENA.position.y, ARENA.end.y))
		_: p = Vector2(ARENA.end.x, randf_range(ARENA.position.y, ARENA.end.y))
	e.global_position = p
	e.died.connect(_on_enemy_died)
	add_child(e)
	enemies.append(e)


## ---------------- 毎フレーム ----------------

func _process(delta: float) -> void:
	if state != State.PLAYING or not is_instance_valid(player):
		return

	player.tick(delta)
	player.global_position = player.global_position.clamp(ARENA.position, ARENA.end)

	if Input.is_key_pressed(KEY_SPACE) or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var swing := player.try_attack()
		if not swing.is_empty():
			_resolve_swing(swing)

	var alive: Array[Enemy] = []
	for e in enemies:
		if not is_instance_valid(e):
			continue
		alive.append(e)
		e.tick(delta, player.global_position)
		_check_contact(e)
	enemies = alive

	hud.set_hero(hero, floor_no, enemies.size())

	if enemies.is_empty():
		_start_floor(floor_no + 1)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var k: int = event.keycode
		if state == State.TITLE:
			var starters := ["swordsman", "mage", "rogue", "priest"]
			if k >= KEY_1 and k <= KEY_4:
				_start(starters[k - KEY_1])
		elif state == State.PLAYING and k == KEY_TAB:
			hud.build_panel.visible = not hud.build_panel.visible
			hud.set_build_text(hero)
		elif state == State.GAMEOVER and k == KEY_ENTER:
			get_tree().reload_current_scene()


## ---------------- 判定 ----------------

func _resolve_swing(swing: Dictionary) -> void:
	var dir: Vector2 = swing["dir"]
	var rng: float = swing["range"]
	var half: float = float(swing["arc"]) * 0.5
	var hit := 0
	for e in enemies:
		if not is_instance_valid(e):
			continue
		var to := e.global_position - player.global_position
		if to.length() > rng + e.radius:
			continue
		if to.length() > 0.1 and absf(dir.angle_to(to.normalized())) > half:
			continue
		_hit_enemy(e, 100.0, false)
		hit += 1
	## 波及: 扇の外にいる敵にも減衰して届く（範囲ビルドの体感）
	var splash: float = float(hero.stats["aoe_ratio"])
	if hit > 0 and splash > 0.0:
		for e in enemies:
			if not is_instance_valid(e):
				continue
			var d := (e.global_position - player.global_position).length()
			if d <= rng + e.radius:
				continue
			if d <= rng + float(player.profile.get("splash_radius", 16.0)):
				_hit_enemy(e, 100.0 * splash, true)


func _hit_enemy(e: Enemy, power: float, is_aoe: bool) -> void:
	var extra := Combat.situational_bonus(
		hero.active_flags,
		hero.hp / maxf(1.0, float(hero.stats["max_hp"])),
		e.hp / maxf(1.0, e.max_hp), e.is_boss, false,
		enemies.size(), hero.rarity_count("mythic"), kill_stacks,
		hero.mp / maxf(1.0, float(hero.stats["max_mp"])))

	var r := Combat.resolve(hero.stats, hero.active_flags, e.stat_block(), {
		"power": power, "kind": "phys", "el": hero.attack_element(),
		"is_aoe": is_aoe, "extra_dmg_up": extra,
	})
	e.hurt(float(r["damage"]))
	_popup(e.global_position, str(r["damage"]),
		Color(1.0, 0.81, 0.42) if r["crit"] else (Color(0.56, 0.94, 0.72) if is_aoe else Color.WHITE))

	## 吸収
	var steal: float = float(hero.stats["lifesteal"])
	if steal > 0.0:
		_heal(float(r["damage"]) * steal)


func _check_contact(e: Enemy) -> void:
	if not e.can_touch():
		return
	var d := (e.global_position - player.global_position).length()
	if d > e.radius + player.radius + 4.0:
		return
	e.touched()

	var raw := Combat.resolve(
		{"atk": e.atk, "mag": e.mag, "crit_rate": 0.05, "crit_dmg": 1.5, "pierce": 0.0},
		{}, {"def": hero.stats["def"], "res": hero.stats["res"], "weak": [], "resist": [], "dr": 0.0},
		{"power": 100.0, "kind": "phys", "el": "phys"})

	var dealt := player.take_damage(float(raw["damage"]))
	if dealt < 0.0:
		_popup(player.global_position, "MISS", Color(0.6, 0.64, 0.75))
		return
	if dealt <= 0.0:
		return
	_popup(player.global_position, str(int(dealt)), Color(1.0, 0.42, 0.45))

	## 反射（接触してきた相手に返す）
	var refl: float = float(player.profile.get("contact_reflect", 0.0))
	if refl > 0.0:
		var back := dealt * refl
		e.hurt(back)
		_popup(e.global_position, str(int(back)), Color(1.0, 0.37, 0.82))
		if hero.active_flags.has("healOnReflect"):
			_heal(back * 0.30)


func _heal(amount: float) -> void:
	if amount <= 0.0:
		return
	hero.hp = minf(float(hero.stats["max_hp"]), hero.hp + amount)


func _popup(pos: Vector2, text: String, color: Color) -> void:
	var p := DamagePopup.new()
	p.setup(text, color)
	p.global_position = pos + Vector2(0, -18)
	add_child(p)


## ---------------- イベント ----------------

func _on_enemy_died(e: Enemy) -> void:
	kill_stacks += 1
	hero.exp += e.exp_value
	hero.gold += e.gold_value
	if hero.active_flags.has("killHeal"):
		_heal(float(hero.stats["max_hp"]) * 0.08)
	_level_up_check()


func _level_up_check() -> void:
	var need := int(round(20.0 * pow(float(hero.level), 1.5) + 14.0 * float(hero.level)))
	while hero.exp >= need:
		hero.exp -= need
		hero.level += 1
		hero.sp += 1
		hero.recompute()
		hero.hp = minf(float(hero.stats["max_hp"]), hero.hp + float(hero.stats["max_hp"]) * 0.5)
		player.refresh_profile()
		hud.show_toast("レベル %d になった（SP+1）" % hero.level)
		hud.set_build_text(hero)
		need = int(round(20.0 * pow(float(hero.level), 1.5) + 14.0 * float(hero.level)))


func _on_player_hurt(_amount: float) -> void:
	pass


func _on_player_died() -> void:
	state = State.GAMEOVER
	var l := Label.new()
	l.text = "力尽きた……　到達 %d階 / Lv%d\nEnter でやり直す" % [floor_no, hero.level]
	UiTheme.apply(l, 24, Color(1.0, 0.42, 0.45))
	l.position = Vector2(320, 240)
	add_child(l)


func _draw() -> void:
	draw_rect(ARENA, Color(0.09, 0.11, 0.17), true)
	draw_rect(ARENA, Color(0.18, 0.21, 0.31), false, 2.0)
