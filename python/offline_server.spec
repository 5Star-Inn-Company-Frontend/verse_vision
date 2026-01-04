# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\offline_server.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\models\\whisper-base', 'models\\whisper-base'), ('C:\\Users\\odeji\\Documents\\trae_projects\\versevision\\python\\..\\api\\data\\bibles', 'bibles_data'), ('C:\\Users\\odeji\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python311\\site-packages\\faster_whisper\\assets', 'faster_whisper/assets')],
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
    name='offline_server',
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
    name='offline_server',
)
