#!/usr/bin/env python3
"""Add GoogleService-Info.plist to Xcode project.pbxproj"""
import re

pbx_path = "ios/App/App.xcodeproj/project.pbxproj"
with open(pbx_path, "r") as f:
    content = f.read()

if "GoogleService-Info" in content:
    print("GoogleService-Info.plist already in project. Nothing to do.")
    exit(0)

file_ref_id = "A1B2C3D4E5F60001"
build_file_id = "A1B2C3D4E5F60002"

# 1. PBXBuildFile
bf = '\t\t%s /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = %s /* GoogleService-Info.plist */; };\n' % (build_file_id, file_ref_id)
content = content.replace(
    '/* Begin PBXBuildFile section */\n',
    '/* Begin PBXBuildFile section */\n' + bf
)

# 2. PBXFileReference
fr = '\t\t%s /* GoogleService-Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };\n' % file_ref_id
content = content.replace(
    '/* Begin PBXFileReference section */\n',
    '/* Begin PBXFileReference section */\n' + fr
)

# 3. Add to App group children (after Info.plist)
m = re.search(r'(/\* Info\.plist \*/,\n)', content)
if m:
    content = content.replace(m.group(0), m.group(0) + '\t\t\t\t%s /* GoogleService-Info.plist */,\n' % file_ref_id, 1)
    print("Added to App group children")

# 4. Add to Resources build phase
m = re.search(r'(/\* LaunchScreen\.storyboard in Resources \*/,\n)', content)
if m:
    content = content.replace(m.group(0), m.group(0) + '\t\t\t\t%s /* GoogleService-Info.plist in Resources */,\n' % build_file_id, 1)
    print("Added to Resources build phase")

with open(pbx_path, "w") as f:
    f.write(content)

print("Done!")
