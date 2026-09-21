#!/usr/bin/env python3
"""Extract verified localization from an unencrypted Godot PCK, without executing it."""
import argparse
import hashlib
import json
import struct
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]


def read_exact(stream, size):
    data = stream.read(size)
    if len(data) != size:
        raise ValueError('文件不完整：请等待复制完成后重试')
    return data


def index_pck(path):
    size = path.stat().st_size
    with path.open('rb') as stream:
        magic, version, major, minor, patch, flags = struct.unpack('<6I', read_exact(stream, 24))
        if magic != 0x43504447 or version not in (2, 3):
            raise ValueError('不是支持的 Godot PCK v2/v3')
        if flags & 1:
            raise ValueError('不支持加密目录')
        base, = struct.unpack('<Q', read_exact(stream, 8))
        if version == 3:
            offset, = struct.unpack('<Q', read_exact(stream, 8))
            if offset >= size:
                raise ValueError('资源包尚未复制完整：目录偏移超过文件长度')
            stream.seek(offset)
        else:
            read_exact(stream, 64)
        count, = struct.unpack('<I', read_exact(stream, 4))
        if count > 1_000_000:
            raise ValueError('目录条目数异常')
        result, seen = [], set()
        for _ in range(count):
            length, = struct.unpack('<I', read_exact(stream, 4))
            if not 0 < length < 16384:
                raise ValueError('目录路径长度异常')
            name = read_exact(stream, length).rstrip(b'\0').decode('utf-8').removeprefix('res://')
            part = PurePosixPath(name)
            if part.is_absolute() or '..' in part.parts or '\\' in name or ':' in name or name in seen:
                raise ValueError(f'不安全或重复路径：{name}')
            seen.add(name)
            off, length = struct.unpack('<QQ', read_exact(stream, 16))
            md5 = read_exact(stream, 16).hex()
            entry_flags, = struct.unpack('<I', read_exact(stream, 4))
            if base + off + length > size:
                raise ValueError(f'文件未复制完整：{name}')
            result.append(dict(path=name, offset=base + off, size=length, md5=md5, flags=entry_flags))
    return result, [major, minor, patch]


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def extract(pck, destination, languages=('zhs', 'eng')):
    entries, engine = index_pck(pck)
    selected = [e for e in entries if e['path'] == 'localization/completion.json'
                or any(e['path'].startswith(f'localization/{lang}/') and e['path'].endswith('.json') for lang in languages)]
    if not selected:
        raise ValueError('没有找到本地化文本')
    with pck.open('rb') as stream:
        for entry in selected:
            if entry['flags']:
                raise ValueError(f"不支持的条目标记：{entry['path']}")
            stream.seek(entry['offset'])
            data = read_exact(stream, entry['size'])
            if hashlib.md5(data).hexdigest() != entry['md5']:
                raise ValueError(f"资源校验失败：{entry['path']}")
            json.loads(data)
            output = destination / entry['path']
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
    return entries, engine, len(selected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, default=ROOT / 'reference')
    parser.add_argument('--output', type=Path, default=ROOT / 'runtime')
    args = parser.parse_args()
    pck = next(args.reference.rglob('SlayTheSpire2.pck'), None)
    dll = next(args.reference.rglob('sts2.dll'), None)
    if not pck or not dll:
        parser.error('reference 中需要 SlayTheSpire2.pck 与 sts2.dll')
    entries, engine, count = extract(pck, args.output)
    manifest = dict(requested_build='23811903', build_verified=False,
                    note='Build 由用户指定；文件哈希标识输入，不等于已核验 Steam Build。',
                    godot_version=engine, entries=len(entries), localization_files=count,
                    files={pck.name: sha256(pck), dll.name: sha256(dll)})
    releases = list(args.reference.rglob('release_info.json'))
    if releases:
        manifest['release_info'] = json.loads(releases[0].read_text())
    target = ROOT / 'docs' / 'reference-manifest.json'
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'校验完成：{len(entries)} 个资源条目，提取 {count} 个中英文文本文件。')
    print(f'来源指纹：{target}')


if __name__ == '__main__':
    main()
