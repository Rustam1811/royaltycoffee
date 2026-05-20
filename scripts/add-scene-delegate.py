#!/usr/bin/env python3
"""Add SceneDelegate.swift to Xcode project.pbxproj"""
import re

pbx_path = "ios/App/App.xcodeproj/project.pbxproj"
with open(pbx_path, "r") as f:
    content = f.read()

if "SceneDelegate" in content:
    print("SceneDelegate already in project. Nothing to do.")
    exit(0)

file_ref_id = "A1B2C3D4E5F60003"
build_file_id = "A1B2C3D4E5F60004"

# 1. PBXBuildFile (Compile Sources)
bf = '\t\t%s /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = %s /* SceneDelegate.swift */; };\n' % (build_file_id, file_ref_id)
content = content.replace(
    '/* Begin PBXBuildFile section */\n',
    '/* Begin PBXBuildFile section */\n' + bf
)

# 2. PBXFileReference
fr = '\t\t%s /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SceneDelegate.swift; sourceTree = "<group>"; };\n' % file_ref_id
content = content.replace(
    '/* Begin PBXFileReference section */\n',
    '/* Begin PBXFileReference section */\n' + fr
)

# 3. Add to App group children (after AppDelegate.swift)
m = re.search(r'(/\* AppDelegate\.swift \*/,\n)', content)
if m:
    content = content.replace(m.group(0), m.group(0) + '\t\t\t\t%s /* SceneDelegate.swift */,\n' % file_ref_id, 1)
    print("Added to App group children")
else:
    print("WARNING: Could not find AppDelegate.swift in group children")

# 4. Add to Sources build phase (Compile Sources)
m = re.search(r'(/\* AppDelegate\.swift in Sources \*/,\n)', content)
if m:
    content = content.replace(m.group(0), m.group(0) + '\t\t\t\t%s /* SceneDelegate.swift in Sources */,\n' % build_file_id, 1)
    print("Added to Sources build phase")
else:
    print("WARNING: Could not find Sources build phase")

with open(pbx_path, "w") as f:
    f.write(content)

print("Done! SceneDelegate.swift added to Xcode project.")
