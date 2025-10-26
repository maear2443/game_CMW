#!/usr/bin/env python3
"""
PixiJS v7 API 호환성 수정 스크립트
"""

import re
import os

def fix_text_api(content):
    """new PIXI.Text({text: ..., style: {...}}) -> new PIXI.Text(text, {...})"""
    # 간단한 정규식으로 패턴 매치 (복잡한 경우는 수동 수정 필요)
    pattern = r"new PIXI\.Text\(\{\s*text:\s*'([^']*)',\s*style:\s*\{([^}]+)\}\s*\}\)"
    replacement = r"new PIXI.Text('\1', {\2})"
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

    pattern2 = r'new PIXI\.Text\(\{\s*text:\s*"([^"]*)",\s*style:\s*\{([^}]+)\}\s*\}\)'
    replacement2 = r'new PIXI.Text("\1", {\2})'
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE | re.DOTALL)

    pattern3 = r"new PIXI\.Text\(\{\s*text:\s*`([^`]*)`,"
    # 이 경우는 수동으로 처리

    return content

def fix_graphics_api(content):
    """Graphics API 수정"""
    # .rect -> .drawRect
    content = content.replace('.rect(', '.drawRect(')
    # .roundRect -> .drawRoundedRect
    content = content.replace('.roundRect(', '.drawRoundedRect(')
    # .fill(color) -> .beginFill(color) + .endFill()
    # .stroke -> .lineStyle

    return content

def fix_ticker_api(content):
    """Ticker 콜백 시그니처 수정"""
    # (delta: PIXI.Ticker) -> (delta: number)
    content = content.replace('(delta: PIXI.Ticker)', '(delta: number)')
    content = content.replace('(delta: Ticker)', '(delta: number)')

    return content

def fix_import_meta(content):
    """import.meta.env 타입 수정"""
    # vite/client 타입 참조 추가는 별도로
    return content

def process_file(filepath):
    """파일 처리"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    content = fix_text_api(content)
    content = fix_graphics_api(content)
    content = fix_ticker_api(content)
    content = fix_import_meta(content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ {filepath}")
        return True
    return False

def main():
    files_to_fix = [
        'src/game/ui/menu.ts',
        'src/game/ui/result.ts',
        'src/game/state.ts',
        'src/game/column.ts',
        'src/game/input.ts',
        'src/net/api.ts',
    ]

    fixed_count = 0
    for filepath in files_to_fix:
        if os.path.exists(filepath):
            if process_file(filepath):
                fixed_count += 1
        else:
            print(f"✗ {filepath} (not found)")

    print(f"\n수정 완료: {fixed_count}/{len(files_to_fix)} 파일")

if __name__ == '__main__':
    main()
