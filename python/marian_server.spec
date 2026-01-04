# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\marian_server.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\models\\marian-fr', 'models\\marian-fr'), ('C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\models\\marian-multi', 'models\\marian-multi')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='marian_server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='marian_server',
)
