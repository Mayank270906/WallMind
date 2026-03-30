import sys

target = '/home/mayank/Desktop/Projects/Hackathon/WallMind/frontend/src/pages/AnalysisViewer.jsx'
header = '/tmp/av_header.jsx'

with open(target, 'r') as f:
    lines = f.readlines()

# Find where the UI PANELS section starts
boundary = None
for i, line in enumerate(lines):
    if 'SEVERITY_STYLE' in line and 'const' in line:
        boundary = i
        break
    if 'UI PANELS' in line and '===' in line:
        boundary = i
        break

if boundary is None:
    print("ERROR: could not find boundary")
    sys.exit(1)

print(f"Boundary at line {boundary+1}: {lines[boundary].rstrip()}")

with open(header, 'r') as f:
    new_header = f.readlines()

result = new_header + ['\n'] + lines[boundary:]

with open(target, 'w') as f:
    f.writelines(result)

print(f"Done. New file: {len(result)} lines.")
