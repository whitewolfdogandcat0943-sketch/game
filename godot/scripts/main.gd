extends Node2D
## アリーナの縦切り（バーティカルスライス）。
## ビルドの数値（会心・属性・範囲・反射・吸収・状態異常）が、そのまま操作と手応えに反映される。
##
## 操作: WASD/矢印=移動  Space/左クリック=斬撃  1〜4=スキル  Shift=回避ダッシュ  Tab=ビルド表示

enum State { TITLE, PLAYING, GAMEOVER }

const ARENA := Rect2(Vector2(40, 70), Vector2(880, 440))
const STARTERS := ["swordsman", "mage", "rogue", "priest"]

var state: int = State.TITLE
var hero: HeroState
var player: Player
var hud: Hud
var runner: SkillRunner
var enemies: Array = []
var shots: Array = []
var floor_no: int = 1
var kill_stacks: int = 0
var skill_slots: Array = []
var slot_cd: Array = [0.0, 0.0, 0.0, 0.0]

var equip_screen: EquipScreen
var paused: bool = false
var _title_root: Control
var _hitstop: float = 0.0
var _shake: float = 0.0
var _status_applied: int = 0


func _ready() -> void:
	randomize()
	hud = Hud.new()
	add_child(hud)
	hud.visible = false
	if GameData.classes.is_empty():
		_fatal("data/*.json が読み込めていません。エディタで一度プロジェクトを開き直してください。")
		return
	if OS.is_debug_build():
		var errs := SelfTest.run()
		if not errs.is_empty():
			_show_self_test_errors(errs)
	_build_title()


## 自己診断で問題が出たら画面にも出す（出力ログを見なくても気づけるように）
func _show_self_test_errors(errs: Array) -> void:
	var l := Label.new()
	var head := "⚠ 自己診断で %d 件の問題（詳細は出力ログ）\n" % errs.size()
	l.text = head + "\n".join(errs.slice(0, 6))
	UiTheme.apply(l, 12, Color(1.0, 0.62, 0.26))
	l.position = Vector2(20, 470)
	add_child(l)


func _fatal(msg: String) -> void:
	var l := Label.new()
	l.text = "起動できません\n" + msg
	UiTheme.apply(l, 18, Color(1.0, 0.42, 0.45))
	l.position = Vector2(60, 240)
	add_child(l)


## ---------------- タイトル（職業選択） ----------------

func _build_title() -> void:
	_title_root = Control.new()
	_title_root.size = Vector2(960, 540)
	add_child(_title_root)

	var t := Label.new()
	t.text = "相剋のビルドサーガ  ACTION"
	UiTheme.apply(t, 30, Color(1.0, 0.81, 0.42))
	t.position = Vector2(60, 50)
	_title_root.add_child(t)

	var sub := Label.new()
	sub.text = "はじまりの職を選ぶ（1〜4キー）\n移動 WASD ／ 斬撃 Space・左クリック ／ スキル 1〜4 ／ 回避 Shift ／ 装備 I ／ ビルド Tab"
	UiTheme.apply(sub, 14, Color(0.6, 0.64, 0.75))
	sub.position = Vector2(60, 98)
	_title_root.add_child(sub)

	for i in STARTERS.size():
		var cid: String = STARTERS[i]
		var cls := GameData.klass(cid)
		var x := 70.0 + float(i) * 210.0

		var spr := Sprite2D.new()
		spr.texture = GameData.sprite("classes", cid)
		spr.scale = Vector2(5, 5)
		spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		spr.position = Vector2(x + 60.0, 250.0)
		_title_root.add_child(spr)

		var nm := Label.new()
		nm.text = "%d. %s" % [i + 1, cls.get("name", cid)]
		UiTheme.apply(nm, 18)
		nm.position = Vector2(x, 320)
		_title_root.add_child(nm)

		var ds := Label.new()
		ds.text = str(cls.get("desc", ""))
		ds.position = Vector2(x, 348)
		ds.size = Vector2(190, 140)
		ds.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		UiTheme.apply(ds, 12, Color(0.6, 0.64, 0.75))
		_title_root.add_child(ds)


func _start(cid: String) -> void:
	if is_instance_valid(_title_root):
		_title_root.queue_free()
	hero = HeroState.create(cid)
	runner = SkillRunner.new()
	runner.setup(self)
	_refresh_slots()

	player = Player.new()
	player.setup(hero)
	player.global_position = ARENA.get_center()
	player.died.connect(_on_player_died)
	add_child(player)

	equip_screen = EquipScreen.new()
	equip_screen.setup(hero)
	equip_screen.visible = false
	equip_screen.changed.connect(_on_equipment_changed)
	equip_screen.closed.connect(_toggle_equip)
	add_child(equip_screen)

	hud.visible = true
	hud.set_build_text(hero)
	state = State.PLAYING
	_start_floor(1)


func _refresh_slots() -> void:
	skill_slots = []
	for id in hero.skill_list():
		var sk := GameData.skill(id)
		if sk.is_empty():
			continue
		if ["phys", "mag", "heal", "buff", "util"].has(sk.get("kind", "")):
			skill_slots.append(id)
		if skill_slots.size() >= 4:
			break
	hud.set_slots(skill_slots)


## ---------------- 階層とウェーブ ----------------

## 階層を踏破するたび戦利品が入る。装備画面で組み替える動機になる。
func _grant_loot() -> void:
	var legend_chance: float = clampf(0.06 + float(floor_no) * 0.02
		+ float(hero.stats["drop_up"]) * 0.5, 0.0, 0.6)
	var pool: Array = GameData.accessories_of("legend" if randf() < legend_chance else "normal")
	## 通常アクセは階層に応じて段階的に解禁する
	if pool.size() > 0:
		var tier_cap: int = 1 if floor_no <= 6 else (2 if floor_no <= 12 else 3)
		var filtered: Array = pool.filter(func(a: Dictionary) -> bool:
			return int(a.get("tier", 1)) <= tier_cap)
		if filtered.size() > 0:
			pool = filtered
		var acc: Dictionary = pool[randi() % pool.size()]
		hero.add_accessory(acc["id"])
		hud.show_toast("〈%s〉を手に入れた（I で装備）" % acc.get("name", ""))

	if randf() < 0.35:
		var tier_cap2: int = 1 if floor_no <= 4 else (2 if floor_no <= 11 else 3)
		var gp: Array = (GameData.weapons + GameData.armors).filter(func(g: Dictionary) -> bool:
			return int(g.get("tier", 1)) <= tier_cap2)
		if gp.size() > 0:
			var g2: Dictionary = gp[randi() % gp.size()]
			hero.add_gear(g2["id"])


func _on_equipment_changed() -> void:
	hero.recompute()
	if is_instance_valid(player):
		player.refresh_profile()
	_refresh_slots()
	hud.set_build_text(hero)


func _toggle_equip() -> void:
	if equip_screen == null:
		return
	paused = not paused
	equip_screen.visible = paused
	if paused:
		equip_screen._refresh()


func _start_floor(n: int) -> void:
	if n > 1:
		_grant_loot()
	floor_no = n
	for e in enemies:
		if is_instance_valid(e):
			e.queue_free()
	enemies.clear()
	for s in shots:
		if is_instance_valid(s):
			s.queue_free()
	shots.clear()
	var count: int = 3 + mini(6, n / 2)
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
	var side := randi() % 4
	var p := Vector2.ZERO
	match side:
		0: p = Vector2(randf_range(ARENA.position.x, ARENA.end.x), ARENA.position.y)
		1: p = Vector2(randf_range(ARENA.position.x, ARENA.end.x), ARENA.end.y)
		2: p = Vector2(ARENA.position.x, randf_range(ARENA.position.y, ARENA.end.y))
		_: p = Vector2(ARENA.end.x, randf_range(ARENA.position.y, ARENA.end.y))
	e.global_position = p
	e.attack_cd = randf_range(1.5, 4.0)
	e.died.connect(_on_enemy_died)
	add_child(e)
	enemies.append(e)


## ---------------- 毎フレーム ----------------

func _process(delta: float) -> void:
	## 画面の揺れ（当てた実感のためのごく短い揺れ。常時は揺らさない）
	if _shake > 0.0:
		_shake = maxf(0.0, _shake - delta * 4.0)
		position = Vector2(randf_range(-_shake, _shake), randf_range(-_shake, _shake))
	elif position != Vector2.ZERO:
		position = Vector2.ZERO

	if state != State.PLAYING or paused or not is_instance_valid(player):
		return

	## ヒットストップ中は世界を止める（当たった瞬間の重みが出る）
	if _hitstop > 0.0:
		_hitstop -= delta
		return

	for i in slot_cd.size():
		slot_cd[i] = maxf(0.0, slot_cd[i] - delta)

	hero.tick_buffs(delta)
	hero.mp = minf(float(hero.stats["max_mp"]),
		hero.mp + (1.2 + float(hero.stats["mp_regen"]) * 0.5) * delta)

	player.tick(delta)
	player.global_position = player.global_position.clamp(ARENA.position, ARENA.end)

	if Input.is_key_pressed(KEY_SPACE) or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var swing := player.try_attack()
		if not swing.is_empty():
			_resolve_swing(swing)

	var alive: Array = []
	for e in enemies:
		if not is_instance_valid(e):
			continue
		alive.append(e)
		var dot := e.tick(delta, player.global_position)
		if dot > 0.0:
			e.hurt(dot)
			if is_instance_valid(e):
				_popup(e.global_position, str(int(dot)), Color(0.75, 0.55, 1.0))
		if is_instance_valid(e):
			e.global_position = e.global_position.clamp(ARENA.position - Vector2(40, 40), ARENA.end + Vector2(40, 40))
			_enemy_behaviour(e, delta)
			_check_contact(e)
	enemies = alive

	var live_shots: Array = []
	for s in shots:
		if not is_instance_valid(s):
			continue
		s.tick(delta)
		if not is_instance_valid(s):
			continue
		live_shots.append(s)
		if (s.global_position - player.global_position).length() <= s.radius + player.radius:
			_player_hit(s.damage, s.element, s.global_position)
			s.queue_free()
	shots = live_shots

	hud.set_hero(hero, floor_no, enemies.size())
	hud.set_slot_state(skill_slots, slot_cd, hero, runner)

	if enemies.is_empty():
		_start_floor(floor_no + 1)


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	var k: int = event.keycode
	if state == State.TITLE:
		if k >= KEY_1 and k <= KEY_4:
			_start(STARTERS[k - KEY_1])
	elif state == State.PLAYING:
		if k == KEY_I:
			_toggle_equip()
		elif paused:
			return
		elif k == KEY_TAB:
			hud.build_panel.visible = not hud.build_panel.visible
			hud.set_build_text(hero)
		elif k >= KEY_1 and k <= KEY_4:
			_use_slot(k - KEY_1)
	elif state == State.GAMEOVER and (k == KEY_ENTER or k == KEY_KP_ENTER):
		get_tree().reload_current_scene()


func _use_slot(i: int) -> void:
	if i >= skill_slots.size() or slot_cd[i] > 0.0:
		return
	var id: String = skill_slots[i]
	if not runner.can_cast(id):
		hud.show_toast("MPが足りない")
		return
	if runner.cast(id):
		slot_cd[i] = 1.2
		hud.set_build_text(hero)


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
		hit_enemy_with(e, 100.0, hero.attack_element(), "phys", false, {})
		hit += 1
	var splash: float = float(hero.stats["aoe_ratio"])
	if hit > 0 and splash > 0.0:
		for e in enemies:
			if not is_instance_valid(e):
				continue
			var d := (e.global_position - player.global_position).length()
			if d <= rng + e.radius:
				continue
			if d <= rng + float(player.profile.get("splash_radius", 16.0)):
				hit_enemy_with(e, 100.0 * splash, hero.attack_element(), "phys", true, {})


## スキルからも通常攻撃からも通る、唯一のダメージ適用口
func hit_enemy_with(e: Enemy, power: float, el: String, kind: String,
		is_aoe: bool, opt: Dictionary) -> void:
	if not is_instance_valid(e):
		return
	var extra := Combat.situational_bonus(
		hero.active_flags,
		hero.hp / maxf(1.0, float(hero.stats["max_hp"])),
		e.hp / maxf(1.0, e.max_hp), e.is_boss, e.has_status(),
		enemies.size(), hero.rarity_count("mythic"), kill_stacks,
		hero.mp / maxf(1.0, float(hero.stats["max_mp"])))

	var p := power
	if float(opt.get("execute", 0.0)) > 0.0 and e.hp / maxf(1.0, e.max_hp) <= float(opt["execute"]):
		p *= 2.2

	var atk_stats := hero.stats.duplicate()
	if float(opt.get("atk_override", -1.0)) >= 0.0:
		atk_stats["atk"] = float(opt["atk_override"])
		atk_stats["mag"] = float(opt["atk_override"])

	var r := Combat.resolve(atk_stats, hero.active_flags, e.stat_block(), {
		"power": p, "kind": kind, "el": el, "is_aoe": is_aoe, "extra_dmg_up": extra,
		"crit_bonus": float(opt.get("crit_bonus", 0.0)),
		"crit_bonus_dmg": float(opt.get("crit_bonus_dmg", 0.0)),
		"always_crit": opt.get("always_crit", false),
		"def_ignore": float(opt.get("def_ignore", 0.0)),
		"aoe_bonus": float(opt.get("aoe_bonus", 0.0)),
	})
	var dmg := float(r["damage"])
	var push := (e.global_position - player.global_position).normalized() * (90.0 if r["crit"] else 55.0)
	e.hurt(dmg, push)

	_popup(e.global_position, str(int(dmg)),
		Color(1.0, 0.81, 0.42) if r["crit"] else (Color(0.56, 0.94, 0.72) if is_aoe else Color.WHITE))

	## 当てた瞬間の重み。会心だけ少し強くする（常時だともたつくので控えめに）
	_hitstop = 0.055 if r["crit"] else 0.025
	if r["crit"]:
		_shake = 2.2

	## 攻撃時の状態異常付与
	if hero.active_flags.has("statusOnHit") and randf() < 0.20:
		StatusFx.apply(e, ["burn", "poison", "freeze", "shock"][randi() % 4], 4.0, 0.06,
			hero.active_flags.has("lingering"))
		on_status_applied()

	var steal: float = float(hero.stats["lifesteal"]) + float(opt.get("drain", 0.0))
	if steal > 0.0:
		heal_player(dmg * steal)


func _enemy_behaviour(e: Enemy, _delta: float) -> void:
	var dist := (e.global_position - player.global_position).length()
	if e.pending_shot and not e.is_telegraphing():
		e.pending_shot = false
		_spawn_shot(e)
		return
	if e.attack_cd <= 0.0 and dist < 260.0 and not e.is_telegraphing():
		e.begin_telegraph()
		e.pending_shot = true
		e.attack_cd = randf_range(2.6, 4.6)


func _spawn_shot(e: Enemy) -> void:
	if not is_instance_valid(player):
		return
	var el := "phys"
	for sid in e.def_data.get("skills", []):
		var sk := GameData.skill(sid)
		if sk.get("kind", "") == "mag":
			el = sk.get("el", "phys")
			break
	var s := EnemyShot.new()
	s.setup((player.global_position - e.global_position).normalized(), 150.0, e.mag * 0.9 + e.atk * 0.3, el)
	s.global_position = e.global_position
	add_child(s)
	shots.append(s)


func _check_contact(e: Enemy) -> void:
	if not e.can_touch():
		return
	var d := (e.global_position - player.global_position).length()
	if d > e.radius + player.radius + 4.0:
		return
	e.touched()
	_player_hit(e.effective_atk(), "phys", e.global_position, e)


func _player_hit(raw_power: float, el: String, from: Vector2, src: Enemy = null) -> void:
	var raw := Combat.resolve(
		{"atk": raw_power, "mag": raw_power, "crit_rate": 0.05, "crit_dmg": 1.5, "pierce": 0.0},
		{}, {"def": hero.stats["def"], "res": hero.stats["res"], "weak": [], "resist": [], "dr": 0.0},
		{"power": 100.0, "kind": "phys" if el == "phys" else "mag", "el": el})

	var incoming := float(raw["damage"])
	## バリアが先に肩代わりする
	if hero.barrier > 0.0:
		var absorbed := minf(hero.barrier, incoming)
		hero.barrier -= absorbed
		incoming -= absorbed
		_popup(player.global_position, "🛡%d" % int(absorbed), Color(0.49, 0.88, 1.0))
		if incoming <= 0.0:
			return

	var dealt := player.take_damage(incoming)
	if dealt < 0.0:
		_popup(player.global_position, "MISS", Color(0.6, 0.64, 0.75))
		return
	if dealt <= 0.0:
		return
	_popup(player.global_position, str(int(dealt)), Color(1.0, 0.42, 0.45))
	_shake = 3.0

	## 反射（接触してきた相手に返す）
	if src != null and is_instance_valid(src):
		var refl: float = float(player.profile.get("contact_reflect", 0.0))
		if refl > 0.0:
			var back := dealt * refl
			src.hurt(back, (src.global_position - player.global_position).normalized() * 70.0)
			_popup(from, str(int(back)), Color(1.0, 0.37, 0.82))
			if hero.active_flags.has("healOnReflect"):
				heal_player(back * 0.30)


## ---------------- SkillRunner から呼ばれる口 ----------------

func living_enemies() -> Array:
	return enemies.filter(func(e: Enemy) -> bool: return is_instance_valid(e))


func nearest_enemy() -> Enemy:
	var best: Enemy = null
	var bd := 1e9
	for e in enemies:
		if not is_instance_valid(e):
			continue
		var d := (e.global_position - player.global_position).length()
		if d < bd:
			bd = d
			best = e
	return best


func heal_player(amount: float) -> void:
	if amount <= 0.0 or not is_instance_valid(player):
		return
	var before := hero.hp
	hero.hp = minf(float(hero.stats["max_hp"]), hero.hp + amount)
	var got := hero.hp - before
	var over := amount - got
	if over > 0.0 and hero.active_flags.has("overheal"):
		add_barrier(over * 0.5)
	if got >= 1.0:
		_popup(player.global_position, "+%d" % int(got), Color(0.36, 0.89, 0.6))


func add_barrier(amount: float) -> void:
	hero.barrier += amount
	if is_instance_valid(player):
		_popup(player.global_position, "🛡%d" % int(hero.barrier), Color(0.49, 0.88, 1.0))


func on_status_applied() -> void:
	_status_applied += 1


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
		heal_player(float(hero.stats["max_hp"]) * 0.08)
	if hero.active_flags.has("soulHarvest"):
		hero.mp = minf(float(hero.stats["max_mp"]), hero.mp + float(hero.stats["max_mp"]) * 0.15)
	if hero.active_flags.has("deathSpike"):
		for o in enemies:
			if is_instance_valid(o) and o != e:
				o.hurt(float(hero.stats["max_hp"]) * 0.05)
	_level_up_check()


func _exp_to_next() -> int:
	return int(round(20.0 * pow(float(hero.level), 1.5) + 14.0 * float(hero.level)))


func _level_up_check() -> void:
	var need := _exp_to_next()
	while hero.exp >= need:
		hero.exp -= need
		hero.level += 1
		hero.sp += 1
		hero.recompute()
		hero.hp = minf(float(hero.stats["max_hp"]), hero.hp + float(hero.stats["max_hp"]) * 0.5)
		player.refresh_profile()
		_refresh_slots()
		hud.show_toast("レベル %d になった（SP+1）" % hero.level)
		hud.set_build_text(hero)
		need = _exp_to_next()


func _on_player_died() -> void:
	state = State.GAMEOVER
	var l := Label.new()
	l.text = "力尽きた……　到達 %d階 / Lv%d / 撃破 %d体\nEnter でやり直す" % [floor_no, hero.level, kill_stacks]
	UiTheme.apply(l, 22, Color(1.0, 0.42, 0.45))
	l.position = Vector2(280, 240)
	add_child(l)


func _draw() -> void:
	draw_rect(ARENA, Color(0.09, 0.11, 0.17), true)
	draw_rect(ARENA, Color(0.18, 0.21, 0.31), false, 2.0)
