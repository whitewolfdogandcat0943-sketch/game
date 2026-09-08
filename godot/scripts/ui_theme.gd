class_name UiTheme
extends RefCounted
## 日本語表示のためのフォント設定。
## Godot の既定フォントは日本語を含まないので、OSのフォントを借りる。
## （フォントを同梱しないのでライセンス上の制約も持ち込まない）

static var _font: SystemFont = null


static func jp_font() -> SystemFont:
	if _font == null:
		_font = SystemFont.new()
		_font.font_names = PackedStringArray([
			"Yu Gothic UI", "Yu Gothic", "Meiryo", "MS Gothic",       # Windows
			"Hiragino Sans", "Hiragino Kaku Gothic ProN",             # macOS
			"Noto Sans CJK JP", "IPAGothic", "Takao Gothic",          # Linux
			"sans-serif",
		])
		_font.allow_system_fallback = true
	return _font


static func apply(label: Label, size: int = 14, color: Color = Color(0.9, 0.92, 0.96)) -> void:
	label.add_theme_font_override("font", jp_font())
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	label.add_theme_constant_override("outline_size", 4)
